-- AlterTable
ALTER TABLE `movies` ADD COLUMN `last_media_sync` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `tv_shows` ADD COLUMN `last_media_sync` DATETIME(3) NULL;
