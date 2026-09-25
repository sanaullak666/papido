-- ====================================================================
-- PAPIDO SEED DATA
-- Default Initial Seed for System Testing and Operations
-- Passwords for all seeded users: 'Password@123'
-- Bcrypt Hash: $2b$10$nKqB4qPzGzI9.Kz1fG79qOMlIUkK2l4w0k1Nf.Cq8F7lI74d/Y1Oa
-- ====================================================================

USE `papido_db`;

-- 1. USERS (Admin, Riders, Customers)
-- Password for all test users is Password@123
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `status`, `profile_image`, `is_core_member`) VALUES
(1, 'Papido Master Admin', 'pupapido@gmail.com', '+919876543210', '$2b$10$WFRLpguhJunJKFcMdp0qgeYkcc3YmFXeknuzRAWo06VgDJLZuJXOi', 'ADMIN', 'ACTIVE', NULL, 1),
(2, 'ANANYA SEN', 'customer.ananya@papido.com', '+919876543211', '$2b$10$q.ljOgbNllNSXlYi0tm7wOBBg8pJ3dy8FLd23UARyPmjDSB1DCJ06', 'CUSTOMER', 'ACTIVE', NULL, 0),
(3, 'ROHAN MEHTA', 'customer.rohan@papido.com', '+919876543213', '$2b$10$q.ljOgbNllNSXlYi0tm7wOBBg8pJ3dy8FLd23UARyPmjDSB1DCJ06', 'CUSTOMER', 'ACTIVE', NULL, 0),
(4, 'RAHUL SHARMA', 'rider.rahul@papido.com', '+919876543214', '$2b$10$q.ljOgbNllNSXlYi0tm7wOBBg8pJ3dy8FLd23UARyPmjDSB1DCJ06', 'RIDER', 'ACTIVE', NULL, 1),
(5, 'SANAULLA K', 'sanaullak294@gmail.com', '+919876543215', '$2b$10$q.ljOgbNllNSXlYi0tm7wOBBg8pJ3dy8FLd23UARyPmjDSB1DCJ06', 'RIDER', 'ACTIVE', NULL, 1),
(6, 'PRIYA SHARMA', 'rider.priya@papido.com', '+919876543216', '$2b$10$q.ljOgbNllNSXlYi0tm7wOBBg8pJ3dy8FLd23UARyPmjDSB1DCJ06', 'RIDER', 'ACTIVE', NULL, 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 2. RIDER PROFILES
INSERT IGNORE INTO `rider_profiles` (`id`, `user_id`, `vehicle_type`, `vehicle_number`, `vehicle_model`, `license_number`, `verification_status`, `rating`, `total_ratings_count`, `total_rides`, `is_online`, `is_core_member`, `upi_id`) VALUES
(1, 4, 'BIKE', 'PY-01-BK-1001', 'Hero Splendor Plus', 'DL-PY-DM-4', 'APPROVED', 5.00, 0, 0, TRUE, 1, '+919876543214@upi'),
(2, 5, 'SCOOTER', 'PY-01-SC-2002', 'Honda Activa 6G', 'DL-PY-DM-5', 'APPROVED', 5.00, 0, 0, TRUE, 1, '+919876543215@upi'),
(3, 6, 'SCOOTER', 'PY-01-FM-3003', 'TVS Jupiter 125', 'DL-PY-DM-6', 'APPROVED', 5.00, 0, 0, TRUE, 1, '+919876543216@upi')
ON DUPLICATE KEY UPDATE `vehicle_number`=VALUES(`vehicle_number`);

-- 3. CUSTOMER PROFILES
INSERT IGNORE INTO `customer_profiles` (`id`, `user_id`, `rating`, `total_ratings_count`, `total_rides`, `wallet_balance`) VALUES
(1, 2, 5.00, 0, 0, 100.00),
(2, 3, 5.00, 0, 0, 100.00);

-- 4. FARE CONFIGURATIONS
INSERT IGNORE INTO `fare_configurations` (`vehicle_type`, `base_fare`, `base_distance_km`, `per_km_fare`, `per_minute_fare`, `minimum_fare`, `cancellation_fee`, `is_active`) VALUES
('BIKE', 20.00, 1.50, 8.50, 0.75, 25.00, 10.00, TRUE),
('AUTO', 30.00, 1.50, 12.00, 1.00, 35.00, 15.00, TRUE),
('CAB_MINI', 45.00, 2.00, 16.00, 1.50, 55.00, 25.00, TRUE),
('CAB_SEDAN', 60.00, 2.00, 20.00, 2.00, 75.00, 35.00, TRUE)
ON DUPLICATE KEY UPDATE `base_fare`=VALUES(`base_fare`);

-- 5. FARE SPLIT RULES (Papido's Configurable System)
-- Rules:
-- 1. Tier 1: Fare <= 25 => Company = ₹2, Rider/Controller = ₹2
-- 2. Tier 2: Fare 25.01 - 35 => Company = ₹3, Rider/Controller = ₹3
-- 3. Tier 3: Fare 35.01 - 60 => Company = ₹4, Rider/Controller = ₹4
-- 4. Tier 4: Fare > 60 => Company = 20%, Rider = 80% (Controller ₹4 fixed baseline)
INSERT IGNORE INTO `fare_split_rules` (`id`, `min_fare`, `max_fare`, `rule_type`, `company_cut_fixed`, `rider_controller_cut_fixed`, `company_cut_percentage`, `rider_cut_percentage`, `description`, `priority`, `is_active`) VALUES
(1, 0.00, 25.00, 'FIXED', 2.00, 2.00, 0.00, 0.00, 'Tier 1: Fare up to ₹25 (Company ₹2, Controller ₹2)', 1, TRUE),
(2, 25.01, 35.00, 'FIXED', 3.00, 3.00, 0.00, 0.00, 'Tier 2: Fare ₹25–₹35 (Company ₹3, Controller ₹3)', 2, TRUE),
(3, 35.01, 60.00, 'FIXED', 4.00, 4.00, 0.00, 0.00, 'Tier 3: Fare ₹35–₹60 (Company ₹4, Controller ₹4)', 3, TRUE),
(4, 60.01, NULL, 'PERCENTAGE', 0.00, 4.00, 20.00, 80.00, 'Tier 4: Fare > ₹60 (Company 20%, Rider/Controller ₹4 baseline + 80%)', 4, TRUE)
ON DUPLICATE KEY UPDATE `description`=VALUES(`description`);

-- 6. SYSTEM SETTINGS
INSERT IGNORE INTO `system_settings` (`key`, `value`, `description`) VALUES
('PLATFORM_NAME', 'Papido', 'Platform brand name'),
('CAMPUS_ZONE_ENABLED', 'true', 'Restricts or optimizes for university campus boundaries'),
('MAX_SEARCH_RADIUS_KM', '5.0', 'Maximum driver matching radius in km'),
('RIDER_TIMEOUT_SECONDS', '45', 'Time rider has to accept incoming ride request'),
('OTP_VERIFICATION_REQUIRED', 'true', 'Require 4-digit OTP from customer to start ride')
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);
