/*
  Warnings:

  - A unique constraint covering the columns `[training_run_id,exercise_id]` on the table `attempts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[training_run_id]` on the table `completed_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `attempts` ADD COLUMN `training_run_id` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `completed_sessions` ADD COLUMN `training_run_id` VARCHAR(30) NULL;

-- CreateTable
CREATE TABLE `training_runs` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,
    `topic_id` VARCHAR(191) NOT NULL,
    `concept_id` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    `total_exercises` INTEGER UNSIGNED NOT NULL,
    `answered_exercises` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `correct_exercises` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `duration_ms` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `hints_used` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `training_runs_user_id_started_at_idx`(`user_id`, `started_at`),
    INDEX `training_runs_user_id_status_idx`(`user_id`, `status`),
    INDEX `training_runs_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateIndex
CREATE INDEX `attempts_training_run_id_idx` ON `attempts`(`training_run_id`);

-- CreateIndex
CREATE UNIQUE INDEX `attempts_training_run_id_exercise_id_key` ON `attempts`(`training_run_id`, `exercise_id`);

-- CreateIndex
CREATE UNIQUE INDEX `completed_sessions_training_run_id_key` ON `completed_sessions`(`training_run_id`);

-- AddForeignKey
ALTER TABLE `training_runs` ADD CONSTRAINT `training_runs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_training_run_id_fkey` FOREIGN KEY (`training_run_id`) REFERENCES `training_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `completed_sessions` ADD CONSTRAINT `completed_sessions_training_run_id_fkey` FOREIGN KEY (`training_run_id`) REFERENCES `training_runs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
