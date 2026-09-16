-- AlterTable
ALTER TABLE `auth_sessions` ADD COLUMN `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
