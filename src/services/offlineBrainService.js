const has = (text, ...terms) => terms.some(term => text.includes(term));
import { findBrainFaq, findRoleGuide } from './brainMemoryService.js';
import { getTicketSettings } from './ticketService.js';
import { getActiveGiveaways } from './giveawayService.js';

const COUNTRY_TIME_ZONES = [
  ['philippines','Asia/Manila','Philippines'], ['ph','Asia/Manila','Philippines'], ['japan','Asia/Tokyo','Japan'], ['korea','Asia/Seoul','South Korea'],
  ['china','Asia/Shanghai','China'], ['singapore','Asia/Singapore','Singapore'], ['indonesia','Asia/Jakarta','Indonesia'], ['thailand','Asia/Bangkok','Thailand'],
  ['india','Asia/Kolkata','India'], ['pakistan','Asia/Karachi','Pakistan'], ['uae','Asia/Dubai','United Arab Emirates'], ['dubai','Asia/Dubai','Dubai'],
  ['uk','Europe/London','United Kingdom'], ['england','Europe/London','United Kingdom'], ['france','Europe/Paris','France'], ['germany','Europe/Berlin','Germany'],
  ['spain','Europe/Madrid','Spain'], ['italy','Europe/Rome','Italy'], ['russia','Europe/Moscow','Russia'], ['australia','Australia/Sydney','Australia'],
  ['canada','America/Toronto','Canada (Eastern time)'], ['usa','America/New_York','United States (Eastern time)'], ['united states','America/New_York','United States (Eastern time)'],
  ['new york','America/New_York','New York'], ['california','America/Los_Angeles','California'], ['los angeles','America/Los_Angeles','Los Angeles'],
  ['brazil','America/Sao_Paulo','Brazil'], ['mexico','America/Mexico_City','Mexico'], ['argentina','America/Argentina/Buenos_Aires','Argentina'], ['south africa','Africa/Johannesburg','South Africa'],
];

export function isTimeQuestion(text) {
  return /\b(what time|current time|time now|time is it|oras ngayon|anong oras|hora|quelle heure|何時|몇 시)\b/i.test(text);
}

