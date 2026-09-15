CREATE TABLE `password_reset_challenges` (
  `id` VARCHAR(30) NOT NULL,
  `user_id` VARCHAR(30) NOT NULL,
  `challenge_nonce` BINARY(16) NOT NULL,
  `code_digest` BINARY(32) NOT NULL,
  `code_expires_at` DATETIME(3) NOT NULL,
  `attempt_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `verified_at` DATETIME(3) NULL,
  `reset_token_digest` BINARY(32) NULL,
  `reset_token_expires_at` DATETIME(3) NULL,
  `used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `password_reset_challenges_user_id_key`(`user_id`),
  UNIQUE INDEX `password_reset_challenges_reset_token_digest_key`(`reset_token_digest`),
  INDEX `password_reset_challenges_code_expires_at_idx`(`code_expires_at`),
  INDEX `password_reset_challenges_reset_token_expires_at_idx`(`reset_token_expires_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `password_reset_challenges_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
