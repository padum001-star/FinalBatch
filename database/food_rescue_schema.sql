-- Enable UUID generation (run once per database)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== USERS =====
CREATE TABLE vendors (
    vendor_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name   VARCHAR(150) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    address         VARCHAR(255),
    latitude        DECIMAL(9,6),
    longitude       DECIMAL(9,6),
    default_pickup_window_start TIME,
    default_pickup_window_end   TIME,
    community_routing_opt_in BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE consumers (
    consumer_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150),
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    created_at      TIMESTAMP DEFAULT now()
);

-- ===== LOOKUP TABLES =====
CREATE TABLE surplus_reasons (
    reason_id   SERIAL PRIMARY KEY,
    label       VARCHAR(50) NOT NULL
);

CREATE TABLE allergens (
    allergen_id SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL
);

CREATE TABLE dietary_tags (
    tag_id      SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL
);

-- ===== VENDOR ITEM TEMPLATES =====
CREATE TABLE item_templates (
    item_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id        UUID REFERENCES vendors(vendor_id),
    name             VARCHAR(150) NOT NULL,
    default_price    DECIMAL(6,2),
    default_portion_size VARCHAR(50),
    photo_url        VARCHAR(255)
);

CREATE TABLE item_template_allergens (
    item_template_id UUID REFERENCES item_templates(item_template_id),
    allergen_id      INT REFERENCES allergens(allergen_id),
    PRIMARY KEY (item_template_id, allergen_id)
);

CREATE TABLE item_template_dietary_tags (
    item_template_id UUID REFERENCES item_templates(item_template_id),
    tag_id           INT REFERENCES dietary_tags(tag_id),
    PRIMARY KEY (item_template_id, tag_id)
);

-- ===== LISTINGS =====
CREATE TABLE listings (
    listing_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id        UUID REFERENCES vendors(vendor_id),
    item_template_id UUID REFERENCES item_templates(item_template_id),
    surplus_reason_id INT REFERENCES surplus_reasons(reason_id),
    quantity_available INT NOT NULL,
    price            DECIMAL(6,2) NOT NULL,
    pickup_window_start TIMESTAMP NOT NULL,
    pickup_window_end   TIMESTAMP NOT NULL,
    status           VARCHAR(20) DEFAULT 'active',
    created_at       TIMESTAMP DEFAULT now()
);

-- ===== ORDERS =====
CREATE TABLE orders (
    order_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id     UUID REFERENCES consumers(consumer_id),
    total_amount    DECIMAL(6,2) NOT NULL,
    payment_status  VARCHAR(20) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    created_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE order_items (
    order_item_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID REFERENCES orders(order_id),
    listing_id      UUID REFERENCES listings(listing_id),
    quantity        INT NOT NULL,
    unit_price      DECIMAL(6,2) NOT NULL,
    picked_up       BOOLEAN DEFAULT FALSE,
    picked_up_at    TIMESTAMP
);

-- ===== COMMUNITY ROUTING =====
CREATE TABLE community_partners (
    partner_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    contact_email   VARCHAR(255),
    address         VARCHAR(255)
);

CREATE TABLE community_pickups (
    pickup_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID REFERENCES listings(listing_id),
    partner_id      UUID REFERENCES community_partners(partner_id),
    status          VARCHAR(20) DEFAULT 'requested',
    created_at      TIMESTAMP DEFAULT now()
);

-- ===== ANALYTICS =====
CREATE TABLE vendor_waste_baseline (
    baseline_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID REFERENCES vendors(vendor_id),
    period_start    DATE,
    period_end      DATE,
    baseline_unsold_units INT,
    actual_unsold_units   INT,
    revenue_recovered     DECIMAL(8,2)
);

-- ===== FAVORITES =====
CREATE TABLE favorites (
    consumer_id     UUID REFERENCES consumers(consumer_id),
    vendor_id       UUID REFERENCES vendors(vendor_id),
    PRIMARY KEY (consumer_id, vendor_id)
);