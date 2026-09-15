-- AlterTable
ALTER TABLE `completed_sessions` ADD COLUMN `concept_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `completed_sessions_concept_id_idx` ON `completed_sessions`(`concept_id`);
