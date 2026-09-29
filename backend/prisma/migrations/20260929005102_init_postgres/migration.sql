-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('movie', 'tv');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'synced', 'error');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('trailer', 'teaser', 'clip');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('poster', 'backdrop', 'logo');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('email', 'google', 'apple');

-- CreateEnum
CREATE TYPE "RegionSource" AS ENUM ('detected', 'manual');

-- CreateTable
CREATE TABLE "movies" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "imdb_id" TEXT,
    "title" TEXT NOT NULL,
    "original_title" TEXT,
    "overview" TEXT,
    "release_date" TIMESTAMP(3),
    "runtime" INTEGER,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "poster" TEXT,
    "poster_source" TEXT NOT NULL DEFAULT 'tmdb',
    "backdrop" TEXT,
    "backdrop_source" TEXT NOT NULL DEFAULT 'tmdb',
    "original_language" TEXT,
    "status" TEXT,
    "last_sync" TIMESTAMP(3),
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "last_error" TEXT,
    "last_media_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_shows" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "imdb_id" TEXT,
    "title" TEXT NOT NULL,
    "original_title" TEXT,
    "overview" TEXT,
    "seasons" INTEGER,
    "episodes" INTEGER,
    "first_air_date" TIMESTAMP(3),
    "last_air_date" TIMESTAMP(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "poster" TEXT,
    "poster_source" TEXT NOT NULL DEFAULT 'tmdb',
    "backdrop" TEXT,
    "backdrop_source" TEXT NOT NULL DEFAULT 'tmdb',
    "original_language" TEXT,
    "status" TEXT,
    "last_sync" TIMESTAMP(3),
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "last_error" TEXT,
    "last_media_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_genres" (
    "movie_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "movie_genres_pkey" PRIMARY KEY ("movie_id","genre_id")
);

-- CreateTable
CREATE TABLE "tv_genres" (
    "tv_show_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "tv_genres_pkey" PRIMARY KEY ("tv_show_id","genre_id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "color" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streaming_links" (
    "id" SERIAL NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "provider_content_id" TEXT,
    "provider_url" TEXT,
    "android_deep_link" TEXT,
    "ios_universal_link" TEXT,
    "country" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "last_checked" TIMESTAMP(3),

    CONSTRAINT "streaming_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cast_members" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT,
    "photo_source" TEXT NOT NULL DEFAULT 'tmdb',

    CONSTRAINT "cast_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_cast" (
    "id" SERIAL NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "character" TEXT,
    "order" INTEGER,

    CONSTRAINT "content_cast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" SERIAL NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "type" "VideoType" NOT NULL,
    "site" TEXT NOT NULL DEFAULT 'YouTube',
    "youtube_id" TEXT NOT NULL,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "type" "ImageType" NOT NULL,
    "file_path" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'tmdb',
    "width" INTEGER,
    "height" INTEGER,
    "language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "similar_content" (
    "id" SERIAL NOT NULL,
    "content_a_type" "ContentType" NOT NULL,
    "content_a_id" INTEGER NOT NULL,
    "content_b_type" "ContentType" NOT NULL,
    "content_b_id" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "similar_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "country" TEXT,
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'email',
    "provider_id" TEXT,
    "notify_new_releases" BOOLEAN NOT NULL DEFAULT true,
    "notify_comments" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_regions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "source" "RegionSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ratings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_comments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "parent_id" INTEGER,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lists" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_list_items" (
    "id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_views" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_availability" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,

    CONSTRAINT "platform_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "movies_tmdb_id_key" ON "movies"("tmdb_id");

-- CreateIndex
CREATE INDEX "movies_popularity_idx" ON "movies"("popularity");

-- CreateIndex
CREATE INDEX "movies_release_date_idx" ON "movies"("release_date");

-- CreateIndex
CREATE UNIQUE INDEX "tv_shows_tmdb_id_key" ON "tv_shows"("tmdb_id");

-- CreateIndex
CREATE INDEX "tv_shows_popularity_idx" ON "tv_shows"("popularity");

-- CreateIndex
CREATE INDEX "tv_shows_first_air_date_idx" ON "tv_shows"("first_air_date");

-- CreateIndex
CREATE UNIQUE INDEX "genres_tmdb_id_key" ON "genres"("tmdb_id");

-- CreateIndex
CREATE INDEX "movie_genres_genre_id_idx" ON "movie_genres"("genre_id");

-- CreateIndex
CREATE INDEX "tv_genres_genre_id_idx" ON "tv_genres"("genre_id");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_tmdb_id_key" ON "platforms"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_slug_key" ON "platforms"("slug");

-- CreateIndex
CREATE INDEX "streaming_links_content_type_content_id_idx" ON "streaming_links"("content_type", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "streaming_links_content_type_content_id_platform_id_country_key" ON "streaming_links"("content_type", "content_id", "platform_id", "country");

-- CreateIndex
CREATE UNIQUE INDEX "cast_members_tmdb_id_key" ON "cast_members"("tmdb_id");

-- CreateIndex
CREATE INDEX "content_cast_content_type_content_id_idx" ON "content_cast"("content_type", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_cast_content_type_content_id_actor_id_key" ON "content_cast"("content_type", "content_id", "actor_id");

-- CreateIndex
CREATE INDEX "videos_content_type_content_id_idx" ON "videos"("content_type", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "videos_content_type_content_id_youtube_id_key" ON "videos"("content_type", "content_id", "youtube_id");

-- CreateIndex
CREATE INDEX "images_content_type_content_id_type_idx" ON "images"("content_type", "content_id", "type");

-- CreateIndex
CREATE INDEX "similar_content_content_a_type_content_a_id_idx" ON "similar_content"("content_a_type", "content_a_id");

-- CreateIndex
CREATE UNIQUE INDEX "similar_content_content_a_type_content_a_id_content_b_type__key" ON "similar_content"("content_a_type", "content_a_id", "content_b_type", "content_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_provider_id_key" ON "users"("auth_provider", "provider_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "user_regions_user_id_idx" ON "user_regions"("user_id");

-- CreateIndex
CREATE INDEX "user_ratings_content_type_content_id_idx" ON "user_ratings"("content_type", "content_id");

-- CreateIndex
CREATE INDEX "user_ratings_user_id_idx" ON "user_ratings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ratings_user_id_content_type_content_id_key" ON "user_ratings"("user_id", "content_type", "content_id");

-- CreateIndex
CREATE INDEX "user_comments_content_type_content_id_idx" ON "user_comments"("content_type", "content_id");

-- CreateIndex
CREATE INDEX "user_comments_user_id_idx" ON "user_comments"("user_id");

-- CreateIndex
CREATE INDEX "user_favorites_user_id_idx" ON "user_favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_content_type_content_id_key" ON "user_favorites"("user_id", "content_type", "content_id");

-- CreateIndex
CREATE INDEX "user_lists_user_id_idx" ON "user_lists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_list_items_list_id_content_type_content_id_key" ON "user_list_items"("list_id", "content_type", "content_id");

-- CreateIndex
CREATE INDEX "user_views_user_id_idx" ON "user_views"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_views_user_id_content_type_content_id_key" ON "user_views"("user_id", "content_type", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "platform_availability_platform_id_country_id_key" ON "platform_availability"("platform_id", "country_id");

-- AddForeignKey
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_genres" ADD CONSTRAINT "tv_genres_tv_show_id_fkey" FOREIGN KEY ("tv_show_id") REFERENCES "tv_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_genres" ADD CONSTRAINT "tv_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaming_links" ADD CONSTRAINT "streaming_links_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_cast" ADD CONSTRAINT "content_cast_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "cast_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_regions" ADD CONSTRAINT "user_regions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comments" ADD CONSTRAINT "user_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comments" ADD CONSTRAINT "user_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "user_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lists" ADD CONSTRAINT "user_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_items" ADD CONSTRAINT "user_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_views" ADD CONSTRAINT "user_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_availability" ADD CONSTRAINT "platform_availability_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_availability" ADD CONSTRAINT "platform_availability_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
