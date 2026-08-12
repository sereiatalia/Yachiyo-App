import { query } from '../database/db.js';

const TRUTH_PROMPTS = [
  '[PG] WHO: Which friend can tell you are stressed before you say anything, and what do they notice?',
  '[PG] WHO: Who taught you a small habit you still use today?',
  '[PG] WHO: Who would you choose to plan a last-minute day out with, and why?',
  '[PG] WHO: Who made you laugh the hardest this month, and what happened?',
  '[PG] WHO: Who would you ask to give an honest opinion on your latest idea?',
  '[PG] WHERE: Where in your town or city would you take a new friend for one hour?',
  '[PG] WHERE: Where do you go online when you want to learn something useful?',
  '[PG] WHERE: Where do you feel most like yourself: at home, school/work, outside, or online?',
  '[PG] WHERE: Where would your ideal quiet weekend start?',
  '[PG] WHERE: Where is one place you want to revisit because of a good memory?',
  '[PG] WHEN: When did you last surprise yourself by doing something well?',
  '[PG] WHEN: When are you at your most productive during a normal day?',
  '[PG] WHEN: When did you first realize a hobby was more than a passing interest?',
  '[PG] WHEN: When do you know you need to take a break from your phone?',
  '[PG] WHEN: When was the last time a song changed your mood immediately?',
  '[PG] WHAT: What is a tiny thing that instantly makes your day better?',
  '[PG] WHAT: What is one skill you have that people would not guess at first?',
  '[PG] WHAT: What is your most specific comfort food or drink order?',
  '[PG] WHAT: What game, movie, book, or series could you talk about for ten minutes without preparing?',
  '[PG] WHAT: What would be on a playlist called “this is so me”?',
  '[PG] HOW: How do you usually celebrate a small win?',
  '[PG] HOW: How would a close friend describe your best quality?',
  '[PG] HOW: How do you get yourself moving when you have no motivation?',
  '[PG] HOW: How did you choose your current favorite hobby?',
  '[PG] HOW: How would you make a new member feel included in a group chat?',
  '[PG-13] WHO: Who do you find easiest to apologize to, and what makes it easier?',
  '[PG-13] WHO: Who has given you advice you did not like at first but later understood?',
  '[PG-13] WHO: Who brings out your calm side, and who brings out your chaotic side?',
  '[PG-13] WHO: Who would you trust with a difficult decision, and what quality earned that trust?',
  '[PG-13] WHO: Who do you wish you thanked more often for something small?',
  '[PG-13] WHERE: Where do you go when you need privacy without completely isolating yourself?',
  '[PG-13] WHERE: Where do you feel the most pressure to act like a different version of yourself?',
  '[PG-13] WHERE: Where have you had a conversation that changed your perspective?',
  '[PG-13] WHERE: Where would you go for one day if you needed a fresh start?',
  '[PG-13] WHERE: Where do you draw the line between being helpful and overextending yourself?',
  '[PG-13] WHEN: When was the last time you changed your mind after hearing someone out?',
  '[PG-13] WHEN: When do you notice that you are avoiding a task or conversation?',
  '[PG-13] WHEN: When did you learn that a friendship needed clearer boundaries?',
  '[PG-13] WHEN: When are you most likely to overthink, and what helps you reset?',
  '[PG-13] WHEN: When did you last choose the harder but more honest option?',
  '[PG-13] WHAT: What is a harmless “red flag” you have, such as being late, overthinking, or replying slowly?',
  '[PG-13] WHAT: What is one boundary you learned you need in friendships?',
  '[PG-13] WHAT: What kind of compliment do you remember for a long time?',
  '[PG-13] WHAT: What is a mistake that taught you a useful lesson without naming anyone involved?',
  '[PG-13] WHAT: What topic could you discuss respectfully even when you strongly disagree?',
  '[PG-13] HOW: How do you react when you feel left out of a conversation?',
  '[PG-13] HOW: How do you tell the difference between a bad day and a problem that needs attention?',
  '[PG-13] HOW: How would you explain your personal definition of loyalty?',
  '[PG-13] HOW: How do you want friends to tell you when you have hurt their feelings?',
  '[PG-13] HOW: How have you become different from the person you were two years ago?'
];

