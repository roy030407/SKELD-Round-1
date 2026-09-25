CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"predicted_rank" integer NOT NULL,
	"placed_at" timestamp DEFAULT now(),
	CONSTRAINT "bets_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"checked_in_at" timestamp DEFAULT now(),
	"checked_in_by" uuid,
	CONSTRAINT "check_ins_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_number" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_table_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"original_team_id" uuid NOT NULL,
	"word" text NOT NULL,
	"is_imposter" boolean DEFAULT false NOT NULL,
	"crewmate_color" text,
	CONSTRAINT "game_table_player_unique" UNIQUE("table_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "game_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"table_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"response_body" text,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	CONSTRAINT "idempotency_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "kahoot_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"kahoot_nickname" text NOT NULL,
	"matched_by_admin" uuid,
	"committed" boolean DEFAULT false NOT NULL,
	"points" integer
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"player_code" text NOT NULL,
	"first_name" text NOT NULL,
	"roll_number" text NOT NULL,
	"email" text,
	"is_leader" boolean DEFAULT false NOT NULL,
	"registered_at" timestamp DEFAULT now(),
	CONSTRAINT "players_player_code_unique" UNIQUE("player_code"),
	CONSTRAINT "players_team_roll_unique" UNIQUE("team_id","roll_number")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_key_window" UNIQUE("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "registration_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp,
	"locked_by" uuid
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"task_number" integer,
	"event_type" text NOT NULL,
	"points" integer NOT NULL,
	"idempotency_key" text,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "score_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid,
	"staff_id" uuid,
	"role" text NOT NULL,
	"team_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "sessions_one_active_player" UNIQUE("player_id"),
	CONSTRAINT "sessions_one_active_staff" UNIQUE("staff_id"),
	CONSTRAINT "sessions_exactly_one" CHECK (("sessions"."player_id" IS NOT NULL)::int + ("sessions"."staff_id" IS NOT NULL)::int = 1)
);
--> statement-breakpoint
CREATE TABLE "staff_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "staff_accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "task_gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"task_number" integer NOT NULL,
	"opened_at" timestamp,
	"closed_at" timestamp,
	"opened_by" uuid,
	CONSTRAINT "task_gates_team_task" UNIQUE("team_id","task_number")
);
--> statement-breakpoint
CREATE TABLE "task_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"task_number" integer NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	"submitted_by" uuid,
	CONSTRAINT "task_submissions_team_task" UNIQUE("team_id","task_number")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "teams_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_table_id" uuid NOT NULL,
	"voter_player_id" uuid NOT NULL,
	"target_player_id" uuid,
	"round" integer NOT NULL,
	CONSTRAINT "votes_table_voter_round" UNIQUE("game_table_id","voter_player_id","round")
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"crew_word" text NOT NULL,
	"imposter_word" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checked_in_by_staff_accounts_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_table_players" ADD CONSTRAINT "game_table_players_table_id_game_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."game_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_table_players" ADD CONSTRAINT "game_table_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_table_players" ADD CONSTRAINT "game_table_players_original_team_id_teams_id_fk" FOREIGN KEY ("original_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_game_session_id_game_sessions_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kahoot_staging" ADD CONSTRAINT "kahoot_staging_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kahoot_staging" ADD CONSTRAINT "kahoot_staging_matched_by_admin_staff_accounts_id_fk" FOREIGN KEY ("matched_by_admin") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_settings" ADD CONSTRAINT "registration_settings_locked_by_staff_accounts_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_created_by_staff_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_gates" ADD CONSTRAINT "task_gates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_gates" ADD CONSTRAINT "task_gates_opened_by_staff_accounts_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_submitted_by_staff_accounts_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_staff_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_game_table_id_game_tables_id_fk" FOREIGN KEY ("game_table_id") REFERENCES "public"."game_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_player_id_players_id_fk" FOREIGN KEY ("voter_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_target_player_id_players_id_fk" FOREIGN KEY ("target_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "players_code_idx" ON "players" USING btree ("player_code");--> statement-breakpoint
CREATE INDEX "staff_username_idx" ON "staff_accounts" USING btree ("username");--> statement-breakpoint
CREATE INDEX "teams_code_idx" ON "teams" USING btree ("code");--> statement-breakpoint
-- Enable RLS on all tables
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_table_players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game_tables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kahoot_staging" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limit_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "registration_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "score_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_gates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "words" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Deny all by default (service role bypasses RLS)
CREATE POLICY "deny_all_audit_log" ON "audit_log" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_bets" ON "bets" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_check_ins" ON "check_ins" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_game_sessions" ON "game_sessions" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_game_table_players" ON "game_table_players" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_game_tables" ON "game_tables" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_idempotency_keys" ON "idempotency_keys" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_kahoot_staging" ON "kahoot_staging" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_players" ON "players" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_rate_limit_counters" ON "rate_limit_counters" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_registration_settings" ON "registration_settings" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_score_events" ON "score_events" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_sessions" ON "sessions" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_staff_accounts" ON "staff_accounts" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_task_gates" ON "task_gates" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_task_submissions" ON "task_submissions" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_teams" ON "teams" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_votes" ON "votes" FOR ALL USING (false);--> statement-breakpoint
CREATE POLICY "deny_all_words" ON "words" FOR ALL USING (false);