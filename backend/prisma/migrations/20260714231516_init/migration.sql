-- CreateTable
CREATE TABLE `movies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdb_id` INTEGER NOT NULL,
    `imdb_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `original_title` VARCHAR(191) NULL,
    `overview` TEXT NULL,
    `release_date` DATETIME(3) NULL,
    `runtime` INTEGER NULL,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `popularity` DOUBLE NOT NULL DEFAULT 0,
    `poster` VARCHAR(191) NULL,
    `poster_source` VARCHAR(191) NOT NULL DEFAULT 'tmdb',
    `backdrop` VARCHAR(191) NULL,
    `backdrop_source` VARCHAR(191) NOT NULL DEFAULT 'tmdb',
    `original_language` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `last_sync` DATETIME(3) NULL,
    `sync_status` ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'pending',
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `movies_tmdb_id_key`(`tmdb_id`),
    INDEX `movies_popularity_idx`(`popularity`),
    INDEX `movies_release_date_idx`(`release_date`),
    FULLTEXT INDEX `movies_title_original_title_idx`(`title`, `original_title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tv_shows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdb_id` INTEGER NOT NULL,
    `imdb_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `original_title` VARCHAR(191) NULL,
    `overview` TEXT NULL,
    `seasons` INTEGER NULL,
    `episodes` INTEGER NULL,
    `first_air_date` DATETIME(3) NULL,
    `last_air_date` DATETIME(3) NULL,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `popularity` DOUBLE NOT NULL DEFAULT 0,
    `poster` VARCHAR(191) NULL,
    `poster_source` VARCHAR(191) NOT NULL DEFAULT 'tmdb',
    `backdrop` VARCHAR(191) NULL,
    `backdrop_source` VARCHAR(191) NOT NULL DEFAULT 'tmdb',
    `original_language` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `last_sync` DATETIME(3) NULL,
    `sync_status` ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'pending',
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tv_shows_tmdb_id_key`(`tmdb_id`),
    INDEX `tv_shows_popularity_idx`(`popularity`),
    INDEX `tv_shows_first_air_date_idx`(`first_air_date`),
    FULLTEXT INDEX `tv_shows_title_original_title_idx`(`title`, `original_title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `genres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdb_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `genres_tmdb_id_key`(`tmdb_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movie_genres` (
    `movie_id` INTEGER NOT NULL,
    `genre_id` INTEGER NOT NULL,

    INDEX `movie_genres_genre_id_idx`(`genre_id`),
    PRIMARY KEY (`movie_id`, `genre_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tv_genres` (
    `tv_show_id` INTEGER NOT NULL,
    `genre_id` INTEGER NOT NULL,

    INDEX `tv_genres_genre_id_idx`(`genre_id`),
    PRIMARY KEY (`tv_show_id`, `genre_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platforms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdb_id` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `platforms_tmdb_id_key`(`tmdb_id`),
    UNIQUE INDEX `platforms_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `streaming_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content_type` ENUM('movie', 'tv') NOT NULL,
    `content_id` INTEGER NOT NULL,
    `platform_id` INTEGER NOT NULL,
    `provider_content_id` VARCHAR(191) NULL,
    `provider_url` TEXT NULL,
    `android_deep_link` TEXT NULL,
    `ios_universal_link` TEXT NULL,
    `country` VARCHAR(191) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `last_checked` DATETIME(3) NULL,

    INDEX `streaming_links_content_type_content_id_idx`(`content_type`, `content_id`),
    UNIQUE INDEX `streaming_links_content_type_content_id_platform_id_country_key`(`content_type`, `content_id`, `platform_id`, `country`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cast_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdb_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `photo` VARCHAR(191) NULL,
    `photo_source` VARCHAR(191) NOT NULL DEFAULT 'tmdb',

    UNIQUE INDEX `cast_members_tmdb_id_key`(`tmdb_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_cast` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content_type` ENUM('movie', 'tv') NOT NULL,
    `content_id` INTEGER NOT NULL,
    `actor_id` INTEGER NOT NULL,
    `character` VARCHAR(191) NULL,
    `order` INTEGER NULL,

    INDEX `content_cast_content_type_content_id_idx`(`content_type`, `content_id`),
    UNIQUE INDEX `content_cast_content_type_content_id_actor_id_key`(`content_type`, `content_id`, `actor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `videos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content_type` ENUM('movie', 'tv') NOT NULL,
    `content_id` INTEGER NOT NULL,
    `type` ENUM('trailer', 'teaser', 'clip') NOT NULL,
    `site` VARCHAR(191) NOT NULL DEFAULT 'YouTube',
    `youtube_id` VARCHAR(191) NOT NULL,
    `official` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `videos_content_type_content_id_idx`(`content_type`, `content_id`),
    UNIQUE INDEX `videos_content_type_content_id_youtube_id_key`(`content_type`, `content_id`, `youtube_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content_type` ENUM('movie', 'tv') NOT NULL,
    `content_id` INTEGER NOT NULL,
    `type` ENUM('poster', 'backdrop', 'logo') NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'tmdb',
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `language` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `images_content_type_content_id_type_idx`(`content_type`, `content_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `similar_content` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content_a_type` ENUM('movie', 'tv') NOT NULL,
    `content_a_id` INTEGER NOT NULL,
    `content_b_type` ENUM('movie', 'tv') NOT NULL,
    `content_b_id` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `similar_content_content_a_type_content_a_id_idx`(`content_a_type`, `content_a_id`),
    UNIQUE INDEX `similar_content_content_a_type_content_a_id_content_b_type_c_key`(`content_a_type`, `content_a_id`, `content_b_type`, `content_b_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `movie_genres` ADD CONSTRAINT `movie_genres_movie_id_fkey` FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_genres` ADD CONSTRAINT `movie_genres_genre_id_fkey` FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tv_genres` ADD CONSTRAINT `tv_genres_tv_show_id_fkey` FOREIGN KEY (`tv_show_id`) REFERENCES `tv_shows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tv_genres` ADD CONSTRAINT `tv_genres_genre_id_fkey` FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `streaming_links` ADD CONSTRAINT `streaming_links_platform_id_fkey` FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_cast` ADD CONSTRAINT `content_cast_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `cast_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
