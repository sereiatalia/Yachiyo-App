import { query } from '../database/db.js';

const normalize = value => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const usefulWords = value => new Set(normalize(value).split(' ').filter(word => word.length > 2 && !['the','and','for','with','how','what','where','can','you','are','that','this','ang','ng','mga','para','saan'].includes(word)));
let tablesReady = false;

async function ensureBrainMemoryTables() {
  if (tablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS brain_faqs (
    id BIGSERIAL PRIMARY KEY, guild_id TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await query('CREATE INDEX IF NOT EXISTS brain_faqs_guild_idx ON brain_faqs(guild_id,id)');
  await query(`CREATE TABLE IF NOT EXISTS brain_role_guides (
    guild_id TEXT NOT NULL, role_id TEXT NOT NULL, description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (guild_id,role_id)
  )`);
  tablesReady = true;
}

export async function addBrainFaq(guildId, question, answer) {
  await ensureBrainMemoryTables();
  return (await query('INSERT INTO brain_faqs (guild_id,question,answer) VALUES ($1,$2,$3) RETURNING *',[guildId,question,answer])).rows[0];
}
export async function removeBrainFaq(guildId, id) { await ensureBrainMemoryTables(); return (await query('DELETE FROM brain_faqs WHERE guild_id=$1 AND id=$2 RETURNING id',[guildId,id])).rowCount > 0; }
export async function getBrainFaqs(guildId) { await ensureBrainMemoryTables(); return (await query('SELECT * FROM brain_faqs WHERE guild_id=$1 ORDER BY id',[guildId])).rows; }
export async function findBrainFaq(guildId, text) {
  const target=normalize(text), words=usefulWords(text); if(!words.size) return null;
  const faqs=await getBrainFaqs(guildId); let winner=null, best=0;
  for(const faq of faqs) {
    const candidate=normalize(faq.question); if(target.includes(candidate) || candidate.includes(target)) return faq;
    const questionWords=usefulWords(faq.question); const shared=[...questionWords].filter(word=>words.has(word)).length;
    const score=shared/Math.max(1,questionWords.size);
    if(shared>=2 && score>best) { best=score; winner=faq; }
  }
  return best>=0.6 ? winner : null;
}

export async function addRoleGuide(guildId, roleId, description) {
  await ensureBrainMemoryTables();
  await query(`INSERT INTO brain_role_guides (guild_id,role_id,description) VALUES ($1,$2,$3)
    ON CONFLICT (guild_id,role_id) DO UPDATE SET description=EXCLUDED.description,updated_at=NOW()`,[guildId,roleId,description]);
}
export async function removeRoleGuide(guildId, roleId) { await ensureBrainMemoryTables(); return (await query('DELETE FROM brain_role_guides WHERE guild_id=$1 AND role_id=$2 RETURNING role_id',[guildId,roleId])).rowCount > 0; }
export async function getRoleGuides(guildId) { await ensureBrainMemoryTables(); return (await query('SELECT * FROM brain_role_guides WHERE guild_id=$1 ORDER BY role_id',[guildId])).rows; }
export async function findRoleGuide(guild, text) {
  if(!/\b(role|roles|get|obtain|join|paano|kuha|makakuha)\b/i.test(text)) return null;
  const guides=await getRoleGuides(guild.id), lower=normalize(text);
  for(const guide of guides) {
    const role=guild.roles.cache.get(guide.role_id); if(role && lower.includes(normalize(role.name))) return {role,description:guide.description};
  }
  return null;
}
