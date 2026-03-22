-- Migration: 0005_invoice_number_sequence
-- Tracks auto-incrementing invoice number per user

CREATE TABLE IF NOT EXISTS `invoice_number_sequence` (
  `user_id` text PRIMARY KEY REFERENCES `user`(`id`) ON DELETE CASCADE,
  `next_number` integer NOT NULL DEFAULT 1
);
