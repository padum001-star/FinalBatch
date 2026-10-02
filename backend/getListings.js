const { Client } = require('pg');

// GET /listings
// Public endpoint - no auth required to browse.
// Returns only fields a browsing consumer needs; internal foreign keys
// (vendor_id, item_template_id, surplus_reason_id) are never exposed.
exports.handler = async (event) => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        l.listing_id,
        it.name AS item_name,
        l.price,
        l.quantity_available,
        l.pickup_window_start,
        l.pickup_window_end,
        v.business_name AS vendor_name,
        ROUND(v.latitude::numeric, 2)  AS approx_lat,
        ROUND(v.longitude::numeric, 2) AS approx_lng,
        sr.label AS surplus_reason
      FROM listings l
      JOIN vendors v          ON v.vendor_id = l.vendor_id
      JOIN item_templates it  ON it.item_template_id = l.item_template_id
      JOIN surplus_reasons sr ON sr.reason_id = l.surplus_reason_id
      WHERE l.status = 'active'
      ORDER BY l.pickup_window_start
    `);

    // Explicit DTO shape - never return raw rows from a SELECT *
    const listings = result.rows.map(row => ({
      id: row.listing_id,
      itemName: row.item_name,
      price: Number(row.price),
      quantityAvailable: row.quantity_available,
      pickupWindow: {
        start: row.pickup_window_start,
        end: row.pickup_window_end
      },
      vendorName: row.vendor_name,
      approxLocation: { lat: row.approx_lat, lng: row.approx_lng },
      surplusReason: row.surplus_reason
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listings)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong fetching listings' })
    };
  } finally {
    await client.end();
  }
};