const DARE_PROMPTS = [
  '[PG] Make a five-song mini playlist for a rainy-day bus ride; list only the titles and artists.',
  '[PG] Describe your ideal café order and seat as if you are reviewing it for a magazine.',
  '[PG] Give one member-safe recommendation for a movie, series, game, or book and explain it in two sentences.',
  '[PG] Write a three-line pep talk for someone having a very ordinary bad day.',
  '[PG] Create a group-chat nickname for yourself based on your favorite food or hobby.',
  '[PG] Tell a harmless childhood story that still makes you laugh.',
  '[PG] Post your top three snacks for a late-night study or gaming session.',
  '[PG] Write a tiny travel postcard from a place you want to visit.',
  '[PG] Give a fictional character a job they would be unexpectedly good at.',
  '[PG] Describe your current mood using only weather words.',
  '[PG] Share one useful life shortcut you actually use.',
  '[PG] Make a two-sentence trailer voice-over for your week so far.',
  '[PG] Write a kind but very specific compliment someone could give a friend.',
  '[PG] Pick a song for “walking home after a good day” and say why it fits.',
  '[PG] Invent a harmless challenge for the next person, such as naming a comfort food.',
  '[PG] Explain your favorite hobby to someone who has never heard of it in one sentence.',
  '[PG] Make a ranking of three fictional places you would visit for exactly one day.',
  '[PG] Write a dramatic headline about the last snack or meal you ate.',
  '[PG] Share a photo-free “starter pack” of five things that represent your week.',
  '[PG] Give the chat one question that helps people discover a shared interest.',
  '[PG] Tell a short story using these words: key, rain, message, and midnight.',
  '[PG] Invent a new holiday and explain the one tradition everyone must follow.',
  '[PG] Give a very serious review of an everyday object near you.',
  '[PG] Share one small goal for this week and one realistic first step.',
  '[PG] Turn your favorite drink into a fictional character with a name and personality.',
  '[PG-13] Share a harmless unpopular opinion and defend it without insulting the other side.',
  '[PG-13] Describe your most harmless personal “red flag” in one funny sentence.',
  '[PG-13] Tell an awkward-but-safe moment that you can laugh about now; do not name anyone else.',
  '[PG-13] Write a boundary you think more friendships should normalize.',
  '[PG-13] Give advice to your past self from one year ago in exactly two sentences.',
  '[PG-13] Finish this honestly: “I feel most confident when I…”',
  '[PG-13] Finish this honestly: “A small thing that drains my energy is…”',
  '[PG-13] Name one quality that makes someone feel safe to talk to.',
  '[PG-13] Write a respectful message you could send after a misunderstanding with a friend.',
  '[PG-13] Share a habit you are trying to improve and one strategy that might help.',
  '[PG-13] Write a “not today” note for one unhelpful thought, without sharing private details.',
  '[PG-13] Explain one sign that tells you a group conversation is becoming uncomfortable.',
  '[PG-13] Give a short example of how to disagree without turning it into an argument.',
  '[PG-13] Write three words you want people to associate with you.',
  '[PG-13] Share a lesson you learned from a friendship, without identifying anyone.',
  '[PG-13] Make a “future me will thank me” checklist with three small items.',
  '[PG-13] Say one thing you are better at now than you were last year.',
  '[PG-13] Write a respectful response to someone cancelling plans at the last minute.',
  '[PG-13] Describe a healthy way you reset after an argument or stressful conversation.',
  '[PG-13] Give one example of a compliment that praises effort rather than appearance.',
  '[PG-13] Write the first line of a journal entry titled “A better week starts with…”',
  '[PG-13] Name a conversation topic that brings people together in your experience.',
  '[PG-13] Describe a time you changed your opinion without naming the people involved.',
  '[PG-13] Write a one-sentence promise you want to keep to yourself this month.',
  '[PG-13] Give a friend a gentle reminder they might need to hear today.'
];

const PROMPT_VARIATIONS = [
  'Give one real example if you can.',
  'Keep it honest and concise.',
  'You may answer in any language.',
  'Use a detail that makes your answer personal.',
  'A short answer is completely fine.',
  'Do not name anyone who would not want to be named.',
  'Make it something the group can understand.',
  'Say what you genuinely think, not what sounds impressive.',
  'Keep other people’s private information private.',
  'Add one detail that helps people get to know you.'
];

function buildPromptPool(prompts) {
  return Object.freeze(prompts.flatMap(prompt => PROMPT_VARIATIONS.map(variation => `${prompt}\n*${variation}*`)));
}

export const SAFE_TRUTHS = buildPromptPool(TRUTH_PROMPTS);
export const SAFE_DARES = buildPromptPool(DARE_PROMPTS);
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
