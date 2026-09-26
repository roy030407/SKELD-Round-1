DROP TABLE "kahoot_staging" CASCADE;--> statement-breakpoint
ALTER TABLE "registration_settings" ALTER COLUMN "quiz_link" SET DEFAULT 'https://wayground.com/join?gc=940315&source=liveDashboard';--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_one_active_player" ON "sessions" USING btree ("player_id") WHERE "sessions"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_one_active_staff" ON "sessions" USING btree ("staff_id") WHERE "sessions"."revoked_at" is null;