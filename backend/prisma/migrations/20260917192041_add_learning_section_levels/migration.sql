-- AlterTable
ALTER TABLE `learning_sections` ADD COLUMN `level_id` ENUM('FOUNDATION', 'DEEPENING', 'MASTERY') NOT NULL DEFAULT 'FOUNDATION';

-- CreateIndex
CREATE INDEX `learning_sections_concept_level_position_idx` ON `learning_sections`(`concept_id`, `level_id`, `position`);
