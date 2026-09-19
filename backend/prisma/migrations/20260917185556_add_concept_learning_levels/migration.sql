-- CreateTable
CREATE TABLE `concept_learning_levels` (
    `id` VARCHAR(30) NOT NULL,
    `concept_id` VARCHAR(191) NOT NULL,
    `level_id` ENUM('FOUNDATION', 'DEEPENING', 'MASTERY') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `concept_learning_levels_concept_position_idx`(`concept_id`, `position`),
    UNIQUE INDEX `concept_learning_levels_concept_level_key`(`concept_id`, `level_id`),
    UNIQUE INDEX `concept_learning_levels_concept_position_key`(`concept_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `concept_learning_levels` ADD CONSTRAINT `concept_learning_levels_concept_id_fkey` FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
