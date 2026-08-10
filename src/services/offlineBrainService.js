import { findBrainFaq, findRoleGuide } from './brainMemoryService.js';
import { getTicketSettings } from './ticketService.js';
import { getActiveGiveaways } from './giveawayService.js';
import { solveSimpleMath } from './simpleMathService.js';
import { getBrainUtilityReply } from './brainUtilityService.js';
import { getHandbookBrainReply } from './handbookBrainService.js';

const has = (text, ...phrases) => phrases.some(phrase => text.includes(phrase));
const TIME_ZONES = [
  ['philippines','Asia/Manila','Philippines'],['ph','Asia/Manila','Philippines'],['japan','Asia/Tokyo','Japan'],['korea','Asia/Seoul','South Korea'],['china','Asia/Shanghai','China'],['singapore','Asia/Singapore','Singapore'],['indonesia','Asia/Jakarta','Indonesia'],['thailand','Asia/Bangkok','Thailand'],['india','Asia/Kolkata','India'],['dubai','Asia/Dubai','Dubai'],['uk','Europe/London','United Kingdom'],['england','Europe/London','United Kingdom'],['france','Europe/Paris','France'],['germany','Europe/Berlin','Germany'],['spain','Europe/Madrid','Spain'],['italy','Europe/Rome','Italy'],['australia','Australia/Sydney','Australia'],['canada','America/Toronto','Canada (Eastern time)'],['usa','America/New_York','United States (Eastern time)'],['united states','America/New_York','United States (Eastern time)'],['new york','America/New_York','New York'],['california','America/Los_Angeles','California'],['los angeles','America/Los_Angeles','Los Angeles'],['brazil','America/Sao_Paulo','Brazil'],['mexico','America/Mexico_City','Mexico']
];

const languageOf = text => /\b(ano|anong|kumusta|kamusta|sino|sinong|paano|salamat|pwede|tulong|oras|saan|petsa|kailan|maganda|pinaka|may ari|may-ari|ilang|miyembro)\b/i.test(text) ? 'tl' : 'en';
export const isTimeQuestion = text => /\b(what time|current time|time now|time is it|oras ngayon|anong oras)\b/i.test(text);
export function findCountryTime(text, language=languageOf(text)) {
  const lower=text.toLowerCase();
  const found=TIME_ZONES.find(([country]) => lower.includes(country));
  if(!found) return null;
  const [,timeZone,label]=found;
  const time=new Intl.DateTimeFormat('en-US',{timeZone,hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true,timeZoneName:'short'}).format(new Date());
  return language==='tl' ? `Sa **${label}**, **${time}** ngayon.` : `In **${label}**, it is **${time}**.`;
}

const publicChannels = guild => [...guild.channels.cache.values()].filter(channel => channel.isTextBased?.() && channel.permissionsFor(guild.roles.everyone)?.has('ViewChannel'));
const serverAge = date => { const days=Math.max(0,Math.floor((Date.now()-date.getTime())/86400000)); const years=Math.floor(days/365), months=Math.floor((days%365)/30), rest=days%30; return [years&&years+' year'+(years===1?'':'s'),months&&months+' month'+(months===1?'':'s'),rest+' day'+(rest===1?'':'s')].filter(Boolean).join(', '); };
function channelGuide(message, guild, language) {
  if(!/\b(where|which channel|saan|channel)\b/i.test(message)) return null;
  const groups=[['introductions',['intro','introduc']],['tickets or staff help',['ticket','report','suggestion','feedback','concern']],['confessions',['confess']],['the rules',['rule','guideline']],['giveaways',['giveaway']],['bumping',['bump']],['sharing images or art',['image','photo','art','picture']],['chatting',['chat','talk','general','message']]];
  const group=groups.find(([,words])=>words.some(word=>message.includes(word)));
  const matches=publicChannels(guild).filter(channel=>(group?.[1] ?? ['chat','general','community']).some(word=>channel.name.toLowerCase().includes(word))).slice(0,5).map(channel=>'<#'+channel.id+'>');
  if(!matches.length) return language==='tl' ? 'Wala akong nakitang public channel para rito. Magtanong muna sa staff.' : 'I could not find a matching public channel. Please ask a staff member.';
  return language==='tl' ? `Para sa **${group?.[0] ?? 'pakikipag-chat'}**, subukan mo rito: ${matches.join(' | ')}` : `For **${group?.[0] ?? 'chatting'}**, try: ${matches.join(' | ')}`;
}

