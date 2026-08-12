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
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS audit_channels JSONB NOT NULL DEFAULT '{}';
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS voice_channel_id TEXT;
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
CREATE TABLE IF NOT EXISTS fish_market_supply (
  fish_name TEXT PRIMARY KEY, rarity TEXT NOT NULL, caught_count INTEGER NOT NULL DEFAULT 0,
  base_value INTEGER NOT NULL DEFAULT 20, demand_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS fish_market_history (
  id BIGSERIAL PRIMARY KEY,
  fish_name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  demand_multiplier NUMERIC(5,2) NOT NULL,
  caught_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fish_market_history_fish_idx ON fish_market_history(fish_name, recorded_at DESC);
CREATE TABLE IF NOT EXISTS fish_items (
  user_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ, PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS fish_favorites (
  user_id TEXT NOT NULL,
  fish_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, fish_name)
);
CREATE INDEX IF NOT EXISTS fish_favorites_user_idx ON fish_favorites(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS curse_settings (
  guild_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  words TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS curse_warnings (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  warning_count INTEGER NOT NULL DEFAULT 0,
  last_warned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id, word)
);
CREATE TABLE IF NOT EXISTS curse_exempt_roles (
  guild_id TEXT NOT NULL, role_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, role_id)
);
CREATE INDEX IF NOT EXISTS curse_warnings_guild_idx ON curse_warnings(guild_id, last_warned_at DESC);
CREATE TABLE IF NOT EXISTS introduction_settings (
  guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
  template TEXT NOT NULL, panel_title TEXT NOT NULL, panel_message TEXT NOT NULL, reward_role_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE introduction_settings ADD COLUMN IF NOT EXISTS reward_role_id TEXT;
CREATE TABLE IF NOT EXISTS introduction_counts (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  introduction_message_id TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, user_id)
);
ALTER TABLE introduction_counts ADD COLUMN IF NOT EXISTS introduction_message_id TEXT;
CREATE TABLE IF NOT EXISTS protected_channels (
  guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, channel_id)
);
CREATE TABLE IF NOT EXISTS giveaways (
  id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, message_id TEXT,
  host_user_id TEXT NOT NULL, prize TEXT NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  winner_count INTEGER NOT NULL DEFAULT 1, required_role_id TEXT, emoji TEXT,
  status TEXT NOT NULL DEFAULT 'active', winner_user_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS giveaway_entries (
  giveaway_id BIGINT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (giveaway_id, user_id)
);
CREATE TABLE IF NOT EXISTS rules_settings (
  guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
  banner_url TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rules_sections (
  guild_id TEXT NOT NULL, section_number INTEGER NOT NULL, title TEXT NOT NULL,
  content TEXT NOT NULL, PRIMARY KEY (guild_id, section_number)
);
CREATE TABLE IF NOT EXISTS ticket_settings (
  guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
  ticket_category_id TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ticket_settings ADD COLUMN IF NOT EXISTS ticket_category_id TEXT;
CREATE TABLE IF NOT EXISTS ticket_access_roles (
  guild_id TEXT NOT NULL, role_id TEXT NOT NULL, PRIMARY KEY (guild_id, role_id)
);
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL, category TEXT NOT NULL, subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bump_timers (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, next_bump_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS bump_panel_settings (
  guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bump_reminders (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, remind_at TIMESTAMPTZ NOT NULL,
  notified BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS server_info_settings (
  guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
  banner_url TEXT, title TEXT NOT NULL DEFAULT 'SERVER INFO',
  description TEXT NOT NULL DEFAULT '', extra_info TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS server_info_staff_roles (
  guild_id TEXT NOT NULL, role_id TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (guild_id, role_id)
);
ALTER TABLE server_info_staff_roles ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
WITH staff_role_order AS (
  SELECT guild_id, role_id, ROW_NUMBER() OVER (PARTITION BY guild_id ORDER BY role_id) AS position
  FROM server_info_staff_roles
)
UPDATE server_info_staff_roles roles SET sort_order=ordered.position
FROM staff_role_order ordered
WHERE roles.guild_id=ordered.guild_id AND roles.role_id=ordered.role_id AND roles.sort_order=0;
CREATE TABLE IF NOT EXISTS member_profile_stats (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, message_count BIGINT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ, PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS guild_member_activity (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, chat_xp BIGINT NOT NULL DEFAULT 0,
  voice_seconds BIGINT NOT NULL DEFAULT 0, voice_started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS truth_or_dare_settings (
  guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auto_react_settings (
  guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, emojis JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id, channel_id)
);
CREATE INDEX IF NOT EXISTS guild_member_activity_xp_idx ON guild_member_activity(guild_id,chat_xp DESC);
CREATE INDEX IF NOT EXISTS guild_member_activity_voice_idx ON guild_member_activity(guild_id,voice_seconds DESC);
CREATE TABLE IF NOT EXISTS brain_faqs (
  id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS brain_faqs_guild_idx ON brain_faqs(guild_id,id);
CREATE TABLE IF NOT EXISTS brain_role_guides (
  guild_id TEXT NOT NULL, role_id TEXT NOT NULL, description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id,role_id)
);

`;

try { await pool.query(sql); console.log('Yachiyo database migration complete.'); }
finally { await pool.end(); }
