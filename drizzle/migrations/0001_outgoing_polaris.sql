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
ALTER TABLE "game_table_players" DROP CONSTRAINT "game_table_player_unique";--> statement-breakpoint
ALTER TABLE "players" DROP CONSTRAINT "players_team_roll_unique";--> statement-breakpoint
ALTER TABLE "rate_limit_counters" DROP CONSTRAINT "rate_limit_key_window";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_one_active_player";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_one_active_staff";--> statement-breakpoint
ALTER TABLE "task_gates" DROP CONSTRAINT "task_gates_team_task";--> statement-breakpoint
ALTER TABLE "task_submissions" DROP CONSTRAINT "task_submissions_team_task";--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT "votes_table_voter_round";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_exactly_one";--> statement-breakpoint
ALTER TABLE "bets" DROP CONSTRAINT "bets_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "check_ins" DROP CONSTRAINT "check_ins_player_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "check_ins" DROP CONSTRAINT "check_ins_checked_in_by_staff_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "game_table_players" DROP CONSTRAINT "game_table_players_table_id_game_tables_id_fk";
--> statement-breakpoint
ALTER TABLE "game_table_players" DROP CONSTRAINT "game_table_players_player_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "game_table_players" DROP CONSTRAINT "game_table_players_original_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "game_tables" DROP CONSTRAINT "game_tables_game_session_id_game_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "kahoot_staging" DROP CONSTRAINT "kahoot_staging_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "kahoot_staging" DROP CONSTRAINT "kahoot_staging_matched_by_admin_staff_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "players" DROP CONSTRAINT "players_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "score_events" DROP CONSTRAINT "score_events_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "score_events" DROP CONSTRAINT "score_events_created_by_staff_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_player_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_staff_id_staff_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "task_gates" DROP CONSTRAINT "task_gates_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "task_gates" DROP CONSTRAINT "task_gates_opened_by_staff_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "task_submissions" DROP CONSTRAINT "task_submissions_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "task_submissions" DROP CONSTRAINT "task_submissions_submitted_by_staff_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_created_by_staff_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT "votes_game_table_id_game_tables_id_fk";
--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT "votes_voter_player_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT "votes_target_player_id_players_id_fk";
--> statement-breakpoint
DROP INDEX "players_code_idx";--> statement-breakpoint
DROP INDEX "staff_username_idx";--> statement-breakpoint
DROP INDEX "teams_code_idx";--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "old_value" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "new_value" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "placed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "placed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "check_ins" ALTER COLUMN "checked_in_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "check_ins" ALTER COLUMN "checked_in_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_table_players" ALTER COLUMN "word" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_table_players" ALTER COLUMN "is_imposter" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "response_body" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kahoot_staging" ALTER COLUMN "team_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "kahoot_staging" ALTER COLUMN "matched_by_admin" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "kahoot_staging" ALTER COLUMN "matched_by_admin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "registered_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "registered_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "rate_limit_counters" ALTER COLUMN "window_start" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rate_limit_counters" ALTER COLUMN "count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "registration_settings" ALTER COLUMN "locked_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "score_events" ALTER COLUMN "event_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "score_events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "score_events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "revoked_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff_accounts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff_accounts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "task_gates" ALTER COLUMN "opened_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_gates" ALTER COLUMN "closed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_submissions" ALTER COLUMN "submitted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_submissions" ALTER COLUMN "submitted_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "target_player_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "kahoot_staging" DROP COLUMN "points";--> statement-breakpoint
ALTER TABLE "game_table_players" ADD CONSTRAINT "game_table_players_table_id_player_id_unique" UNIQUE("table_id","player_id");--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_roll_per_team" UNIQUE("team_id","roll_number");--> statement-breakpoint
ALTER TABLE "rate_limit_counters" ADD CONSTRAINT "rate_limit_counters_key_window_start_unique" UNIQUE("key","window_start");--> statement-breakpoint
ALTER TABLE "task_gates" ADD CONSTRAINT "task_gates_team_id_task_number_unique" UNIQUE("team_id","task_number");--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_team_id_task_number_unique" UNIQUE("team_id","task_number");--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_game_table_id_voter_player_id_round_unique" UNIQUE("game_table_id","voter_player_id","round");