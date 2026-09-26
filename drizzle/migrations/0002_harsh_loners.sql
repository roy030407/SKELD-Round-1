ALTER TABLE "registration_settings" ADD COLUMN "quiz_link" text DEFAULT 'https://kahoot.it';--> statement-breakpoint
ALTER TABLE "registration_settings" ADD COLUMN "round1_declared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_settings" ADD COLUMN "betting_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_settings" ADD COLUMN "bets_settled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD COLUMN "submission_data" text;