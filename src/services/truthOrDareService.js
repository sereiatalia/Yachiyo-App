import { query } from '../database/db.js';

const TRUTH_OPENERS = [
  'WHO: Who has influenced how you think about', 'WHO: Who would you ask for advice about', 'WHO: Who do you think understands you best when it comes to', 'WHO: Who first introduced you to', 'WHO: Who would you trust to help you improve at',
  'WHERE: Where do you go when you need a break from', 'WHERE: Where would you most like to experience', 'WHERE: Where do you feel most focused when working on', 'WHERE: Where would you recommend someone start with', 'WHERE: Where have you had your best memory involving',
  'WHEN: When did you first become interested in', 'WHEN: When was the last time you changed your mind about', 'WHEN: When do you feel most motivated to work on', 'WHEN: When did you realize you cared about', 'WHEN: When would you like to make more time for',
  'WHAT: What is the best lesson you learned from', 'WHAT: What is one opinion you have about', 'WHAT: What would you improve about your approach to', 'WHAT: What is a memory you connect with', 'WHAT: What is something people often misunderstand about',
  'HOW: How has your view of this changed over time:', 'HOW: How would you get better at', 'HOW: How do you usually deal with challenges around', 'HOW: How would you explain your interest in', 'HOW: How has this shaped a small part of who you are:'
];
const TRUTH_TOPICS = [
  'music', 'gaming', 'school or work', 'friendships', 'travel', 'food', 'movies or series', 'books or comics', 'social media', 'a hobby',
  'a personal goal', 'a difficult decision', 'a creative project', 'your daily routine', 'learning a new skill', 'your childhood interests', 'your favorite season', 'a future plan', 'managing stress', 'your own confidence'
];
const DARE_ACTIONS = [
  'Share a bold but respectful opinion about', 'Describe your honest take on', 'Write a short review of', 'Recommend your favorite example of', 'Name one thing you would change about',
  'Post a three-word reaction to', 'Write a two-sentence story inspired by', 'Give a useful tip about', 'Create a dramatic title for', 'Tell a short story connected to',
  'Use only five words to describe', 'Make up a headline about', 'Send your personal ranking of', 'Pick a side in a harmless debate about', 'Imagine the future of',
  'List three things you like about', 'Celebrate a recent win related to', 'Explain this as if you were an expert:', 'Choose a soundtrack for', 'Reply with an unpopular but respectful opinion about',
  'Show off one thing you know about', 'Invent a challenge involving', 'Turn this into a movie plot:', 'Finish this sentence in a surprising way using', 'Offer one piece of advice about'
];
const DARE_TASKS = [
  'your current music taste', 'your favorite game genre', 'a movie or series you know well', 'a food you could eat repeatedly', 'a hobby you want to improve',
  'a fictional character you would defend', 'a place you want to visit', 'a skill you wish you had', 'a harmless unpopular opinion', 'your ideal weekend',
  'a childhood interest', 'a recent small win', 'a strange but useful fact', 'a productivity habit', 'a future goal',
  'a fictional world you would visit', 'your favorite season', 'a funny personal habit', 'a book, comic, or story', 'something you want to learn'
];

export const SAFE_TRUTHS = Object.freeze(TRUTH_OPENERS.flatMap(opener => TRUTH_TOPICS.map(topic => `${opener} **${topic}**?`)));
export const SAFE_DARES = Object.freeze(DARE_ACTIONS.flatMap(action => DARE_TASKS.map(task => `${action} **${task}**.`)));
let settingsReady=false;
async function ensureSettingsTable() {
  if(settingsReady) return;
  await query(`CREATE TABLE IF NOT EXISTS truth_or_dare_settings (
    guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, panel_message_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  settingsReady=true;
}

export function randomTruthOrDare(type) {
  const list=type==='dare' ? SAFE_DARES : SAFE_TRUTHS;
  return list[Math.floor(Math.random()*list.length)];
}

export async function saveTruthOrDareSettings(guildId, channelId) {
  await ensureSettingsTable();
  await query(`INSERT INTO truth_or_dare_settings (guild_id,channel_id) VALUES ($1,$2)
    ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,updated_at=NOW()`,[guildId,channelId]);
}
export async function getTruthOrDareSettings(guildId) { await ensureSettingsTable(); return (await query('SELECT * FROM truth_or_dare_settings WHERE guild_id=$1',[guildId])).rows[0] ?? null; }
export async function saveTruthOrDarePanel(guildId,messageId) { await ensureSettingsTable(); await query('UPDATE truth_or_dare_settings SET panel_message_id=$2,updated_at=NOW() WHERE guild_id=$1',[guildId,messageId]); }
