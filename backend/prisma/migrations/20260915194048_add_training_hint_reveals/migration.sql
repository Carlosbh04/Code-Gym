-- CreateTable
CREATE TABLE `training_hint_reveals` (
    `id` VARCHAR(30) NOT NULL,
    `training_run_id` VARCHAR(30) NOT NULL,
    `exercise_id` VARCHAR(191) NOT NULL,
    `hint_index` INTEGER UNSIGNED NOT NULL,
    `revealed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `training_hint_reveals_run_exercise_idx`(`training_run_id`, `exercise_id`),
    UNIQUE INDEX `training_hint_reveals_run_exercise_index_key`(`training_run_id`, `exercise_id`, `hint_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `training_hint_reveals` ADD CONSTRAINT `training_hint_reveals_training_run_id_fkey` FOREIGN KEY (`training_run_id`) REFERENCES `training_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
