-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(30) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `attempts` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `exercise_id` VARCHAR(191) NOT NULL,
    `concept_id` VARCHAR(191) NULL,
    `technology_id` VARCHAR(191) NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `attempted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `duration_ms` INTEGER UNSIGNED NULL,
    `hints_used` INTEGER UNSIGNED NULL,

    INDEX `attempts_user_id_attempted_at_idx`(`user_id`, `attempted_at`),
    INDEX `attempts_session_id_idx`(`session_id`),
    INDEX `attempts_concept_id_idx`(`concept_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `completed_sessions` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,
    `topic_id` VARCHAR(191) NULL,
    `total_exercises` INTEGER UNSIGNED NOT NULL,
    `correct_exercises` INTEGER UNSIGNED NOT NULL,
    `duration_ms` INTEGER UNSIGNED NOT NULL,
    `hints_used` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT `completed_sessions_total_exercises_positive_chk` CHECK (`total_exercises` > 0),
    CONSTRAINT `completed_sessions_correct_not_above_total_chk` CHECK (`correct_exercises` <= `total_exercises`),
    INDEX `completed_sessions_user_id_completed_at_idx`(`user_id`, `completed_at`),
    INDEX `completed_sessions_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `concept_progress` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `concept_id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,
    `total_attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `correct_attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `completed_sessions` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `last_practiced_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT `concept_progress_correct_not_above_total_chk` CHECK (`correct_attempts` <= `total_attempts`),
    INDEX `concept_progress_user_id_last_practiced_at_idx`(`user_id`, `last_practiced_at`),
    INDEX `concept_progress_technology_id_idx`(`technology_id`),
    UNIQUE INDEX `concept_progress_user_id_concept_id_key`(`user_id`, `concept_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `completed_sessions` ADD CONSTRAINT `completed_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `concept_progress` ADD CONSTRAINT `concept_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
