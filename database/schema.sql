-- ====================================================================
-- PAPIDO DATABASE SCHEMA
-- Production-Ready MySQL Schema for Ride-Hailing Platform
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `papido_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `papido_db`;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'RIDER', 'CUSTOMER') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') DEFAULT 'ACTIVE',
    `suspension_reason` VARCHAR(500) DEFAULT NULL,
    `profile_image` VARCHAR(500) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_phone` (`phone`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. RIDER PROFILES TABLE
-- Rider means the DRIVER who provides the ride
CREATE TABLE IF NOT EXISTS `rider_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `vehicle_type` VARCHAR(50) NOT NULL DEFAULT 'BIKE',
    `vehicle_number` VARCHAR(30) NOT NULL UNIQUE,
    `vehicle_model` VARCHAR(100) NOT NULL,
    `license_number` VARCHAR(50) NOT NULL UNIQUE,
    `license_doc_url` VARCHAR(500) DEFAULT NULL,
    `rc_doc_url` VARCHAR(500) DEFAULT NULL,
    `college_id_doc_url` VARCHAR(500) DEFAULT NULL,
    `verification_status` ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    `rating` DECIMAL(3, 2) DEFAULT 5.00,
    `total_ratings_count` INT DEFAULT 0,
    `total_rides` INT DEFAULT 0,
    `is_online` BOOLEAN DEFAULT FALSE,
    `current_latitude` DECIMAL(10, 8) DEFAULT NULL,
    `current_longitude` DECIMAL(11, 8) DEFAULT NULL,
    `last_location_update` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_rider_online_status` (`is_online`, `verification_status`),
    INDEX `idx_rider_location` (`current_latitude`, `current_longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CUSTOMER PROFILES TABLE
-- Customer means the PASSENGER who books the ride
CREATE TABLE IF NOT EXISTS `customer_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `rating` DECIMAL(3, 2) DEFAULT 5.00,
    `total_ratings_count` INT DEFAULT 0,
    `total_rides` INT DEFAULT 0,
    `wallet_balance` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. FARE CONFIGURATIONS TABLE (Source of truth for fare calculation)
CREATE TABLE IF NOT EXISTS `fare_configurations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_type` VARCHAR(50) NOT NULL UNIQUE,
    `base_fare` DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    `base_distance_km` DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
    `per_km_fare` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    `per_minute_fare` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    `minimum_fare` DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    `cancellation_fee` DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. FARE SPLIT RULES TABLE (Configurable Papido split system)
CREATE TABLE IF NOT EXISTS `fare_split_rules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `min_fare` DECIMAL(10, 2) NOT NULL,
    `max_fare` DECIMAL(10, 2) DEFAULT NULL, -- NULL means infinity / above min_fare
    `rule_type` ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
    `company_cut_fixed` DECIMAL(10, 2) DEFAULT 0.00,
    `rider_controller_cut_fixed` DECIMAL(10, 2) DEFAULT 0.00,
    `company_cut_percentage` DECIMAL(5, 2) DEFAULT 0.00, -- e.g. 20.00 for 20%
    `rider_cut_percentage` DECIMAL(5, 2) DEFAULT 80.00,
    `description` VARCHAR(255) DEFAULT NULL,
    `priority` INT DEFAULT 1,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. RIDES TABLE
CREATE TABLE IF NOT EXISTS `rides` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ride_code` VARCHAR(20) NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `rider_id` INT DEFAULT NULL,
    `vehicle_type` VARCHAR(50) NOT NULL DEFAULT 'BIKE',
    
    `pickup_address` VARCHAR(255) NOT NULL,
    `pickup_latitude` DECIMAL(10, 8) NOT NULL,
    `pickup_longitude` DECIMAL(11, 8) NOT NULL,
    
    `destination_address` VARCHAR(255) NOT NULL,
    `destination_latitude` DECIMAL(10, 8) NOT NULL,
    `destination_longitude` DECIMAL(11, 8) NOT NULL,
    
    `estimated_distance` DECIMAL(8, 2) NOT NULL, -- in km
    `estimated_duration` INT NOT NULL, -- in minutes
    `estimated_fare` DECIMAL(10, 2) NOT NULL,
    `final_fare` DECIMAL(10, 2) DEFAULT NULL,
    
    `otp` VARCHAR(6) DEFAULT NULL,
    `status` ENUM(
        'PENDING_ADMIN_QUOTE',
        'SCHEDULED',
        'REQUESTED',
        'ACCEPTED',
        'RIDER_ARRIVING',
        'RIDER_REACHED',
        'STARTED',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'REQUESTED',
    
    `payment_method` ENUM('CASH', 'WALLET', 'UPI', 'CARD') DEFAULT 'CASH',
    `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    
    `female_rider_only` BOOLEAN DEFAULT FALSE,
    `is_double_ride` BOOLEAN DEFAULT FALSE,
    `is_outside` BOOLEAN DEFAULT FALSE,
    `is_scheduled` BOOLEAN DEFAULT FALSE,
    `scheduled_time` DATETIME DEFAULT NULL,
    `is_dispatched` BOOLEAN DEFAULT FALSE,
    
    `cancellation_reason` VARCHAR(255) DEFAULT NULL,
    `cancelled_by_role` ENUM('CUSTOMER', 'RIDER', 'ADMIN') DEFAULT NULL,
    
    `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `accepted_at` DATETIME DEFAULT NULL,
    `arrived_at` DATETIME DEFAULT NULL,
    `started_at` DATETIME DEFAULT NULL,
    `completed_at` DATETIME DEFAULT NULL,
    `cancelled_at` DATETIME DEFAULT NULL,
    
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`rider_id`) REFERENCES `users`(`id`),
    INDEX `idx_rides_status` (`status`),
    INDEX `idx_rides_customer` (`customer_id`),
    INDEX `idx_rides_rider` (`rider_id`),
    INDEX `idx_rides_created` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ride_id` INT NOT NULL,
    `customer_id` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('CASH', 'WALLET', 'UPI', 'CARD') NOT NULL DEFAULT 'CASH',
    `payment_status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `transaction_reference` VARCHAR(100) UNIQUE DEFAULT NULL,
    `gateway_response` JSON DEFAULT NULL,
    `paid_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
    INDEX `idx_payments_ride` (`ride_id`),
    INDEX `idx_payments_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. RIDER EARNINGS TABLE (Detailed Split Ledger)
CREATE TABLE IF NOT EXISTS `rider_earnings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rider_id` INT NOT NULL,
    `ride_id` INT NOT NULL UNIQUE,
    `total_fare` DECIMAL(10, 2) NOT NULL,
    `rider_earning` DECIMAL(10, 2) NOT NULL,
    `company_earning` DECIMAL(10, 2) NOT NULL,
    `controller_earning` DECIMAL(10, 2) DEFAULT 0.00,
    `applied_rule_description` VARCHAR(255) DEFAULT NULL,
    `gross_fare` DECIMAL(10, 2) DEFAULT NULL,
    `platform_fee` DECIMAL(10, 2) DEFAULT NULL,
    `controller_fee` DECIMAL(10, 2) DEFAULT 0.00,
    `net_earning` DECIMAL(10, 2) DEFAULT NULL,
    `settlement_status` ENUM('UNSETTLED', 'SETTLED') DEFAULT 'UNSETTLED',
    `settled_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`rider_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON DELETE CASCADE,
    INDEX `idx_earnings_rider` (`rider_id`),
    INDEX `idx_earnings_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. RATINGS TABLE
CREATE TABLE IF NOT EXISTS `ratings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ride_id` INT NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `rider_id` INT NOT NULL,
    `rating` DECIMAL(2, 1) NOT NULL,
    `review` TEXT DEFAULT NULL,
    `rated_by_role` ENUM('CUSTOMER', 'RIDER') NOT NULL DEFAULT 'CUSTOMER',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`rider_id`) REFERENCES `users`(`id`),
    INDEX `idx_ratings_rider` (`rider_id`),
    INDEX `idx_ratings_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'RIDE_UPDATE',
    `data` JSON DEFAULT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_notifications_user` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` INT DEFAULT NULL,
    `details` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS `system_settings` (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. CANCELLATION PENALTIES TABLE
CREATE TABLE IF NOT EXISTS `cancellation_penalties` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ride_id` INT NOT NULL,
    `customer_id` INT NOT NULL,
    `rider_id` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    `rider_upi_id` VARCHAR(100) DEFAULT '',
    `rider_name` VARCHAR(100) DEFAULT '',
    `status` VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    `payment_reference` VARCHAR(150) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `waived_by` INT DEFAULT NULL,
    `paid_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_cp_customer_status` (`customer_id`, `status`),
    INDEX `idx_cp_rider_id` (`rider_id`),
    INDEX `idx_cp_ride_id` (`ride_id`),
    INDEX `idx_cp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. DAILY DUTY CONTROLLERS TABLE
CREATE TABLE IF NOT EXISTS `daily_duty_controllers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `date` DATE NOT NULL UNIQUE,
    `core_member_id` INT NOT NULL,
    `payout_status` VARCHAR(30) DEFAULT 'PENDING',
    `notes` VARCHAR(255) DEFAULT NULL,
    `assigned_by` INT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`core_member_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. DAILY SHIFT SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS `daily_shift_settlements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rider_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `total_trips` INT DEFAULT 0,
    `gross_fare` DECIMAL(10, 2) DEFAULT 0.00,
    `company_due` DECIMAL(10, 2) DEFAULT 0.00,
    `controller_due` DECIMAL(10, 2) DEFAULT 0.00,
    `total_commission_due` DECIMAL(10, 2) DEFAULT 0.00,
    `rider_net_earnings` DECIMAL(10, 2) DEFAULT 0.00,
    `status` VARCHAR(30) NOT NULL DEFAULT 'UNSETTLED',
    `utr_reference` VARCHAR(150) DEFAULT NULL,
    `rejection_reason` VARCHAR(255) DEFAULT NULL,
    `submitted_at` DATETIME DEFAULT NULL,
    `approved_at` DATETIME DEFAULT NULL,
    `approved_by` INT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_dss_rider_date` (`rider_id`, `date`),
    INDEX `idx_dss_rider` (`rider_id`),
    INDEX `idx_dss_date` (`date`),
    INDEX `idx_dss_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. RIDE DECLINES TABLE
CREATE TABLE IF NOT EXISTS `ride_declines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ride_id` INT NOT NULL,
    `rider_id` INT NOT NULL,
    `declined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_decline` (`ride_id`, `rider_id`),
    FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`rider_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. PASSWORD RESETS TABLE
CREATE TABLE IF NOT EXISTS `password_resets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL,
    `otp` VARCHAR(10) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `used` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `endpoint` TEXT NOT NULL,
    `p256dh` VARCHAR(255) NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. LOGIN OTPS TABLE (Mobile login via email OTP)
CREATE TABLE IF NOT EXISTS `login_otps` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `otp` VARCHAR(10) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `used` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_login_otps_phone` (`phone`, `used`),
    INDEX `idx_login_otps_email` (`email`, `used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

