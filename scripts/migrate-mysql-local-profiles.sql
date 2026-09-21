-- One-time, data-preserving migration for the production MySQL database.
--
-- Run only after creating a verified database backup. This keeps telegramId
-- as a nullable legacy column so the previous application build can still be
-- restored during the rollout window.

ALTER TABLE `User`
  ADD COLUMN `provider` VARCHAR(50) NOT NULL DEFAULT 'guest',
  ADD COLUMN `providerId` VARCHAR(255) NULL,
  ADD COLUMN `email` VARCHAR(255) NULL;

UPDATE `User`
SET
  `provider` = 'telegram',
  `providerId` = CONCAT('telegram_', `telegramId`)
WHERE `providerId` IS NULL;

ALTER TABLE `User`
  MODIFY COLUMN `providerId` VARCHAR(255) NOT NULL,
  MODIFY COLUMN `telegramId` VARCHAR(255) NULL,
  ADD UNIQUE INDEX `User_providerId_key` (`providerId`);

ALTER TABLE `GameRun`
  ADD COLUMN `nationalityFilter` VARCHAR(255) NULL;
