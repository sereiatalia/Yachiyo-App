import { query } from '../database/db.js';

const normalize = value => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const usefulWords = value => new Set(normalize(value).split(' ').filter(word => word.length > 2 && !['the','and','for','with','how','what','where','can','you','are','that','this','ang','ng','mga','para','saan'].includes(word)));

export async function addBrainFaq(guildId, question, answer) {
  return (await query('INSERT INTO brain_faqs (guild_id,question,answer) VALUES ($1,$2,$3) RETURNING *',[guildId,question,answer])).rows[0];
}
export async function removeBrainFaq(guildId, id) { return (await query('DELETE FROM brain_faqs WHERE guild_id=$1 AND id=$2 RETURNING id',[guildId,id])).rowCount > 0; }
export async function getBrainFaqs(guildId) { return (await query('SELECT * FROM brain_faqs WHERE guild_id=$1 ORDER BY id',[guildId])).rows; }
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
  await query(`INSERT INTO brain_role_guides (guild_id,role_id,description) VALUES ($1,$2,$3)
    ON CONFLICT (guild_id,role_id) DO UPDATE SET description=EXCLUDED.description,updated_at=NOW()`,[guildId,roleId,description]);
}
export async function removeRoleGuide(guildId, roleId) { return (await query('DELETE FROM brain_role_guides WHERE guild_id=$1 AND role_id=$2 RETURNING role_id',[guildId,roleId])).rowCount > 0; }
export async function getRoleGuides(guildId) { return (await query('SELECT * FROM brain_role_guides WHERE guild_id=$1 ORDER BY role_id',[guildId])).rows; }
export async function findRoleGuide(guild, text) {
  if(!/\b(role|roles|get|obtain|join|paano|kuha|makakuha)\b/i.test(text)) return null;
  const guides=await getRoleGuides(guild.id), lower=normalize(text);
  for(const guide of guides) {
    const role=guild.roles.cache.get(guide.role_id); if(role && lower.includes(normalize(role.name))) return {role,description:guide.description};
  }
  return null;
}
