-- ===== LOOKUP DATA =====
INSERT INTO surplus_reasons (label) VALUES
    ('Closing-time leftover'),
    ('Cancelled catering order'),
    ('Cosmetic imperfection'),
    ('Forecast error');

INSERT INTO allergens (name) VALUES
    ('Peanuts'),
    ('Tree nuts'),
    ('Dairy'),
    ('Gluten'),
    ('Eggs'),
    ('Soy');

INSERT INTO dietary_tags (name) VALUES
    ('Vegan'),
    ('Vegetarian'),
    ('Halal'),
    ('Gluten-free');

-- ===== VENDORS =====
INSERT INTO vendors (
    vendor_id, business_name, email, phone, address,
    latitude, longitude,
    default_pickup_window_start, default_pickup_window_end,
    community_routing_opt_in
) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001',
     'Riverside Bakery', 'orders@riversidebakery.test', '518-555-0142',
     '14 Margaret St, Plattsburgh, NY 12901',
     44.695280, -73.452500,
     '17:30', '19:00', TRUE),

    ('aaaaaaaa-0000-0000-0000-000000000002',
     'Campus Dining Commons', 'dining@university.test', '518-555-0177',
     '101 Broad St, Plattsburgh, NY 12901',
     44.692100, -73.456800,
     '19:00', '20:30', FALSE),

    ('aaaaaaaa-0000-0000-0000-000000000003',
     'Corner Cafe', 'hello@cornercafe.test', '518-555-0193',
     '88 City Hall Pl, Plattsburgh, NY 12901',
     44.697900, -73.450100,
     '16:00', '17:30', TRUE);

-- ===== CONSUMERS =====
INSERT INTO consumers (
    consumer_id, full_name, email, phone
) VALUES
    ('bbbbbbbb-0000-0000-0000-000000000001',
     'Alice Nguyen', 'alice@example.test', '518-555-0201'),

    ('bbbbbbbb-0000-0000-0000-000000000002',
     'Bob Martinez', 'bob@example.test', '518-555-0202'),

    ('bbbbbbbb-0000-0000-0000-000000000003',
     'Priya Shah', 'priya@example.test', '518-555-0203');

-- ===== ITEM TEMPLATES =====
INSERT INTO item_templates (
    item_template_id, vendor_id, name,
    default_price, default_portion_size, photo_url
) VALUES
    ('cccccccc-0000-0000-0000-000000000001',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'Assorted Pastries', 3.50, '4 pieces',
     'https://cdn.example.test/img/pastries.jpg'),

    ('cccccccc-0000-0000-0000-000000000002',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'Sourdough Loaf', 4.00, '1 loaf',
     'https://cdn.example.test/img/sourdough.jpg'),

    ('cccccccc-0000-0000-0000-000000000003',
     'aaaaaaaa-0000-0000-0000-000000000002',
     'Hot Entree Tray', 8.00, 'Serves 4',
     'https://cdn.example.test/img/entree.jpg'),

    ('cccccccc-0000-0000-0000-000000000004',
     'aaaaaaaa-0000-0000-0000-000000000003',
     'Soup & Roll', 5.00, '16 oz + 1 roll',
     'https://cdn.example.test/img/soup.jpg');

-- ===== ALLERGEN / DIETARY TAGGING =====
-- Assorted Pastries: Dairy, Gluten, Eggs
INSERT INTO item_template_allergens (item_template_id, allergen_id) VALUES
    ('cccccccc-0000-0000-0000-000000000001', 3),
    ('cccccccc-0000-0000-0000-000000000001', 4),
    ('cccccccc-0000-0000-0000-000000000001', 5),
-- Sourdough Loaf: Gluten
    ('cccccccc-0000-0000-0000-000000000002', 4),
-- Hot Entree Tray: Dairy, Soy
    ('cccccccc-0000-0000-0000-000000000003', 3),
    ('cccccccc-0000-0000-0000-000000000003', 6),
-- Soup & Roll: Gluten
    ('cccccccc-0000-0000-0000-000000000004', 4);

-- Sourdough Loaf: Vegan, Vegetarian
INSERT INTO item_template_dietary_tags (item_template_id, tag_id) VALUES
    ('cccccccc-0000-0000-0000-000000000002', 1),
    ('cccccccc-0000-0000-0000-000000000002', 2),
-- Soup & Roll: Vegetarian
    ('cccccccc-0000-0000-0000-000000000004', 2);

-- ===== LISTINGS =====
INSERT INTO listings (
    listing_id, vendor_id, item_template_id, surplus_reason_id,
    quantity_available, price,
    pickup_window_start, pickup_window_end, status
) VALUES
    -- Active listing, partially sold
    ('dddddddd-0000-0000-0000-000000000001',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'cccccccc-0000-0000-0000-000000000001',
     1, 5, 3.50,
     '2026-09-15 17:30', '2026-09-15 19:00', 'active'),

    -- Active listing
    ('dddddddd-0000-0000-0000-000000000002',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'cccccccc-0000-0000-0000-000000000002',
     3, 2, 4.00,
     '2026-09-15 17:30', '2026-09-15 19:00', 'active'),

    -- Cancelled catering, large tray
    ('dddddddd-0000-0000-0000-000000000003',
     'aaaaaaaa-0000-0000-0000-000000000002',
     'cccccccc-0000-0000-0000-000000000003',
     2, 3, 8.00,
     '2026-09-15 19:00', '2026-09-15 20:30', 'active'),

    -- Expired / unclaimed, eligible for community routing
    ('dddddddd-0000-0000-0000-000000000004',
     'aaaaaaaa-0000-0000-0000-000000000003',
     'cccccccc-0000-0000-0000-000000000004',
     4, 6, 5.00,
     '2026-09-14 16:00', '2026-09-14 17:30', 'expired');

