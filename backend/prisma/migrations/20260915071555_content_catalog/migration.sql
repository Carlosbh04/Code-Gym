-- CreateTable
CREATE TABLE `technologies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `technologies_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topics` (
    `id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `topics_technology_position_idx`(`technology_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `concepts` (
    `id` VARCHAR(191) NOT NULL,
    `topic_id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `content_markdown` LONGTEXT NULL,
    `position` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `concepts_topic_position_idx`(`topic_id`, `position`),
    INDEX `concepts_technology_id_idx`(`technology_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_sections` (
    `id` VARCHAR(30) NOT NULL,
    `concept_id` VARCHAR(191) NOT NULL,
    `type` ENUM('INTRO', 'EXPLANATION', 'KEY_POINT', 'WARNING', 'OBJECTIVES', 'CODE', 'COMPARISON', 'QUICK_CHECK') NOT NULL,
    `title` VARCHAR(200) NULL,
    `content` JSON NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `learning_sections_concept_position_idx`(`concept_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `concept_id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `difficulty` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL,
    `version` VARCHAR(30) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UPDATED', 'DEPRECATED', 'LEGACY') NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exercise_sessions_concept_position_idx`(`concept_id`, `position`),
    INDEX `exercise_sessions_technology_id_idx`(`technology_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_steps` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `type` ENUM('CODE_READING', 'PREDICT_OUTPUT', 'FIND_ERROR', 'FIX_CODE') NOT NULL,
    `prompt` TEXT NOT NULL,
    `code` LONGTEXT NULL,
    `language` VARCHAR(50) NULL,
    `options` JSON NULL,
    `error_lines` JSON NULL,
    `error_type` VARCHAR(100) NULL,
    `test_cases` JSON NULL,
    `expected_patterns` JSON NULL,
    `explanation` TEXT NOT NULL,
    `hints` JSON NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exercise_steps_session_position_idx`(`session_id`, `position`),
    PRIMARY KEY (`session_id`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `topics` ADD CONSTRAINT `topics_technology_id_fkey` FOREIGN KEY (`technology_id`) REFERENCES `technologies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `concepts` ADD CONSTRAINT `concepts_topic_id_fkey` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning_sections` ADD CONSTRAINT `learning_sections_concept_id_fkey` FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercise_sessions` ADD CONSTRAINT `exercise_sessions_concept_id_fkey` FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercise_steps` ADD CONSTRAINT `exercise_steps_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `exercise_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
