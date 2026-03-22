-- Migration: 0003_user_profile_address_and_taxid
-- Add structured address and tax ID fields to user_profile

ALTER TABLE `user_profile` ADD COLUMN `tax_id` text;
ALTER TABLE `user_profile` ADD COLUMN `address_line_1` text;
ALTER TABLE `user_profile` ADD COLUMN `address_line_2` text;
ALTER TABLE `user_profile` ADD COLUMN `city` text;
ALTER TABLE `user_profile` ADD COLUMN `state` text;
ALTER TABLE `user_profile` ADD COLUMN `postal_code` text;
ALTER TABLE `user_profile` ADD COLUMN `country` text;
