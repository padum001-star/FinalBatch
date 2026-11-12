const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
test(
  "real PostgreSQL marketplace and concurrent reservations",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const schema = `market_test_${randomBytes(6).toString("hex")}`;
    Object.assign(process.env, {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      PGOPTIONS: `-c search_path=${schema},public`,
      JWT_SECRET: randomBytes(32).toString("hex"),
      SESSION_SECRET: randomBytes(32).toString("hex"),
      NODE_ENV: "test",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
    });
    const pool = require("../db");
    await pool.query(`CREATE SCHEMA ${schema}`);
    const objects = new Map();
    const media = {
      readUrl: async (key) => `https://photos.example.test/${key}`,
      uploadUrl: async () => "https://upload.example.test",
      verify: async (upload) => {
        if (!objects.has(upload.object_key)) {
          const e = new Error("Upload is incomplete.");
          e.status = 400;
          throw e;
        }
      },
    };
    Object.assign(require("../media"), media);
    const market = require("../marketplace").createMarketplace(pool, media);
    let server;
    try {
      await pool.query(
        fs.readFileSync(
          path.join(__dirname, "../../database/food_rescue_schema.sql"),
          "utf8",
        ),
      );
      for (const name of fs
        .readdirSync(path.join(__dirname, "../../database/migrations"))
        .sort())
        await pool.query(
          fs.readFileSync(
            path.join(__dirname, "../../database/migrations", name),
            "utf8",
          ),
        );
      await pool.query(
        fs.readFileSync(
          path.join(__dirname, "../../database/migrations/002_marketplace.sql"),
          "utf8",
        ),
      );
      async function user(email) {
        return (
          await pool.query(
            "INSERT INTO users(email,full_name,role) VALUES($1,'Test account','consumer') RETURNING *",
            [email],
          )
        ).rows[0];
      }
      const vendor = await user("vendor@example.test"),
        otherVendor = await user("other@example.test"),
        a = await user("buyer-a@example.test"),
        b = await user("buyer-b@example.test");
      const body = {
        businessName: "Test vendor",
        address: "Test pickup address",
        phone: "+1 555 010 1234",
      };
      await market.saveVendor(vendor, body);
      await market.saveVendor(otherVendor, {
        ...body,
        businessName: "Other test vendor",
      });
      const input = {
        title: "Test batch",
        description: "Ingredients and allergens supplied by the vendor.",
        category: "Bakery",
        price: "3.50",
        originalPrice: "8.00",
        quantity: 1,
        pickupStart: new Date(Date.now() - 60000).toISOString(),
        pickupEnd: new Date(Date.now() + 3600000).toISOString(),
      };
      let listing, upload;
      await t.test("empty database produces an empty feed", async () => {
        assert.deepEqual(await market.list(), []);
      });
      await t.test(
        "publishing requires an owned completed photo; retries publish once",
        async () => {
          upload = await market.upload(vendor, {
            contentType: "image/jpeg",
            size: 200,
          });
          await assert.rejects(
            market.publish(vendor, { ...input, uploadId: upload.uploadId }),
            (e) => e.status === 400,
          );
          await assert.rejects(
            market.publish(otherVendor, {
              ...input,
              uploadId: upload.uploadId,
            }),
            (e) => e.status === 400,
          );
          const stored = (
            await pool.query(
              "SELECT object_key FROM listing_uploads WHERE upload_id=$1",
              [upload.uploadId],
            )
          ).rows[0];
          objects.set(stored.object_key, true);
          listing = await market.publish(vendor, {
            ...input,
            uploadId: upload.uploadId,
          });
          assert.equal(listing.price, 3.5);
          assert.equal(listing.tag, "Bakery");
          assert.match(listing.photoUrl, /photos.example.test/);
          assert.equal(listing.contact.email, vendor.email);
          assert.equal(
            (
              await market.publish(vendor, {
                ...input,
                uploadId: upload.uploadId,
              })
            ).id,
            listing.id,
          );
          assert.equal((await market.list()).length, 1);
          assert.equal(
            new Date(listing.pickupEnd).toISOString(),
            input.pickupEnd,
          );
        },
      );
      await t.test(
        "invalid prices times quantities and unsafe image types are rejected",
        async () => {
          for (const change of [
            { price: "-1" },
            { price: "0.001" },
            { quantity: 1.5 },
            { quantity: -2 },
            { pickupEnd: "not a date" },
            { category: "Fake" },
          ])
            await assert.rejects(
              market.publish(vendor, {
                ...input,
                uploadId: upload.uploadId,
                ...change,
              }),
              (e) => e.status === 400,
            );
          await assert.rejects(
            market.upload(vendor, { contentType: "image/svg+xml", size: 100 }),
            (e) => e.status === 400,
          );
          await assert.rejects(
            market.upload(vendor, { contentType: "image/jpeg", size: 8388609 }),
            (e) => e.status === 400,
          );
          await assert.rejects(
            market.upload(a, { contentType: "image/jpeg", size: 100 }),
            (e) => e.status === 403,
          );
        },
      );
      let winner;
      const who = () => (winner.user_id === a.user_id ? a : b);
      await t.test(
        "two buyers racing for the last item cannot oversell",
        async () => {
          const outcomes = await Promise.allSettled([
            market.reserve(a, {
              listingId: listing.id,
              quantity: 1,
              requestId: randomUUID(),
              unit_price: 0.01,
            }),
            market.reserve(b, {
              listingId: listing.id,
              quantity: 1,
              requestId: randomUUID(),
            }),
          ]);
          assert.equal(
            outcomes.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            outcomes.find((r) => r.status === "rejected").reason.status,
            409,
          );
          winner = outcomes.find((r) => r.status === "fulfilled").value;
          assert.equal(Number(winner.unit_price), 3.5);
          assert.equal((await market.get(listing.id)).quantity, 0);
          assert.deepEqual(await market.list(), []);
        },
      );
      await t.test(
        "lost-response retries retain one reservation and one stock decrement",
        async () => {
          const results = await Promise.all(
            Array.from({ length: 8 }, () =>
              market.reserve(who(), {
                listingId: listing.id,
                quantity: 1,
                requestId: winner.request_id,
              }),
            ),
          );
          assert.ok(
            results.every((r) => r.reservation_id === winner.reservation_id),
          );
          assert.equal(
            (await pool.query("SELECT count(*) FROM reservations")).rows[0]
              .count,
            "1",
          );
          await assert.rejects(
            market.reserve(who(), {
              listingId: listing.id,
              quantity: 2,
              requestId: winner.request_id,
            }),
            (e) => e.status === 409,
          );
        },
      );
      await t.test(
        "reservations stay private and cancellation returns stock only once",
        async () => {
          assert.equal((await market.reservations(vendor)).length, 0);
          assert.equal((await market.reservations(vendor, true)).length, 1);
          await assert.rejects(
            market.changeReservation(
              otherVendor,
              winner.reservation_id,
              "collect",
            ),
            (e) => e.status === 404,
          );
          await assert.rejects(
            market.changeReservation(who(), winner.reservation_id, "collect"),
            (e) => e.status === 404,
          );
          await Promise.all([
            market.changeReservation(who(), winner.reservation_id, "cancel"),
            market.changeReservation(who(), winner.reservation_id, "cancel"),
          ]);
          assert.equal((await market.get(listing.id)).quantity, 1);
        },
      );
      await t.test(
        "only the vendor confirms collection; collected items cannot be cancelled",
        async () => {
          const next = await market.reserve(a, {
            listingId: listing.id,
            quantity: 1,
            requestId: randomUUID(),
          });
          await market.changeReservation(
            vendor,
            next.reservation_id,
            "collect",
          );
          await market.changeReservation(
            vendor,
            next.reservation_id,
            "collect",
          );
          await assert.rejects(
            market.changeReservation(a, next.reservation_id, "cancel"),
            (e) => e.status === 409,
          );
          assert.equal((await market.get(listing.id)).quantity, 0);
        },
      );
      await t.test(
        "negative quantities self reservations and expired listings are refused",
        async () => {
          for (const q of [0, -1, 1.2, "1"])
            await assert.rejects(
              market.reserve(a, {
                listingId: listing.id,
                quantity: q,
                requestId: randomUUID(),
              }),
              (e) => e.status === 400,
            );
          await assert.rejects(
            market.reserve(vendor, {
              listingId: listing.id,
              quantity: 1,
              requestId: randomUUID(),
            }),
            (e) => e.status === 400,
          );
          await pool.query(
            "UPDATE listings SET quantity_available=2,pickup_end_at=now()-interval '1 second' WHERE listing_id=$1",
            [listing.id],
          );
          await assert.rejects(
            market.reserve(a, {
              listingId: listing.id,
              quantity: 1,
              requestId: randomUUID(),
            }),
            (e) => e.status === 409,
          );
          await assert.rejects(
            market.close(otherVendor, listing.id),
            (e) => e.status === 404,
          );
        },
      );
      await t.test(
        "HTTP endpoints enforce login and hide unavailable listings",
        async () => {
          server = require("../server").listen(0, "127.0.0.1");
          await new Promise((resolve) => server.once("listening", resolve));
          const base = `http://127.0.0.1:${server.address().port}`;
          assert.equal((await fetch(base + "/reservations")).status, 401);
          let r = await fetch(base + "/listings");
          assert.equal(r.status, 200);
          assert.deepEqual(await r.json(), []);
          r = await fetch(base + "/reservations", {
            headers: {
              Authorization: `Bearer ${require("../accounts").tokenFor(a)}`,
            },
          });
          assert.equal(r.status, 200);
          assert.ok((await r.json()).every((row) => row.user_id === a.user_id));
        },
      );
      await t.test(
        "readiness catches missing marketplace schema and names the required setup",
        async () => {
          const setup = await require("../setup").inspectMarketplace(pool);
          assert.equal(setup.ready, true);
          const client=await pool.connect();
          await client.query("BEGIN");
          await client.query("DROP INDEX vendors_user_unique");
          const missing = await require("../setup").inspectMarketplace(client);
          assert.equal(missing.ready, false);
          assert.ok(missing.missing.includes("vendors_user_unique"));
          await client.query("ROLLBACK");
          client.release();
        },
      );
      await t.test(
        "Lambda HTTP API adapter returns liveness and protected responses",
        async () => {
          const handler = require("../lambda").handler;
          const event = {
            version: "2.0",
            routeKey: "ANY /{proxy+}",
            rawPath: "/health",
            rawQueryString: "",
            headers: { host: "api.example.test", "x-forwarded-proto": "https" },
            requestContext: {
              stage: "$default",
              requestId: "qa-lambda",
              http: {
                method: "GET",
                path: "/health",
                protocol: "HTTP/1.1",
                sourceIp: "127.0.0.1",
              },
            },
            isBase64Encoded: false,
          };
          const context = {};
          const health = await handler(event, context);
          assert.equal(health.statusCode, 200);
          assert.equal(JSON.parse(health.body).status, "ok");
          assert.equal(context.callbackWaitsForEmptyEventLoop, false);
          event.rawPath = "/reservations";
          event.requestContext.http.path = "/reservations";
          const protectedResponse = await handler(event, {});
          assert.equal(protectedResponse.statusCode, 401);
        },
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await pool.query(`DROP SCHEMA ${schema} CASCADE`);
      await pool.end();
    }
  },
);
