-- AlterTable
ALTER TABLE `exercise_sessions` ADD COLUMN `level_id` ENUM('FOUNDATION', 'DEEPENING', 'MASTERY') NOT NULL DEFAULT 'FOUNDATION';

-- CreateTable
CREATE TABLE `concept_learning_level_progress` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `concept_id` VARCHAR(191) NOT NULL,
    `level_id` ENUM('FOUNDATION', 'DEEPENING', 'MASTERY') NOT NULL,
    `theory_completed_at` DATETIME(3) NULL,
    `quiz_passed_at` DATETIME(3) NULL,
    `practice_completed_at` DATETIME(3) NULL,
    `checkpoint_completed_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `concept_learning_level_progress_user_id_idx`(`user_id`),
    INDEX `concept_learning_level_progress_concept_level_idx`(`concept_id`, `level_id`),
    INDEX `concept_learning_level_progress_user_completed_at_idx`(`user_id`, `completed_at`),
    UNIQUE INDEX `concept_learning_level_progress_user_concept_level_key`(`user_id`, `concept_id`, `level_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateIndex
CREATE INDEX `exercise_sessions_concept_level_position_idx` ON `exercise_sessions`(`concept_id`, `level_id`, `position`);

-- AddForeignKey
ALTER TABLE `concept_learning_level_progress` ADD CONSTRAINT `concept_learning_level_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
