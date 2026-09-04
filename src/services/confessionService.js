import { query } from '../database/db.js';

export async function createConfession({ guildId, authorId, content }) {
  const result = await query(
    `WITH next_number AS (
       INSERT INTO confession_counters (guild_id, next_number)
       VALUES ($1, 2)
       ON CONFLICT (guild_id) DO UPDATE SET next_number=confession_counters.next_number+1
       RETURNING next_number - 1 AS confession_number
     )
     INSERT INTO confessions (guild_id, confession_number, author_user_id, content)
     SELECT $1, confession_number, $2, $3 FROM next_number
     RETURNING id, confession_number, created_at`,
    [guildId, authorId, content]
  );
  return result.rows[0];
}

export async function recentConfessions(guildId, limit = 25) {
  const result = await query(
    'SELECT id, author_user_id, content, created_at FROM confessions WHERE guild_id=$1 ORDER BY id DESC LIMIT $2',
    [guildId, limit]
  );
  return result.rows;
}

// confession_counters.next_number is the number the next confession will be given.
export async function getConfessionNextNumber(guildId) {
  const result = await query('SELECT next_number FROM confession_counters WHERE guild_id=$1', [guildId]);
  return result.rows[0]?.next_number ?? 1;
}

// The highest number already used, so a caller can avoid colliding with it. There is a unique index
// on (guild_id, confession_number), so a collision would make the next confession fail to post.
export async function highestConfessionNumber(guildId) {
  const result = await query('SELECT MAX(confession_number) AS highest FROM confessions WHERE guild_id=$1', [guildId]);
  return result.rows[0]?.highest ?? null;
}

export async function setConfessionStartNumber(guildId, startNumber) {
  await query(
    `INSERT INTO confession_counters (guild_id, next_number) VALUES ($1,$2)
     ON CONFLICT (guild_id) DO UPDATE SET next_number=EXCLUDED.next_number`,
    [guildId, startNumber]
  );
}

export async function setConfessionChannel(guildId, channelId) {
  await query(
    'INSERT INTO guild_settings (guild_id, confession_channel_id) VALUES ($1,$2) ON CONFLICT (guild_id) DO UPDATE SET confession_channel_id=$2, updated_at=NOW()',
    [guildId, channelId]
  );
}

export async function getConfessionChannel(guildId) {
  const result = await query('SELECT confession_channel_id FROM guild_settings WHERE guild_id=$1', [guildId]);
  return result.rows[0]?.confession_channel_id ?? null;
}

export async function attachConfessionMessage(id, channelId, messageId) {
  await query('UPDATE confessions SET channel_id=$1,message_id=$2 WHERE id=$3',[channelId,messageId,id]);
}
export async function getConfession(id, guildId) {
  const result=await query('SELECT id,guild_id,author_user_id,content,channel_id,message_id FROM confessions WHERE id=$1 AND guild_id=$2',[id,guildId]);
  return result.rows[0] ?? null;
}
export async function createConfessionReply({confessionId,guildId,authorId,mode,content}) {
  const result=await query('INSERT INTO confession_replies (confession_id,guild_id,author_user_id,mode,content) VALUES ($1,$2,$3,$4,$5) RETURNING id,created_at',[confessionId,guildId,authorId,mode,content]);
  return result.rows[0];
}
export async function recentConfessionReplies(guildId, limit=50) {
  const result=await query('SELECT r.id,r.confession_id,r.author_user_id,r.mode,r.content,r.created_at,c.author_user_id AS confession_author_id FROM confession_replies r JOIN confessions c ON c.id=r.confession_id WHERE r.guild_id=$1 ORDER BY r.id DESC LIMIT $2',[guildId,limit]);
  return result.rows;
}
