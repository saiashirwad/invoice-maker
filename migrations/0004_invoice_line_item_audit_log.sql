-- Migration: 0004_invoice_line_item_audit_log

-- Invoice table
CREATE TABLE IF NOT EXISTS `invoice` (
  `id` text PRIMARY KEY NOT NULL,
  `invoice_number` text NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `entity_id` text NOT NULL REFERENCES `entity`(`id`),
  `status` text NOT NULL DEFAULT 'draft',
  `currency_code` text NOT NULL DEFAULT 'USD',
  `invoice_date` integer NOT NULL,
  `service_date` integer,
  `due_date` integer,
  `bill_to` text NOT NULL,
  `client_tax_id` text,
  `company_details` text NOT NULL,
  `sender_tax_id` text,
  `bank_details` text,
  `notes` text,
  `internal_notes` text,
  `category` text,
  `tax_inclusive` integer NOT NULL DEFAULT 0,
  `tax_percent` integer,
  `subtotal_cents` integer NOT NULL DEFAULT 0,
  `total_tax_cents` integer NOT NULL DEFAULT 0,
  `grand_total_cents` integer NOT NULL DEFAULT 0,
  `payment_date` integer,
  `payment_method` text,
  `payment_reference` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `invoice_user_id_idx` ON `invoice`(`user_id`);
CREATE INDEX IF NOT EXISTS `invoice_entity_id_idx` ON `invoice`(`entity_id`);
CREATE INDEX IF NOT EXISTS `invoice_status_idx` ON `invoice`(`status`);
CREATE UNIQUE INDEX IF NOT EXISTS `invoice_number_unique` ON `invoice`(`invoice_number`);
CREATE INDEX IF NOT EXISTS `invoice_entity_status_idx` ON `invoice`(`entity_id`, `status`);

-- Line items table
CREATE TABLE IF NOT EXISTS `line_item` (
  `id` text PRIMARY KEY NOT NULL,
  `invoice_id` text NOT NULL REFERENCES `invoice`(`id`) ON DELETE CASCADE,
  `sort_index` integer NOT NULL DEFAULT 0,
  `description` text NOT NULL,
  `quantity` real NOT NULL DEFAULT 1,
  `unit_cost_cents` integer NOT NULL,
  `amount_cents` integer NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `line_item_invoice_id_idx` ON `line_item`(`invoice_id`);

-- Audit log table
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` text PRIMARY KEY NOT NULL,
  `action` text NOT NULL,
  `actor_id` text NOT NULL REFERENCES `user`(`id`),
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `details` text,
  `createdAt` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `audit_log_entity_idx` ON `audit_log`(`entity_type`, `entity_id`, `createdAt`);
CREATE INDEX IF NOT EXISTS `audit_log_action_idx` ON `audit_log`(`action`, `createdAt`);
CREATE INDEX IF NOT EXISTS `audit_log_actor_idx` ON `audit_log`(`actor_id`, `createdAt`);