-- ===== ORDERS =====
-- Order 1: Alice buys from a single listing
INSERT INTO orders (
    order_id, consumer_id, total_amount,
    payment_status, stripe_payment_intent_id
) VALUES
    ('eeeeeeee-0000-0000-0000-000000000001',
     'bbbbbbbb-0000-0000-0000-000000000001',
     7.00, 'paid', 'pi_test_alice_0001'),

-- Order 2: Bob buys from TWO different listings in one checkout
    ('eeeeeeee-0000-0000-0000-000000000002',
     'bbbbbbbb-0000-0000-0000-000000000002',
     16.00, 'paid', 'pi_test_bob_0002'),

-- Order 3: Priya, payment still pending
    ('eeeeeeee-0000-0000-0000-000000000003',
     'bbbbbbbb-0000-0000-0000-000000000003',
     8.00, 'pending', NULL);

-- ===== ORDER ITEMS =====
INSERT INTO order_items (
    order_item_id, order_id, listing_id,
    quantity, unit_price, picked_up, picked_up_at
) VALUES
    -- Alice: 2x pastries, already picked up
    ('ffffffff-0000-0000-0000-000000000001',
     'eeeeeeee-0000-0000-0000-000000000001',
     'dddddddd-0000-0000-0000-000000000001',
     2, 3.50, TRUE, '2026-09-15 18:12'),

    -- Bob line 1: 2x pastries
    ('ffffffff-0000-0000-0000-000000000002',
     'eeeeeeee-0000-0000-0000-000000000002',
     'dddddddd-0000-0000-0000-000000000001',
     2, 3.50, FALSE, NULL),

    -- Bob line 2: sourdough loaf (demonstrates multi-listing order)
    ('ffffffff-0000-0000-0000-000000000003',
     'eeeeeeee-0000-0000-0000-000000000002',
     'dddddddd-0000-0000-0000-000000000002',
     1, 4.00, FALSE, NULL),

    -- Bob line 3: entree tray from a DIFFERENT vendor, same checkout
    ('ffffffff-0000-0000-0000-000000000004',
     'eeeeeeee-0000-0000-0000-000000000002',
     'dddddddd-0000-0000-0000-000000000003',
     1, 8.00, FALSE, NULL),

    -- Priya: pending entree tray
    ('ffffffff-0000-0000-0000-000000000005',
     'eeeeeeee-0000-0000-0000-000000000003',
     'dddddddd-0000-0000-0000-000000000003',
     1, 8.00, FALSE, NULL);

-- ===== COMMUNITY PARTNERS & PICKUPS =====
INSERT INTO community_partners (
    partner_id, name, contact_email, address
) VALUES
    ('11111111-0000-0000-0000-000000000001',
     'North Country Food Pantry', 'contact@ncfoodpantry.test',
     '25 Bridge St, Plattsburgh, NY 12901'),

    ('11111111-0000-0000-0000-000000000002',
     'Community Fridge Collective', 'fridge@community.test',
     '7 Court St, Plattsburgh, NY 12901');

-- Expired Corner Cafe listing routed to the pantry
INSERT INTO community_pickups (
    pickup_id, listing_id, partner_id, status
) VALUES
    ('22222222-0000-0000-0000-000000000001',
     'dddddddd-0000-0000-0000-000000000004',
     '11111111-0000-0000-0000-000000000001',
     'completed');

-- ===== FAVORITES =====
INSERT INTO favorites (consumer_id, vendor_id) VALUES
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003'),
    ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002');

-- ===== ANALYTICS BASELINE =====
INSERT INTO vendor_waste_baseline (
    vendor_id, period_start, period_end,
    baseline_unsold_units, actual_unsold_units, revenue_recovered
) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001',
     '2026-08-01', '2026-08-31', 240, 165, 412.50),

    ('aaaaaaaa-0000-0000-0000-000000000002',
     '2026-08-01', '2026-08-31', 520, 390, 1040.00),

    ('aaaaaaaa-0000-0000-0000-000000000003',
     '2026-08-01', '2026-08-31', 180, 140, 225.00);























































-- ============================================================
-- VERIFICATION QUERIES (optional — run to confirm the data loaded)
-- ============================================================

-- Bob's multi-listing order across two vendors:
-- SELECT o.order_id, v.business_name, it.name, oi.quantity, oi.unit_price
-- FROM orders o
-- JOIN order_items oi ON oi.order_id = o.order_id
-- JOIN listings l     ON l.listing_id = oi.listing_id
-- JOIN vendors v      ON v.vendor_id = l.vendor_id
-- JOIN item_templates it ON it.item_template_id = l.item_template_id
-- WHERE o.order_id = 'eeeeeeee-0000-0000-0000-000000000002';

-- Active listings with their surplus reason and allergens:
-- SELECT it.name, sr.label AS surplus_reason, a.name AS allergen
-- FROM listings l
-- JOIN item_templates it ON it.item_template_id = l.item_template_id
-- JOIN surplus_reasons sr ON sr.reason_id = l.surplus_reason_id
-- LEFT JOIN item_template_allergens ita ON ita.item_template_id = it.item_template_id
-- LEFT JOIN allergens a ON a.allergen_id = ita.allergen_id
-- WHERE l.status = 'active';
