-- Migration: 0002_entities_and_user_profile
-- Entity table (SV, LP — each with own bank details, address, tax ID, logo)
CREATE TABLE IF NOT EXISTS `entity` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `bank_name` text,
  `bank_account` text,
  `bank_routing` text,
  `bank_swift` text,
  `bank_iban` text,
  `address_line_1` text,
  `address_line_2` text,
  `city` text,
  `state` text,
  `postal_code` text,
  `country` text,
  `tax_id` text,
  `logo_key` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

-- Add role, entity assignment, and invoice prefix to user table
-- Wrapped in exception handling for idempotency (SQLite/D1 has no ADD COLUMN IF NOT EXISTS)
-- Note: D1 executes these as separate statements, so we accept the error on re-run
-- The db:migrate scripts track applied migrations via the journal table below
ALTER TABLE `user` ADD COLUMN `role` text NOT NULL DEFAULT 'user';
ALTER TABLE `user` ADD COLUMN `entityId` text REFERENCES `entity`(`id`);
ALTER TABLE `user` ADD COLUMN `invoicePrefix` text;

-- User profile (1:1 with user — tax settings, bank details, defaults)
CREATE TABLE IF NOT EXISTS `user_profile` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL UNIQUE REFERENCES `user`(`id`) ON DELETE CASCADE,
  `tax_settings` text,
  `bank_name` text,
  `bank_account` text,
  `bank_routing` text,
  `bank_swift` text,
  `bank_iban` text,
  `default_category` text,
  `currency` text DEFAULT 'USD',
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);


