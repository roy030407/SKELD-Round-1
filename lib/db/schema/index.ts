import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, unique, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by'),
}).enableRLS()

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  playerCode: text('player_code').notNull().unique(),
  firstName: text('first_name').notNull(),
  rollNumber: text('roll_number').notNull(),
  email: text('email'),
  isLeader: boolean('is_leader').notNull().default(false),
  registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  unqRollTeam: unique('players_roll_per_team').on(t.teamId, t.rollNumber),
})).enableRLS()

export const staffAccounts = pgTable('staff_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // admin, monitor, display
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}).enableRLS()

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id),
  staffId: uuid('staff_id').references(() => staffAccounts.id),
  role: text('role').notNull(),
  teamId: uuid('team_id').references(() => teams.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  // Server-enforced "one active session per player/staff" (REQUIREMENTS.md AUTH-02):
  // a partial unique index that only applies to non-revoked rows, so a
  // revoked-then-reinserted session never collides, but two simultaneously
  // active sessions for the same player/staff are rejected at the DB level.
  onePlayerActive: uniqueIndex('sessions_one_active_player')
    .on(t.playerId)
    .where(sql`${t.revokedAt} is null`),
  oneStaffActive: uniqueIndex('sessions_one_active_staff')
    .on(t.staffId)
    .where(sql`${t.revokedAt} is null`),
})).enableRLS()

export const registrationSettings = pgTable('registration_settings', {
  id: integer('id').primaryKey().default(1),
  isOpen: boolean('is_open').notNull().default(true),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lockedBy: uuid('locked_by').references(() => staffAccounts.id),
  quizLink: text('quiz_link').default('https://wayground.com/join?gc=940315&source=liveDashboard'),
  round1Declared: boolean('round1_declared').notNull().default(false),
  bombDefusalLink: text('bomb_defusal_link').default('https://vedant-jadhav-23.github.io/BombDefusalTask/'),
  bettingOpen: boolean('betting_open').notNull().default(false),
  betsSettled: boolean('bets_settled').notNull().default(false),
  // Admin-controlled reveal: the projector shows a holding screen until this
  // is flipped on, so standings can be shown at a chosen moment rather than
  // continuously updating live in front of the room.
  leaderboardVisible: boolean('leaderboard_visible').notNull().default(false),
}).enableRLS()

export const rateLimitCounters = pgTable('rate_limit_counters', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull(),
}, (t) => ({
  unqKeyWindow: unique().on(t.key, t.windowStart)
})).enableRLS()

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  responseBody: jsonb('response_body'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}).enableRLS()

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id'),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}).enableRLS()

export const checkIns = pgTable('check_ins', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').unique().notNull(),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).defaultNow(),
  checkedInBy: uuid('checked_in_by'),
}).enableRLS()

export const taskGates = pgTable('task_gates', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull(),
  taskNumber: integer('task_number').notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  openedBy: uuid('opened_by'),
}, (t) => ({
  unqTeamTask: unique().on(t.teamId, t.taskNumber)
})).enableRLS()

export const scoreEvents = pgTable('score_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull(),
  taskNumber: integer('task_number'),
  eventType: text('event_type'),
  points: integer('points').notNull(),
  idempotencyKey: text('idempotency_key').unique(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by'),
}).enableRLS()

export const bets = pgTable('bets', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').unique().notNull(),
  predictedRank: integer('predicted_rank').notNull(),
  placedAt: timestamp('placed_at', { withTimezone: true }).defaultNow(),
}).enableRLS()

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionNumber: integer('session_number').notNull(),
  status: text('status').notNull(),
}).enableRLS()

export const gameTables = pgTable('game_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameSessionId: uuid('game_session_id').notNull(),
  tableNumber: integer('table_number').notNull(),
}).enableRLS()

export const gameTablePlayers = pgTable('game_table_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull(),
  playerId: uuid('player_id').notNull(),
  originalTeamId: uuid('original_team_id').notNull(),
  word: text('word'),
  isImposter: boolean('is_imposter').notNull(),
  crewmateColor: text('crewmate_color'),
}, (t) => ({
  unqTablePlayer: unique().on(t.tableId, t.playerId)
})).enableRLS()

export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameTableId: uuid('game_table_id').notNull(),
  voterPlayerId: uuid('voter_player_id').notNull(),
  targetPlayerId: uuid('target_player_id').notNull(),
  round: integer('round').notNull(),
}, (t) => ({
  unqTableVoterRound: unique().on(t.gameTableId, t.voterPlayerId, t.round)
})).enableRLS()

export const taskSubmissions = pgTable('task_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull(),
  taskNumber: integer('task_number').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
  submittedBy: uuid('submitted_by'),
  submissionData: text('submission_data'),
}, (t) => ({
  unqTeamTaskSubmit: unique().on(t.teamId, t.taskNumber)
})).enableRLS()

export const words = pgTable('words', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: text('category').notNull(),
  crewWord: text('crew_word').notNull(),
  imposterWord: text('imposter_word').notNull(),
  isActive: boolean('is_active').notNull().default(true),
}).enableRLS()
