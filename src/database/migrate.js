import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

const sql = `
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY, prefix TEXT NOT NULL DEFAULT '.', timezone TEXT NOT NULL DEFAULT 'UTC',
  log_channel_id TEXT, moderation_log_channel_id TEXT, confession_channel_id TEXT, fish_channel_id TEXT, economy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS confession_channel_id TEXT;
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS fish_channel_id TEXT;
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
CREATE TABLE IF NOT EXISTS confessions (
  id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, author_user_id TEXT NOT NULL,
  content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS confessions_guild_idx ON confessions(guild_id, id DESC);
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS message_id TEXT;
CREATE TABLE IF NOT EXISTS confession_replies (
  id BIGSERIAL PRIMARY KEY, confession_id BIGINT NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL, author_user_id TEXT NOT NULL, mode TEXT NOT NULL, content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS confession_replies_confession_idx ON confession_replies(confession_id, id DESC);
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS confession_number INTEGER;
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY guild_id ORDER BY id) AS number
  FROM confessions
)
UPDATE confessions c SET confession_number=number FROM numbered n WHERE c.id=n.id AND c.confession_number IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS confessions_guild_number_idx ON confessions(guild_id, confession_number);
CREATE TABLE IF NOT EXISTS confession_counters (
  guild_id TEXT PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);
INSERT INTO confession_counters (guild_id, next_number)
SELECT guild_id, MAX(confession_number) + 1
FROM confessions
GROUP BY guild_id
ON CONFLICT (guild_id) DO UPDATE SET next_number=GREATEST(confession_counters.next_number, EXCLUDED.next_number);
CREATE TABLE IF NOT EXISTS fish_inventory (
  user_id TEXT NOT NULL, fish_name TEXT NOT NULL, rarity TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, fish_name)
);
CREATE TABLE IF NOT EXISTS fish_rods (
  user_id TEXT PRIMARY KEY, level INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE fish_rods ADD COLUMN IF NOT EXISTS upgrade_level INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS fish_items (
  user_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ, PRIMARY KEY (user_id, item_id)
);
`;

try { await pool.query(sql); console.log('Yachiyo database migration complete.'); }
finally { await pool.end(); }
