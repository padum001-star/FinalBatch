const { Client } = require('pg');

// POST /orders
// Body: { "consumerId": "...", "items": [{ "listingId": "...", "quantity": 2 }] }
//
// IMPORTANT: the client sends listingId + quantity only.
// It NEVER sends price or total - those are looked up and calculated
// here, server-side, from the database. This is the fix for the
// "client could edit the price to $0.01" problem discussed earlier.
//
// NOTE: consumerId is taken from the request body for now because
// Cognito auth isn't wired up yet (that's next week's step). Once
// Cognito is in place, this MUST be replaced with the verified
// identity from event.requestContext.authorizer.jwt.claims.sub -
// never trust a consumerId sent in the body in the final version.
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
    const body = JSON.parse(event.body);
    const { consumerId, items } = body;

    if (!consumerId || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'consumerId and items are required' }) };
    }

    await client.connect();
    await client.query('BEGIN');

    let total = 0;
    const orderItemRows = [];

    // Look up the REAL price and available quantity for each listing.
    // The quantity the client wants is trusted; the price never is.
    for (const item of items) {
      const listingResult = await client.query(
        'SELECT price, quantity_available FROM listings WHERE listing_id = $1 AND status = $2',
        [item.listingId, 'active']
      );

      if (listingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { statusCode: 404, body: JSON.stringify({ error: `Listing ${item.listingId} not found or not active` }) };
      }

      const { price, quantity_available } = listingResult.rows[0];

      if (item.quantity > quantity_available) {
        await client.query('ROLLBACK');
        return { statusCode: 409, body: JSON.stringify({ error: `Not enough quantity available for listing ${item.listingId}` }) };
      }

      const unitPrice = Number(price);
      total += unitPrice * item.quantity;
      orderItemRows.push({ listingId: item.listingId, quantity: item.quantity, unitPrice });
    }

    // Create the order using the SERVER-CALCULATED total
    const orderResult = await client.query(
      `INSERT INTO orders (consumer_id, total_amount, payment_status)
       VALUES ($1, $2, 'pending')
       RETURNING order_id`,
      [consumerId, total]
    );
    const orderId = orderResult.rows[0].order_id;

    // Insert each order_item and decrement inventory
    for (const row of orderItemRows) {
      await client.query(
        `INSERT INTO order_items (order_id, listing_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, row.listingId, row.quantity, row.unitPrice]
      );

      await client.query(
        `UPDATE listings SET quantity_available = quantity_available - $1 WHERE listing_id = $2`,
        [row.quantity, row.listingId]
      );
    }

    await client.query('COMMIT');

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, total: total.toFixed(2), status: 'pending' })
    };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Order could not be created' }) };
  } finally {
    await client.end();
  }
};
