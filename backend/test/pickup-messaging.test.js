const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const fs = require("node:fs"),
  path = require("node:path");
test(
  "pickup settings, overdue reservations and private messaging",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const schema = "pickup_" + randomBytes(6).toString("hex");
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
    let server;
    try {
      await pool.query(`CREATE SCHEMA ${schema}`);
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
          path.join(
            __dirname,
            "../../database/migrations/004_pickup_and_messages.sql",
          ),
          "utf8",
        ),
      );
      const market = require("../marketplace").createMarketplace(pool, {
        readUrl: async () => null,
      });
      const settings = require("../vendor-settings").createVendorSettings(
          pool,
          market,
        ),
        chat = require("../messaging").createMessaging(pool);
      async function user(name) {
        return (
          await pool.query(
            "INSERT INTO users(email,full_name,role) VALUES($1,$2,'consumer') RETURNING *",
            [`${name}@test.invalid`, name],
          )
        ).rows[0];
      }
      const seller = await user("seller"),
        buyer = await user("buyer"),
        stranger = await user("stranger"),
        otherSeller = await user("other-seller");
      const profile = {
        businessName: "QA Shop",
        address: "QA pickup address",
        latitude: 44.699,
        longitude: -73.452,
      };
      await t.test(
        "shop location persists, is validated and can be removed",
        async () => {
          const v = await market.saveVendor(seller, profile);
          assert.equal(Number(v.latitude), profile.latitude);
          assert.equal(
            Number(
              (
                await market.saveVendor(seller, {
                  businessName: "QA Shop",
                  address: "QA updated address",
                })
              ).longitude,
            ),
            profile.longitude,
          );
          await assert.rejects(
            market.saveVendor(seller, { ...profile, latitude: 300 }),
            (e) => e.status === 400,
          );
          assert.equal(
            (
              await market.saveVendor(seller, {
                ...profile,
                latitude: null,
                longitude: null,
              })
            ).latitude,
            null,
          );
          await market.saveVendor(seller, profile);
          await market.saveVendor(otherSeller, {
            ...profile,
            businessName: "Other QA",
          });
        },
      );
      const dinner = {
        name: "Dinner",
        startTime: "18:00",
        endTime: "20:00",
        endNextDay: false,
        timeZone: "America/New_York",
        isDefault: true,
      };
      let saved;
      await t.test(
        "presets persist per vendor; same name updates; default stays unique",
        async () => {
          saved = await settings.save(seller, dinner);
          await settings.save(seller, {
            ...dinner,
            name: "Lunch",
            startTime: "12:00",
            endTime: "14:00",
            isDefault: false,
          });
          await settings.save(seller, {
            ...dinner,
            name: "dinner",
            startTime: "17:00",
          });
          const rows = await settings.list(seller);
          assert.equal(rows.length, 2);
          assert.equal(rows.filter((x) => x.is_default).length, 1);
          assert.equal(rows.find((x) => x.is_default).start_time, "17:00:00");
          assert.deepEqual(await settings.list(otherSeller), []);
          await assert.rejects(
            settings.remove(otherSeller, saved.preset_id),
            (e) => e.status === 404,
          );
          await assert.rejects(
            settings.save(buyer, dinner),
            (e) => e.status === 403,
          );
          await assert.rejects(
            settings.save(seller, { ...dinner, endTime: "10:00" }),
            (e) => e.status === 400,
          );
          await assert.rejects(
            settings.save(seller, { ...dinner, timeZone: "Mars/Crater" }),
            (e) => e.status === 400,
          );
        },
      );
      const v = await market.vendor(seller);
      async function listing() {
        const {
          rows: [it],
        } = await pool.query(
          "INSERT INTO item_templates(vendor_id,name,default_price) VALUES($1,'QA food',2) RETURNING *",
          [v.vendor_id],
        );
        return (
          await pool.query(
            `INSERT INTO listings(vendor_id,item_template_id,quantity_available,price,pickup_window_start,pickup_window_end,pickup_start_at,pickup_end_at,published_by_vendor) VALUES($1,$2,5,2,now()-interval '1 hour',now()+interval '1 hour',now()-interval '1 hour',now()+interval '1 hour',TRUE) RETURNING *`,
            [v.vendor_id, it.item_template_id],
          )
        ).rows[0];
      }
      const l = await listing();
      const request = {
        listingId: l.listing_id,
        requestId: randomUUID(),
        quantity: 1,
      };
      const reservation = await market.reserve(buyer, request);
      const r2 = await market.reserve(buyer, {
        ...request,
        requestId: randomUUID(),
      });
      let conversation;
      await t.test(
        "customer starts one conversation; only its customer and vendor can access it",
        async () => {
          conversation = await chat.open(buyer, { listingId: l.listing_id });
          assert.equal(
            (await chat.open(buyer, { listingId: l.listing_id }))
              .conversation_id,
            conversation.conversation_id,
          );
          assert.equal((await chat.list(seller)).length, 1);
          assert.deepEqual(await chat.list(stranger), []);
          await assert.rejects(
            chat.history(stranger, conversation.conversation_id),
            (e) => e.status === 404,
          );
          await assert.rejects(
            chat.send(stranger, conversation.conversation_id, {
              clientMessageId: randomUUID(),
              body: "intrusion",
            }),
            (e) => e.status === 404,
          );
          await assert.rejects(
            chat.open(stranger, { reservationId: reservation.reservation_id }),
            (e) => e.status === 404,
          );
          assert.equal(
            (
              await chat.open(seller, {
                reservationId: reservation.reservation_id,
              })
            ).conversation_id,
            conversation.conversation_id,
          );
        },
      );
      await t.test(
        "messages survive reload and uncertain retries do not duplicate sends",
        async () => {
          const body = {
            clientMessageId: randomUUID(),
            body: "Where is pickup?",
          };
          const replies = await Promise.all([
            chat.send(buyer, conversation.conversation_id, body),
            chat.send(buyer, conversation.conversation_id, body),
          ]);
          assert.equal(replies[0].message_id, replies[1].message_id);
          await assert.rejects(
            chat.send(buyer, conversation.conversation_id, {
              ...body,
              body: "different",
            }),
            (e) => e.status === 409,
          );
          await chat.send(seller, conversation.conversation_id, {
            clientMessageId: randomUUID(),
            body: "At the front counter.",
          });
          const history = await chat.history(
            buyer,
            conversation.conversation_id,
          );
          assert.equal(history.messages.length, 2);
          assert.equal(history.messages[1].sender_id, seller.user_id);
          assert.equal(
            (await chat.list(buyer))[0].last_message,
            "At the front counter.",
          );
          await assert.rejects(
            chat.send(buyer, conversation.conversation_id, {
              clientMessageId: randomUUID(),
              body: " ",
            }),
            (e) => e.status === 400,
          );
        },
      );
      await t.test(
        "message history pages without leaking another conversation cursor",
        async () => {
          for (let i = 0; i < 52; i++)
            await chat.send(buyer, conversation.conversation_id, {
              clientMessageId: randomUUID(),
              body: `QA ${i}`,
            });
          const a = await chat.history(seller, conversation.conversation_id);
          assert.equal(a.messages.length, 50);
          assert.ok(a.nextCursor);
          const b = await chat.history(
            seller,
            conversation.conversation_id,
            a.nextCursor,
          );
          assert.equal(b.messages.length, 4);
          assert.equal(b.nextCursor, null);
          assert.equal(
            new Set([...a.messages, ...b.messages].map((m) => m.message_id))
              .size,
            54,
          );
          await assert.rejects(
            chat.history(seller, conversation.conversation_id, randomUUID()),
            (e) => e.status === 400,
          );
        },
      );
      await t.test(
        "pickup end blocks new bookings but permits collection during 10-minute grace",
        async () => {
          await pool.query(
            "UPDATE listings SET pickup_end_at=now()-interval '5 minutes' WHERE listing_id=$1",
            [l.listing_id],
          );
          assert.equal((await market.list()).length, 0);
          await assert.rejects(
            market.reserve(stranger, { ...request, requestId: randomUUID() }),
            (e) => e.status === 409,
          );
          assert.equal(
            (await market.reservations(buyer)).find(
              (r) => r.reservation_id === reservation.reservation_id,
            ).status,
            "reserved",
          );
          assert.equal(
            (
              await market.changeReservation(
                seller,
                r2.reservation_id,
                "collect",
              )
            ).status,
            "collected",
          );
        },
      );
      await t.test(
        "after grace, pickups expire once, retain history and do not restore expired inventory",
        async () => {
          await pool.query(
            "UPDATE listings SET pickup_end_at=now()-interval '11 minutes' WHERE listing_id=$1",
            [l.listing_id],
          );
          const before = (
            await pool.query(
              "SELECT quantity_available FROM listings WHERE listing_id=$1",
              [l.listing_id],
            )
          ).rows[0].quantity_available;
          const rows = await market.reservations(buyer);
          assert.equal(
            rows.find((r) => r.reservation_id === reservation.reservation_id)
              .status,
            "expired",
          );
          assert.equal(
            rows.find((r) => r.reservation_id === reservation.reservation_id)
              .closed_reason,
            "pickup_timeout",
          );
          assert.equal(
            (await market.reserve(buyer, request)).status,
            "expired",
          );
          await assert.rejects(
            market.changeReservation(
              seller,
              reservation.reservation_id,
              "collect",
            ),
            (e) => e.status === 409,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT quantity_available FROM listings WHERE listing_id=$1",
                [l.listing_id],
              )
            ).rows[0].quantity_available,
            before,
          );
          assert.equal(
            (
              await chat.open(buyer, {
                reservationId: reservation.reservation_id,
              })
            ).conversation_id,
            conversation.conversation_id,
          );
        },
      );
      await t.test(
        "collection versus cancellation after grace cannot revive a missed pickup",
        async () => {
          const item = await listing();
          const r = await market.reserve(buyer, {
            listingId: item.listing_id,
            requestId: randomUUID(),
            quantity: 1,
          });
          await pool.query(
            "UPDATE listings SET pickup_end_at=now()-interval '11 minutes' WHERE listing_id=$1",
            [item.listing_id],
          );
          const result = await Promise.allSettled([
            market.changeReservation(seller, r.reservation_id, "collect"),
            market.changeReservation(buyer, r.reservation_id, "cancel"),
          ]);
          assert.ok(
            result.every(
              (x) => x.status === "rejected" && x.reason.status === 409,
            ),
          );
          assert.equal(
            (
              await pool.query(
                "SELECT status FROM reservations WHERE reservation_id=$1",
                [r.reservation_id],
              )
            ).rows[0].status,
            "expired",
          );
          assert.equal(
            (
              await pool.query(
                "SELECT quantity_available FROM listings WHERE listing_id=$1",
                [item.listing_id],
              )
            ).rows[0].quantity_available,
            4,
          );
        },
      );
      await t.test(
        "active pickups are ordered before collected and missed pickup history",
        async () => {
          const item = await listing();
          const r = await market.reserve(buyer, {
            listingId: item.listing_id,
            requestId: randomUUID(),
            quantity: 1,
          });
          const rows = await market.reservations(buyer);
          assert.equal(rows[0].reservation_id, r.reservation_id);
          assert.equal(rows.length, 4);
        },
      );
      await t.test(
        "HTTP endpoints enforce authentication and message participants",
        async () => {
          server = require("../server").listen(0, "127.0.0.1");
          await new Promise((r) => server.once("listening", r));
          const origin = `http://127.0.0.1:${server.address().port}`;
          const token = require("../accounts").tokenFor(buyer);
          assert.equal((await fetch(origin + "/conversations")).status, 401);
          const res = await fetch(origin + "/conversations", {
            headers: { Authorization: `Bearer ${token}` },
          });
          assert.equal(res.status, 200);
          assert.equal((await res.json()).length, 1);
        },
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await pool.end();
    }
  },
);