export async function getOfflineBrainReply({ text, guild, user, member }) {
  const message=text.toLowerCase().trim(), language=languageOf(text);
  const math=solveSimpleMath(text), utility=getBrainUtilityReply(text,language), handbook=getHandbookBrainReply(text,language);
  const saved=await findBrainFaq(guild.id,text).catch(()=>null);
  const roleGuide=await findRoleGuide(guild,text).catch(()=>null);
  const owner=await guild.fetchOwner().catch(()=>null);
  const channelAnswer=channelGuide(message,guild,language);

  if (/(kill myself|suicide|self harm|saktan ang sarili|magpakamatay)/i.test(message) && handbook) return handbook;
  if (!message || has(message,'hello','hi ','hii','kumusta','kamusta')) return language==='tl' ? `Kumusta, ${user}! Ano ang maitutulong ko?` : `Hello, ${user}! What can I help with?`;
  if (math?.error) return language==='tl' ? 'Hindi ko ma-solve iyon. Subukan ang `12 * (3 + 2)`.' : 'I could not solve that. Try `12 * (3 + 2)`.';
  if (math) return `${math.expression} = **${Number.isInteger(math.value)?math.value:Number(math.value.toFixed(10))}**`;
  if (utility) return utility;
  if (saved) return saved.answer;
  if (roleGuide) return `**${roleGuide.role.name}:** ${roleGuide.description}`;
  if (handbook) return handbook;
  if (has(message,'prettiest','most beautiful','pinakamaganda','pinaka maganda','pinaka magandang','sinong maganda')) return language==='tl' ? 'Ako, siyempre. May moonlit glow ako at may resibo rin.' : 'Me, obviously. I have the moonlit glow and the receipts.';
  if (has(message,'who are you','sino ka','about you')) return language==='tl' ? 'Ako si Yachiyo, ang helpful at organized server guardian ninyo.' : 'I am Yachiyo, your helpful and organized server guardian.';
  if (has(message,'server name','name of the server','pangalan ng server','ano pangalan')) return language==='tl' ? `Ang pangalan ng server ay **${guild.name}**.` : `The server is called **${guild.name}**.`;
  if (has(message,'how old','server age','age of the server','ilang taon','kailan ginawa','gaano na katagal','creation date')) { const created=Math.floor(guild.createdTimestamp/1000); return language==='tl' ? `Ginawa ang **${guild.name}** noong <t:${created}:D>. **${serverAge(guild.createdAt)}** na ito.` : `**${guild.name}** was created on <t:${created}:D> and is **${serverAge(guild.createdAt)}** old.`; }
  if (isTimeQuestion(text)) return findCountryTime(text,language) ?? (language==='tl' ? 'Anong bansa ang tinutukoy mo? Kung maraming time zone ito, sabihin din ang city.' : 'What country are you referring to? For countries with several time zones, please name a city too.');
  if (has(message,'what date','current date','date today','anong petsa','petsa ngayon','today')) { const date=new Intl.DateTimeFormat('en-PH',{timeZone:process.env.SERVER_TIMEZONE||'Asia/Manila',weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date()); return language==='tl' ? `Ang petsa ngayon ay **${date}**.` : `Today is **${date}**.`; }
  if (channelAnswer) return channelAnswer;
  if (has(message,'how many member','member count','members are','ilang member','ilang miyembro','members')) return language==='tl' ? `May **${guild.memberCount.toLocaleString()} miyembro** ang **${guild.name}** ngayon.` : `**${guild.name}** currently has **${guild.memberCount.toLocaleString()} members**.`;
  if (has(message,'how many channel','channel count','ilang channel')) return language==='tl' ? `May **${publicChannels(guild).length} public text channels** akong nakikita.` : `There are **${publicChannels(guild).length} public text channels** I can see.`;
  if (has(message,'active giveaway','current giveaway','giveaway active','may giveaway')) { const giveaways=await getActiveGiveaways(guild.id).catch(()=>[]); return giveaways.length ? giveaways.map(item=>`**${item.prize}** in <#${item.channel_id}> ends <t:${Math.floor(new Date(item.ends_at).getTime()/1000)}:R>`).join('\n') : 'There are no active giveaways right now.'; }
  if (has(message,'ticket','report','suggestion','feedback','staff help','contact staff','appeal','warning','warned')) { const ticket=await getTicketSettings(guild.id).catch(()=>null); return ticket ? `Contact staff privately through the ticket panel in <#${ticket.channel_id}>.` : 'Please contact a staff member privately.'; }
  if (has(message,'when did i join','when i joined','join date','kailan ako sumali') && member?.joinedTimestamp) return language==='tl' ? `Sumali ka noong <t:${Math.floor(member.joinedTimestamp/1000)}:D>.` : `You joined this server on <t:${Math.floor(member.joinedTimestamp/1000)}:D>.`;
  if (has(message,'owner','may ari','may-ari','sino may')) return owner ? (language==='tl' ? `Ang owner ng server ay **${owner.user.tag}**.` : `The server owner is **${owner.user.tag}**.`) : 'I could not find the server owner.';
  if (has(message,'server info','server information','info ng server')) return 'Use `/server-info` to view the server information panel.';
  if (has(message,'what can you do','what do you do','abilities','features','kaya mo','ano ginagawa mo','anong ginagawa mo')) return language==='tl' ? 'Kaya kong sumagot sa server questions, maghanap ng public channels, tumulong sa tickets, roles, reminders, giveaways, at server tools.' : 'I can answer server questions, find public channels, and help with tickets, roles, reminders, giveaways, and server tools.';
  if (has(message,'fortune','fortune cookie','kapalaran')) return 'Yachiyo says: a kind message will brighten someone’s day.';
  if (has(message,'quote','daily quote','inspiration')) return 'Yachiyo quote: Soft hearts can still be strong.';
  if (has(message,'command','commands','tulong','help','paano')) return language==='tl' ? 'Gamitin ang `/help` para makita ang commands, at `/server-info` para sa server details.' : 'Use `/help` to see my commands, and `/server-info` for server details.';
  if (has(message,'thank','salamat','thanks')) return language==='tl' ? 'Walang anuman!' : 'You are very welcome!';
  return language==='tl' ? 'Hindi pa ako full AI chat bot, pero maaasahan mo ako sa server questions, /help, at /server-info. Subukan mong magtanong nang mas simple.' : 'I can answer server questions, help you find public channels, and guide you to /help or /server-info.';
}
