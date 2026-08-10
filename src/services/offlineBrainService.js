const has = (text, ...terms) => terms.some(term => text.includes(term));
const publicTextChannels = guild => [...guild.channels.cache.values()].filter(channel => channel.isTextBased?.() && channel.permissionsFor(guild.roles.everyone)?.has('ViewChannel'));
const ageText = date => {
  const days=Math.max(0,Math.floor((Date.now()-date.getTime())/86_400_000));
  const years=Math.floor(days/365), months=Math.floor((days%365)/30), remaining=days%30;
  return [years&&years+' year'+(years===1?'':'s'),months&&months+' month'+(months===1?'':'s'),remaining+' day'+(remaining===1?'':'s')].filter(Boolean).join(', ');
};
const suggestedChannels = (guild, terms) => {
  const matches=publicTextChannels(guild).filter(channel => terms.some(term => channel.name.toLowerCase().includes(term)));
  return matches.slice(0,5).map(channel=>'<#'+channel.id+'>');
};
const findChannelAnswer = (message, guild) => {
  if(!/\b(where|which channel|saan|channel)\b/i.test(message)) return null;
  const groups=[
    {words:['introduc','intro'],label:'introductions'},
    {words:['ticket','report','suggestion','feedback','concern'],label:'tickets or staff help'},
    {words:['confess'],label:'confessions'},
    {words:['rule','guideline'],label:'the rules'},
    {words:['giveaway','give away'],label:'giveaways'},
    {words:['bump'],label:'bumping'},
    {words:['chat','talk','general','message'],label:'chatting'},
  ];
  const group=groups.find(item=>item.words.some(word=>message.includes(word)));
  const choices=suggestedChannels(guild,group?.words ?? ['chat','general','community']);
  if(!choices.length) return group
    ? `I could not find a public channel named for **${group.label}**. Please ask a staff member where it belongs. ♡`
    : 'Try one of the server’s public chat channels, or ask a staff member for the best place. ♡';
  return `₊˚⊹ᰔ For **${group?.label ?? 'chatting'}**, try: ${choices.join(' • ')}`;
};

// This intentionally stays local and deterministic: no API key, web request, or usage charge.
export async function getOfflineBrainReply({ text, guild, user }) {
  const message = text.toLowerCase().trim();
  const tagalog = /\b(ano|kumusta|kamusta|sino|paano|salamat|pwede|help|tulong|ka|ikaw)\b/i.test(message);
  const owner = await guild.fetchOwner().catch(() => null);
  const channelAnswer=findChannelAnswer(message,guild);

  if (!message || has(message, 'hello', 'hi ', 'hii', 'kumusta', 'kamusta')) {
    return tagalog ? `₊˚⊹ᰔ Kumusta, ${user}! Nandito ako para tumulong sa **${guild.name}**. Ano ang kailangan mo?` : `₊˚⊹ᰔ Hello, ${user}! I am here to help with **${guild.name}**. What do you need?`;
  }
  if (has(message, 'who are you', 'sino ka', 'about you')) {
    return tagalog ? 'Ako si **Yachiyo**, ang maliit na server helper ninyo. Wala pa akong online AI brain, pero kaya kong tumulong sa server tools at basic questions. ♡' : 'I am **Yachiyo**, your little server helper. I do not use an online AI brain yet, but I can help with server tools and basic questions. ♡';
  }
  if (has(message, 'server name', 'name of the server', 'pangalan ng server', 'anong pangalan')) {
    return `₊˚⊹ᰔ The server is called **${guild.name}**.`;
  }
  if (has(message, 'how old', 'server age', 'age of the server', 'ilang taon', 'kailan ginawa', 'when was the server created', 'server created', 'creation date')) {
    const timestamp=Math.floor(guild.createdTimestamp/1000);
    return `˚. ᵎᵎ **${guild.name}** was created on <t:${timestamp}:D> — it is **${ageText(guild.createdAt)}** old.`;
  }
  if (has(message, 'what time', 'current time', 'oras ngayon', 'anong oras', 'time now')) {
    const time=new Intl.DateTimeFormat('en-PH',{timeZone:process.env.SERVER_TIMEZONE || 'Asia/Manila',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true,timeZoneName:'short'}).format(new Date());
    return `⭑.ᐟ The current time is **${time}**.`;
  }
  if (has(message, 'what date', 'current date', 'date today', 'anong petsa', 'petsa ngayon', 'today')) {
    const date=new Intl.DateTimeFormat('en-PH',{timeZone:process.env.SERVER_TIMEZONE || 'Asia/Manila',weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date());
    return `⭑.ᐟ Today is **${date}**.`;
  }
  if(channelAnswer) return channelAnswer;
  if (has(message, 'owner', 'may-ari', 'may ari')) {
    return owner ? `⭑.ᐟ The server owner is **${owner.user.tag}**.` : 'I could not find the server owner right now.';
  }
  if (has(message, 'server info', 'server information', 'info ng server')) {
    return '˚. ᵎᵎ Use `/server-info` to view the current server information panel.';
  }
  if (has(message, 'command', 'commands', 'tulong', 'help', 'paano')) {
    return tagalog ? '⊹ ࣪ ˖ Maaari mong gamitin ang `/help` para makita ang commands. Para sa server details, gamitin ang `/server-info`.' : '⊹ ࣪ ˖ Use `/help` to see my commands. For this server’s details, use `/server-info`.';
  }
  if (has(message, 'thank', 'salamat', 'thanks')) return tagalog ? 'Walang anuman! ♡' : 'You are very welcome! ♡';
  return tagalog
    ? '‎ꫂ᭪݁ Hindi pa ako full AI chat bot, pero maaari akong tumulong sa `/help`, `/server-info`, at mga server tools. Subukan mong itanong nang mas simple. ♡'
    : '‎ꫂ᭪݁ I am not a full AI chat bot yet, but I can help with `/help`, `/server-info`, and server tools. Try a simpler question. ♡';
}
