-- Fix: qrCode column was varchar(256) but QR data URLs are ~1-10KB
-- Remove unique constraint and widen to TEXT
ALTER TABLE `tickets` DROP INDEX `tickets_qrCode_unique`;
ALTER TABLE `tickets` MODIFY COLUMN `qrCode` TEXT;