export function findCountryTime(text, language = languageOf(text)) {
  const lower=text.toLowerCase();
  const match=COUNTRY_TIME_ZONES.find(([name]) => new RegExp('(^|\\b)'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(\\b|$)','i').test(lower));
  if (!match) return null;
  const [,timeZone,label]=match;
  const value=new Intl.DateTimeFormat('en-US',{timeZone,hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true,timeZoneName:'short'}).format(new Date());
  return language==='tl' ? `⭑.ᐟ Sa **${label}**, **${value}** ngayon.` : `⭑.ᐟ In **${label}**, it is **${value}**.`;
}

const languageOf = text => {
  if(/[ぁ-んァ-ン一-龯]/.test(text)) return 'ja';
  if(/[가-힣]/.test(text)) return 'ko';
  if(/\b(hola|gracias|donde|qué|que hora|servidor)\b/i.test(text)) return 'es';
  if(/\b(bonjour|merci|où|quelle|serveur)\b/i.test(text)) return 'fr';
  if(/\b(ano|anong|kumusta|kamusta|sino|sinong|paano|salamat|pwede|tulong|ka|ikaw|oras|saan|petsa|ilan|ilang|maganda|pinaka|may-ari|may ari|kailan|gusto)\b/i.test(text)) return 'tl';
  return 'en';
};

const words = {
  en: { hello:'Hello', help:'Use `/help` to see my commands. For server details, use `/server-info`.', time:'What country are you referring to? For countries with several time zones, please name a city too.', thanks:'You are very welcome!', intro:'I am Yachiyo, your cozy server guardian.' },
  tl: { hello:'Kumusta', help:'Gamitin ang `/help` para makita ang commands. Para sa server details, gamitin ang `/server-info`.', time:'Anong bansa ang tinutukoy mo? Kung maraming time zone ang bansa, sabihin din ang city.', thanks:'Walang anuman!', intro:'Ako si Yachiyo, ang cozy server guardian ninyo.' },
  es: { hello:'Hola', help:'Usa `/help` para ver mis comandos y `/server-info` para la información del servidor.', time:'¿Qué país prefieres? Si tiene varias zonas horarias, indica también una ciudad.', thanks:'¡De nada!', intro:'Soy Yachiyo, la guardiana acogedora del servidor.' },
  fr: { hello:'Bonjour', help:'Utilisez `/help` pour mes commandes et `/server-info` pour les informations du serveur.', time:'Quel pays préférez-vous ? S’il y a plusieurs fuseaux horaires, indiquez aussi une ville.', thanks:'Avec plaisir !', intro:'Je suis Yachiyo, la gardienne chaleureuse du serveur.' },
  ja: { hello:'こんにちは', help:'コマンドは `/help`、サーバー情報は `/server-info` を使ってください。', time:'どの国の時間ですか？複数の時間帯がある国は都市も教えてください。', thanks:'どういたしまして！', intro:'私はYachiyo、サーバーの小さな守り手です。' },
  ko: { hello:'안녕하세요', help:'명령어는 `/help`, 서버 정보는 `/server-info`를 사용하세요.', time:'어느 나라 시간을 원하세요? 시간대가 여러 개인 나라는 도시도 알려주세요.', thanks:'천만에요!', intro:'저는 서버의 작은 수호자 Yachiyo예요.' },
};

const publicTextChannels = guild => [...guild.channels.cache.values()].filter(channel => channel.isTextBased?.() && channel.permissionsFor(guild.roles.everyone)?.has('ViewChannel'));
const ageText = date => {
  const days=Math.max(0,Math.floor((Date.now()-date.getTime())/86_400_000));
  const years=Math.floor(days/365), months=Math.floor((days%365)/30), remaining=days%30;
  return [years&&years+' year'+(years===1?'':'s'),months&&months+' month'+(months===1?'':'s'),remaining+' day'+(remaining===1?'':'s')].filter(Boolean).join(', ');
};
const suggestedChannels = (guild, terms) => publicTextChannels(guild).filter(channel => terms.some(term => channel.name.toLowerCase().includes(term))).slice(0,5).map(channel=>'<#'+channel.id+'>');
const findChannelAnswer = (message, guild, language) => {
  if(!/\b(where|which channel|saan|channel|donde|où)\b/i.test(message)) return null;
  const groups=[
    {words:['introduc','intro'],label:'introductions'}, {words:['ticket','report','suggestion','feedback','concern','help'],label:'tickets or staff help'},
    {words:['confess'],label:'confessions'}, {words:['rule','guideline'],label:'the rules'}, {words:['giveaway','give away'],label:'giveaways'},
    {words:['bump'],label:'bumping'}, {words:['image','photo','art','picture'],label:'sharing images or art'}, {words:['chat','talk','general','message'],label:'chatting'},
  ];
  const group=groups.find(item=>item.words.some(word=>message.includes(word)));
  const choices=suggestedChannels(guild,group?.words ?? ['chat','general','community']);
  if(!choices.length) return language==='tl' ? 'Wala akong nakitang public channel para rito. Magtanong muna sa staff, ha? ♡' : (group ? `I could not find a public channel named for **${group.label}**. Please ask a staff member. ♡` : 'Try one of the public chat channels, or ask a staff member for the best place. ♡');
  return language==='tl' ? `₊˚⊹ᰔ Para sa **${group?.label ?? 'pakikipag-chat'}**, subukan mo rito: ${choices.join(' • ')}` : `₊˚⊹ᰔ For **${group?.label ?? 'chatting'}**, try: ${choices.join(' • ')}`;
};

// This intentionally stays local and deterministic: no API key, web request, or usage charge.
export async function getOfflineBrainReply({ text, guild, user, member }) {
  const message=text.toLowerCase().trim();
  const language=languageOf(text), say=words[language];
  const owner=await guild.fetchOwner().catch(()=>null);
  const channelAnswer=findChannelAnswer(message,guild,language);
  const directTime=findCountryTime(text,language);
  const savedAnswer=await findBrainFaq(guild.id,text).catch(()=>null);
  const roleGuide=await findRoleGuide(guild,text).catch(()=>null);

  if (!message || has(message,'hello','hi ','hii','kumusta','kamusta','hola','bonjour','こんにちは','안녕')) return `₊˚⊹ᰔ ${say.hello}, ${user}! ${say.intro} ♡`;
  if (savedAnswer) return `₊˚⊹ᰔ ${savedAnswer.answer}`;
  if (roleGuide) return `♡ **${roleGuide.role.name}:** ${roleGuide.description}`;
  if (has(message,'prettiest','most beautiful','pinakamaganda','pinaka maganda','pinaka magandang','maganda ba','sinong maganda')) return language==='tl' ? 'Ako, siyempre. May moonlit glow ako at may resibo rin. ✦' : 'Me, obviously. I have the moonlit glow and the receipts. ✦';
  if (has(message,'who are you','sino ka','about you','eres','qui es','誰','누구')) return say.intro+' I am offline, quick, and always ready to help with this server. ♡';
  if (has(message,'server name','name of the server','pangalan ng server','anong pangalan','ano pangalan','nombre del servidor')) return language==='tl' ? `₊˚⊹ᰔ Ang pangalan ng server ay **${guild.name}**.` : `₊˚⊹ᰔ The server is called **${guild.name}**.`;
  if (has(message,'how old','server age','age of the server','ilang taon','kailan ginawa','gaano na katagal','when was the server created','server created','creation date')) { const timestamp=Math.floor(guild.createdTimestamp/1000); return language==='tl' ? `˚. ᵎᵎ Ginawa ang **${guild.name}** noong <t:${timestamp}:D> — **${ageText(guild.createdAt)}** na ito.` : `˚. ᵎᵎ **${guild.name}** was created on <t:${timestamp}:D> — it is **${ageText(guild.createdAt)}** old.`; }
  if (isTimeQuestion(text)) return directTime ?? `⭑.ᐟ ${say.time}`;
  if (has(message,'what date','current date','date today','anong petsa','petsa ngayon','ngayon ay','today','fecha')) { const date=new Intl.DateTimeFormat('en-PH',{timeZone:process.env.SERVER_TIMEZONE || 'Asia/Manila',weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date()); return language==='tl' ? `⭑.ᐟ Ang petsa ngayon ay **${date}**.` : `⭑.ᐟ Today is **${date}**.`; }
  if (channelAnswer) return channelAnswer;
  if (has(message,'how many member','member count','members are','ilang member','ilang miyembro','members')) return language==='tl' ? `₊˚⊹ᰔ May **${guild.memberCount.toLocaleString()} miyembro** ang **${guild.name}** ngayon.` : `₊˚⊹ᰔ **${guild.name}** currently has **${guild.memberCount.toLocaleString()} members**.`;
  if (has(message,'how many channel','channel count','ilang channel','ilang channels')) return language==='tl' ? `₊˚⊹ᰔ May **${publicTextChannels(guild).length} public text channels** akong nakikita.` : `₊˚⊹ᰔ There are **${publicTextChannels(guild).length} public text channels** I can see.`;
  if (has(message,'active giveaway','current giveaway','giveaway active','may giveaway')) { const giveaways=await getActiveGiveaways(guild.id).catch(()=>[]); return giveaways.length ? '🎁 **Active giveaway'+(giveaways.length>1?'s':'')+':**\n'+giveaways.map(giveaway=>'• **'+giveaway.prize+'** in <#'+giveaway.channel_id+'> • ends <t:'+Math.floor(new Date(giveaway.ends_at).getTime()/1000)+':R>').join('\n') : 'There are no active giveaways right now. Keep an eye on the server for the next one. ♡'; }
  if (has(message,'ticket','report','suggestion','feedback','staff help','contact staff','appeal','warning','warned','ban appeal')) { const ticket=await getTicketSettings(guild.id).catch(()=>null); return ticket ? '₊˚⊹ᰔ You can contact staff privately through the ticket panel in <#'+ticket.channel_id+'>. Choose **Reports**, **Suggestions**, or **Feedback** and Yachiyo will create a private channel for you.' : 'Please contact a staff member privately. The ticket system is not set up yet.'; }
  if (has(message,'when did i join','when i joined','join date','kailan ako sumali') && member?.joinedTimestamp) return language==='tl' ? `˚. ᵎᵎ Sumali ka sa server noong <t:${Math.floor(member.joinedTimestamp/1000)}:D>.` : `˚. ᵎᵎ You joined this server on <t:${Math.floor(member.joinedTimestamp/1000)}:D>.`;
  if (has(message,'owner','may-ari','may ari','sino may')) return owner ? (language==='tl' ? `⭑.ᐟ Ang owner ng server ay **${owner.user.tag}**.` : `⭑.ᐟ The server owner is **${owner.user.tag}**.`) : 'I could not find the server owner right now.';
  if (has(message,'server info','server information','info ng server')) return '˚. ᵎᵎ Use `/server-info` to view the current server information panel.';
  if (has(message,'what can you do','what do you do','abilities','features','kaya mo','ano ginagawa mo','anong ginagawa mo')) return language==='tl' ? '✦ Kaya kong gumabay sa members, maghanap ng public channels, sumagot sa saved FAQs, magpaliwanag ng role guides, magpakita ng server/member info, at tumulong sa introductions, tickets, reminders, giveaways, at moderation tools.' : '✦ I can guide members, find public channels, answer saved server FAQs, explain role guides, show server/member information, and help with introductions, tickets, reminders, giveaways, and moderation tools.';
  if (has(message,'fortune','fortune cookie','kapalaran')) { const fortunes=['A kind message will brighten someone’s day.','A small idea is about to become something lovely.','Your next good memory is closer than you think.','The moon says: drink water and trust yourself.']; return '✦ **Yachiyo’s fortune:** '+fortunes[Math.floor(Math.random()*fortunes.length)]; }
  if (has(message,'quote','daily quote','inspiration')) { const quotes=['Soft hearts can still be strong.','You do not need to rush a beautiful life.','Being kind is always in style.','A little progress is still progress.']; return '˚. ᵎᵎ **Yachiyo’s quote:** '+quotes[Math.floor(Math.random()*quotes.length)]; }
  if (has(message,'command','commands','tulong','help','paano','ayuda','aide')) return '⊹ ࣪ ˖ '+say.help;
  if (has(message,'thank','salamat','thanks','gracias','merci','ありがとう','고마')) return say.thanks+' ♡';
  return language==='tl' ? 'Hindi pa ako full AI chat bot, pero maaasahan mo ako sa server questions, `/help`, at `/server-info`. Subukan mong magtanong nang mas simple. ♡' : `${say.intro} I can reliably answer server questions, help you find public channels, and guide you to `/help` or `/server-info`. ♡`;
}
