-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `failed_login_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `login_cooldown_until` DATETIME(3) NULL,
    ADD COLUMN `security_locked_at` DATETIME(3) NULL,
    ADD COLUMN `security_lock_reason` ENUM('LOGIN_FAILURE_ESCALATION') NULL,
    ADD COLUMN `security_lock_version` INT UNSIGNED NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `users_login_cooldown_until_idx`
    ON `users`(`login_cooldown_until`);

-- CreateIndex
CREATE INDEX `users_security_locked_at_idx`
    ON `users`(`security_locked_at`);

-- CreateTable
CREATE TABLE `security_outbox_events` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `type` ENUM('ACCOUNT_LOCKED') NOT NULL,
    `lock_version` INT UNSIGNED NOT NULL,
    `recipient_email` VARCHAR(254) NOT NULL,
    `recipient_display_name` VARCHAR(100) NULL,
    `attempt_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NULL,
    `claimed_at` DATETIME(3) NULL,
    `claim_token` VARCHAR(64) NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `security_outbox_events_claim_token_key`
        (`claim_token`),

    UNIQUE INDEX `security_outbox_events_user_type_lock_version_key`
        (`user_id`, `type`, `lock_version`),

    INDEX `security_outbox_events_delivery_idx`
        (`sent_at`, `next_attempt_at`, `created_at`),

    INDEX `security_outbox_events_user_created_at_idx`
        (`user_id`, `created_at`),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `security_outbox_events`
    ADD CONSTRAINT `security_outbox_events_user_id_fkey`
    FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
