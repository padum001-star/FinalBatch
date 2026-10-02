-- VERIFICATION QUERIES for food_rescue schema


-- Q1: View all active listings
-- Expected: 3 rows

SELECT
    l.listing_id,
    v.business_name,
    it.name AS item_name,
    l.price,
    l.quantity_available,
    l.pickup_window_start,
    l.pickup_window_end,
    sr.label AS surplus_reason
FROM listings l
JOIN vendors v          ON v.vendor_id = l.vendor_id
JOIN item_templates it  ON it.item_template_id = l.item_template_id
JOIN surplus_reasons sr ON sr.reason_id = l.surplus_reason_id
WHERE l.status = 'active'
ORDER BY l.pickup_window_start;


-- Q2: View allergens for Assorted Pastries
-- Expected: Dairy, Gluten, Eggs

SELECT
    it.name,
    a.name AS allergen
FROM listings l
JOIN item_templates it ON it.item_template_id = l.item_template_id
JOIN item_template_allergens ita ON ita.item_template_id = it.item_template_id
JOIN allergens a ON a.allergen_id = ita.allergen_id
WHERE l.listing_id = 'dddddddd-0000-0000-0000-000000000001';


-- Q3: View Bob's order items from multiple vendors
-- Expected: 3 rows

SELECT
    o.order_id,
    v.business_name AS vendor,
    it.name AS item,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) AS line_total,
    o.payment_status
FROM orders o
JOIN order_items oi     ON oi.order_id = o.order_id
JOIN listings l         ON l.listing_id = oi.listing_id
JOIN vendors v          ON v.vendor_id = l.vendor_id
JOIN item_templates it  ON it.item_template_id = l.item_template_id
WHERE o.order_id = 'eeeeeeee-0000-0000-0000-000000000002';


-- Q4: Verify order totals
-- Expected: stored_total = computed_total

SELECT
    o.order_id,
    o.total_amount AS stored_total,
    SUM(oi.quantity * oi.unit_price) AS computed_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.total_amount;


-- Q5: Check order ownership
-- Expected: 0 rows

SELECT
    order_id,
    total_amount,
    payment_status
FROM orders
WHERE order_id = 'eeeeeeee-0000-0000-0000-000000000002'
  AND consumer_id = 'bbbbbbbb-0000-0000-0000-000000000001';


-- Q6: View community pickup
-- Expected: Corner Cafe's completed pickup

SELECT
    v.business_name,
    it.name,
    l.status,
    cp.status AS pickup_status,
    p.name AS partner_name
FROM community_pickups cp
JOIN listings l           ON l.listing_id = cp.listing_id
JOIN vendors v            ON v.vendor_id = l.vendor_id
JOIN item_templates it    ON it.item_template_id = l.item_template_id
JOIN community_partners p ON p.partner_id = cp.partner_id;


-- Q7: Vendor waste-reduction summary

SELECT
    v.business_name,
    b.baseline_unsold_units,
    b.actual_unsold_units,
    ROUND(
        100.0 * (b.baseline_unsold_units - b.actual_unsold_units)
        / b.baseline_unsold_units,
        1
    ) AS pct_reduction,
    b.revenue_recovered
FROM vendor_waste_baseline b
JOIN vendors v ON v.vendor_id = b.vendor_id
WHERE b.period_start = '2026-08-01';


-- Q8: View favorite vendors and active listings

SELECT
    c.full_name,
    v.business_name,
    l.listing_id,
    it.name AS active_item
FROM favorites f
JOIN consumers c ON c.consumer_id = f.consumer_id
JOIN vendors v   ON v.vendor_id = f.vendor_id
LEFT JOIN listings l
    ON l.vendor_id = v.vendor_id
    AND l.status = 'active'
LEFT JOIN item_templates it
    ON it.item_template_id = l.item_template_id
WHERE c.consumer_id = 'bbbbbbbb-0000-0000-0000-000000000001';