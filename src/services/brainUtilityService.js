const pick = values => values[Math.floor(Math.random()*values.length)];

function zonedDateToUnix(value, timeZone) {
  const match=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if(!match) return null;
  const [,year,month,day,hour='0',minute='0']=match;
  const utcGuess=Date.UTC(Number(year),Number(month)-1,Number(day),Number(hour),Number(minute));
  const formatter=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const parts=Object.fromEntries(formatter.formatToParts(new Date(utcGuess)).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  const displayedAsUtc=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute));
  return Math.floor((utcGuess-(displayedAsUtc-utcGuess))/1000);
}

export function getBrainUtilityReply(text, language='en') {
  const lower=text.toLowerCase().trim();
  if(/\b(flip (a )?coin|coin flip|toss (a )?coin|coin toss)\b/i.test(lower)) return '✦ The coin spins through the moonlight… **'+(Math.random()<0.5?'Heads':'Tails')+'**!';
  const dice=lower.match(/\b(?:roll|gulong|dice)\s*(?:(\d{1,2})\s*)?d?(\d{1,3})?\b/i);
  if(dice && (lower.includes('roll')||lower.includes('gulong')||lower.includes('dice'))) {
    const amount=Math.min(20,Math.max(1,Number(dice[1]||1))), sides=Math.min(100,Math.max(2,Number(dice[2]||6)));
    const results=Array.from({length:amount},()=>1+Math.floor(Math.random()*sides));
    return `🎲 Rolled **${amount}d${sides}**: ${results.join(', ')}${amount>1?' • Total: **'+results.reduce((sum,value)=>sum+value,0)+'**':''}`;
  }
  if(/\b(8ball|8-ball|magic ball)\b/i.test(lower)) return '🔮 **Yachiyo’s 8-ball:** '+pick(['Absolutely. ✦','Yes—trust your little spark.','The stars say yes.','Maybe; give it a little time.','Ask again after a snack.','Not today, moonbeam.','My crystal ball is being dramatic… try again.','Signs point to yes.']);
  if(/\b(compliment me|give me a compliment|compliment|purihin mo ako)\b/i.test(lower)) return '♡ '+pick(['You make this server feel warmer just by being here.','Your vibe is genuinely lovely.','You are doing better than you think you are.','You have excellent taste for asking Yachiyo questions.','Your presence is a little gift to the people around you.']);
  const wordInput=text.match(/(?:word count|bilang ng salita)\s*[:：]\s*(.+)/i)?.[1];
  if(wordInput) return `⭑.ᐟ That has **${wordInput.trim().split(/\s+/).filter(Boolean).length} words**.`;
  const characterInput=text.match(/(?:character count|char count|bilang ng character)\s*[:：]\s*(.+)/i)?.[1];
  if(characterInput) return `⭑.ᐟ That has **${[...characterInput].length} characters** (including spaces).`;
  if(/\b(nickname idea|name idea|username idea|bigay.*pangalan)\b/i.test(lower)) return '✦ Nickname idea: **'+pick(['moonlitbunny','strawberryglow','cloudykoi','petal.exe','lilacdaydream','cosmicmochi','rosycomet','bunnywhisper'])+'**';
  if(/\b(happy birthday|maligayang kaarawan)\b/i.test(lower)) return language==='tl' ? '₊˚⊹ᰔ Maligayang kaarawan! Sana maging gentle, masaya, at puno ng cake ang araw mo. ♡' : '₊˚⊹ᰔ Happy birthday! I hope your day is gentle, joyful, and full of cake. ♡';
  const timestamp=text.match(/(?:discord\s+)?timestamp(?:\s+for)?\s*[:：]?\s*(.+)/i)?.[1];
  if(timestamp) {
    const unix=zonedDateToUnix(timestamp,process.env.SERVER_TIMEZONE||'Asia/Manila');
    return unix ? `⭑.ᐟ Your Discord timestamp: <t:${unix}:F>\nCopy code: \`<t:${unix}:F>\`` : 'Use `timestamp: YYYY-MM-DD HH:MM` — Yachiyo uses the server’s configured time zone.';
  }
  return null;
}
