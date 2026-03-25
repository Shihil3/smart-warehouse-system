-- =============================================================
-- Smart Warehouse System - Seed Data
-- Run: psql -U warehouse_user -d warehouse_db -h localhost -p 5433 -f db/seeds.sql
-- =============================================================

-- Zones
INSERT INTO zones (name, zone_type) VALUES
  ('Zone A', 'inbound'),
  ('Zone B', 'storage'),
  ('Zone C', 'staging'),
  ('Zone D', 'outbound')
ON CONFLICT DO NOTHING;

-- Locations
INSERT INTO locations (zone_id, location_type, x_coordinate, y_coordinate, label) VALUES
  (1, 'dock',    1.0, 1.0, 'Dock-1'),
  (1, 'dock',    1.0, 2.0, 'Dock-2'),
  (4, 'dock',    9.0, 1.0, 'Dock-3'),
  (4, 'dock',    9.0, 2.0, 'Dock-4'),
  (2, 'storage', 3.0, 1.0, 'Storage-A1'),
  (2, 'storage', 3.0, 2.0, 'Storage-A2'),
  (2, 'storage', 4.0, 1.0, 'Storage-B1'),
  (3, 'staging', 6.0, 1.0, 'Staging-1'),
  (3, 'staging', 6.0, 2.0, 'Staging-2')
ON CONFLICT DO NOTHING;

-- Products
INSERT INTO products (sku, name, category, weight, volume) VALUES
  ('SKU-001', 'Industrial Fan',    'Electronics', 12.5, 0.08),
  ('SKU-002', 'Cardboard Box Set', 'Packaging',    3.0, 0.05),
  ('SKU-003', 'Steel Shelf Unit',  'Furniture',   45.0, 0.40),
  ('SKU-004', 'Safety Helmet',     'Safety',       0.8, 0.01),
  ('SKU-005', 'Forklift Battery',  'Machinery',   60.0, 0.25)
ON CONFLICT (sku) DO NOTHING;

-- Destinations
INSERT INTO destinations (name, region, address) VALUES
  ('North Hub',   'North', '12 Industrial Rd, North City'),
  ('South Hub',   'South', '88 Warehouse Ave, South City'),
  ('East Depot',  'East',  '5 Logistics Blvd, East City'),
  ('West Depot',  'West',  '99 Freight St, West City')
ON CONFLICT DO NOTHING;

-- Users
-- Password for all users: admin123
-- Generate your own hash: ruby -e "require 'bcrypt'; puts BCrypt::Password.create('admin123')"
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@warehouse.com',   '$2a$12$jtM16P8pFrNkDJ/Yp4UrDusfotFznCisy5.ghgxG6n86k3twVeQU6', 'manager'),
  ('worker1@warehouse.com', '$2a$12$jtM16P8pFrNkDJ/Yp4UrDusfotFznCisy5.ghgxG6n86k3twVeQU6', 'worker'),
  ('worker2@warehouse.com', '$2a$12$jtM16P8pFrNkDJ/Yp4UrDusfotFznCisy5.ghgxG6n86k3twVeQU6', 'worker')
ON CONFLICT (email) DO NOTHING;

-- Inbound Trucks
INSERT INTO inbound_trucks (truck_number, arrival_time, status) VALUES
  ('TRK-IN-001', NOW() - INTERVAL '2 hours', 'arrived'),
  ('TRK-IN-002', NOW() - INTERVAL '1 hour',  'arrived'),
  ('TRK-IN-003', NOW() + INTERVAL '1 hour',  'pending')
ON CONFLICT DO NOTHING;

-- Outbound Trucks
INSERT INTO outbound_trucks (truck_number, destination_id, departure_deadline, max_weight, max_pallet_count, dock_location_id, status) VALUES
  ('TRK-OUT-001', 1, NOW() + INTERVAL '4 hours', 1000.0, 20, 3, 'scheduled'),
  ('TRK-OUT-002', 2, NOW() + INTERVAL '6 hours',  800.0, 15, 4, 'scheduled'),
  ('TRK-OUT-003', 3, NOW() + INTERVAL '8 hours', 1200.0, 25, 3, 'scheduled')
ON CONFLICT DO NOTHING;

-- Pallets (dock locations)
INSERT INTO pallets (product_id, destination_id, inbound_truck_id, outbound_truck_id, current_location_id, priority, weight, status, qr_code)
VALUES
  (
    (SELECT id FROM products WHERE sku = 'SKU-001'),
    (SELECT id FROM destinations WHERE name = 'North Hub'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-001'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-001'),
    (SELECT id FROM locations WHERE label = 'Dock-1'),
    1, 12.5, 'created', 'PLT-001'
  ),
  (
    (SELECT id FROM products WHERE sku = 'SKU-002'),
    (SELECT id FROM destinations WHERE name = 'South Hub'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-001'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-002'),
    (SELECT id FROM locations WHERE label = 'Dock-2'),
    2, 3.0, 'created', 'PLT-002'
  ),
  (
    (SELECT id FROM products WHERE sku = 'SKU-003'),
    (SELECT id FROM destinations WHERE name = 'East Depot'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-002'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-003'),
    (SELECT id FROM locations WHERE label = 'Dock-3'),
    1, 45.0, 'created', 'PLT-003'
  ),
  (
    (SELECT id FROM products WHERE sku = 'SKU-004'),
    (SELECT id FROM destinations WHERE name = 'North Hub'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-002'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-001'),
    (SELECT id FROM locations WHERE label = 'Dock-4'),
    3, 0.8, 'created', 'PLT-004'
  );

-- Pallets (staging locations)
INSERT INTO pallets (product_id, destination_id, inbound_truck_id, outbound_truck_id, current_location_id, priority, weight, status, qr_code)
VALUES
  (
    (SELECT id FROM products WHERE sku = 'SKU-005'),
    (SELECT id FROM destinations WHERE name = 'South Hub'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-001'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-002'),
    (SELECT id FROM locations WHERE label = 'Staging-1'),
    1, 60.0, 'created', 'PLT-005'
  ),
  (
    (SELECT id FROM products WHERE sku = 'SKU-001'),
    (SELECT id FROM destinations WHERE name = 'East Depot'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-002'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-003'),
    (SELECT id FROM locations WHERE label = 'Staging-1'),
    2, 12.5, 'created', 'PLT-006'
  ),
  (
    (SELECT id FROM products WHERE sku = 'SKU-002'),
    (SELECT id FROM destinations WHERE name = 'North Hub'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-001'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-001'),
    (SELECT id FROM locations WHERE label = 'Staging-2'),
    1, 3.0, 'created', 'PLT-007'
  ),
  (
    (SELECT id FROM products WHERE sku = 'SKU-003'),
    (SELECT id FROM destinations WHERE name = 'West Depot'),
    (SELECT id FROM inbound_trucks WHERE truck_number = 'TRK-IN-002'),
    (SELECT id FROM outbound_trucks WHERE truck_number = 'TRK-OUT-002'),
    (SELECT id FROM locations WHERE label = 'Staging-2'),
    3, 45.0, 'created', 'PLT-008'
  );
