import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

const sql = `
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY, prefix TEXT NOT NULL DEFAULT '.', timezone TEXT NOT NULL DEFAULT 'UTC',
  log_channel_id TEXT, moderation_log_channel_id TEXT, economy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS economy_users (
  user_id TEXT PRIMARY KEY, wallet BIGINT NOT NULL DEFAULT 0 CHECK (wallet >= 0), bank BIGINT NOT NULL DEFAULT 0 CHECK (bank >= 0),
  bank_capacity BIGINT NOT NULL DEFAULT 10000, last_daily TIMESTAMPTZ, last_work TIMESTAMPTZ, last_fish TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS economy_transactions (
  id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, amount BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS economy_transactions_user_idx ON economy_transactions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS moderation_cases (
  id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, target_user_id TEXT NOT NULL, moderator_user_id TEXT NOT NULL,
  action TEXT NOT NULL, reason TEXT, duration_seconds INTEGER, active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS moderation_cases_guild_idx ON moderation_cases(guild_id, created_at DESC);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, event_type TEXT NOT NULL, actor_user_id TEXT,
  target_id TEXT, data JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_guild_idx ON audit_logs(guild_id, created_at DESC);
CREATE TABLE IF NOT EXISTS fish_catches (
  id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, fish_name TEXT NOT NULL, rarity TEXT NOT NULL,
  value BIGINT NOT NULL, caught_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fish_catches_user_idx ON fish_catches(user_id, caught_at DESC);
CREATE TABLE IF NOT EXISTS fish_inventory (
  user_id TEXT NOT NULL, fish_name TEXT NOT NULL, rarity TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, fish_name)
);
`;

try { await pool.query(sql); console.log('Yachiyo database migration complete.'); }
finally { await pool.end(); }
