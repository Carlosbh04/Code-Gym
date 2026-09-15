-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `refresh_token_digest` BINARY(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `rotated_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    CONSTRAINT `auth_sessions_expires_after_created_chk` CHECK (`expires_at` > `created_at`),
    CONSTRAINT `auth_sessions_rotated_not_before_created_chk` CHECK (`rotated_at` IS NULL OR `rotated_at` >= `created_at`),
    CONSTRAINT `auth_sessions_revoked_not_before_created_chk` CHECK (`revoked_at` IS NULL OR `revoked_at` >= `created_at`),
    UNIQUE INDEX `auth_sessions_refresh_token_digest_key`(`refresh_token_digest`),
    INDEX `auth_sessions_user_id_revoked_at_idx`(`user_id`, `revoked_at`),
    INDEX `auth_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
