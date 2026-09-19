-- AlterTable
ALTER TABLE `exercise_sessions` ADD COLUMN `kind` ENUM('QUIZ', 'PRACTICE', 'CHECKPOINT') NOT NULL DEFAULT 'PRACTICE',
    ADD COLUMN `passing_percentage` TINYINT UNSIGNED NULL,
    ADD COLUMN `required_for_progression` BOOLEAN NOT NULL DEFAULT true,
    ADD CONSTRAINT `exercise_sessions_passing_percentage_range_chk`
        CHECK (
            `passing_percentage` IS NULL
            OR `passing_percentage` BETWEEN 0 AND 100
        ),
    ADD CONSTRAINT `exercise_sessions_quiz_passing_percentage_chk`
        CHECK (
            (
                `kind` = 'QUIZ'
                AND `passing_percentage` IS NOT NULL
            )
            OR (
                `kind` <> 'QUIZ'
                AND `passing_percentage` IS NULL
            )
        );

-- CreateTable
CREATE TABLE `concept_learning_progress` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `concept_id` VARCHAR(191) NOT NULL,
    `theory_completed_at` DATETIME(3) NULL,
    `quiz_passed_at` DATETIME(3) NULL,
    `practice_completed_at` DATETIME(3) NULL,
    `checkpoint_completed_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `concept_learning_progress_user_id_idx`(`user_id`),
    INDEX `concept_learning_progress_concept_id_idx`(`concept_id`),
    INDEX `concept_learning_progress_user_id_completed_at_idx`(`user_id`, `completed_at`),
    UNIQUE INDEX `concept_learning_progress_user_id_concept_id_key`(`user_id`, `concept_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `concept_learning_progress` ADD CONSTRAINT `concept_learning_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
