-- AlterTable
ALTER TABLE `auth_sessions` ADD COLUMN `remembered` BOOLEAN NOT NULL DEFAULT true;
