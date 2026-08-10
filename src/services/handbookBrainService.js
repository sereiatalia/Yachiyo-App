const has = (text, ...phrases) => phrases.some(phrase => text.includes(phrase));

const dictionary = [
  [['what is yachiyo','ano si yachiyo'], 'Yachiyo is a helpful server manager made to support the community, answer questions, and keep the server organized. ♡'],
  [['what is a bot','ano ang bot'], 'A bot is a software program that can respond to commands and perform tasks automatically.'],
  [['what is discord','ano ang discord'], 'Discord is a platform where communities can chat through text, voice, video, and servers.'],
  [['what is a server','ano ang server'], 'A Discord server is a community space with channels, members, roles, and rules.'],
  [['what is a channel','ano ang channel'], 'A channel is a specific space for messages or voice conversations, usually organized by topic.'],
  [['what is a role','ano ang role'], 'A role is a label or permission group given to members in a server.'],
  [['what is a giveaway','ano ang giveaway'], 'A giveaway is an event where eligible members can win a prize under the posted rules.'],
  [['what is a command','ano ang command'], 'A command is an instruction, such as `/help`, that tells a bot to perform an action.'],
  [['what does afk mean','afk meaning'], 'AFK means **away from keyboard**: someone is temporarily not active.'],
  [['what does brb mean','brb meaning'], 'BRB means **be right back**.'],
  [['what does lol mean','lol meaning'], 'LOL means **laughing out loud**.'],
  [['what does imo mean','imo meaning'], 'IMO means **in my opinion**.'],
  [['what does fyi mean','fyi meaning'], 'FYI means **for your information**.'],
  [['what does dm mean','dm meaning'], 'DM means **direct message**: a private message sent to someone.'],
  [['what does irl mean','irl meaning'], 'IRL means **in real life**.'],
  [['what does deadline mean','deadline meaning'], 'A deadline is the final time or date when something should be completed.'],
  [['what does priority mean','priority meaning'], 'A priority is something that should be handled before less important tasks.'],
  [['what does boundaries mean','boundaries meaning'], 'Boundaries are personal limits that show what someone is comfortable or uncomfortable with.'],
  [['what does consent mean','consent meaning'], 'Consent means freely agreeing to something. It must be clear, informed, and respected at any time.'],
  [['what does empathy mean','empathy meaning'], 'Empathy means trying to understand another person’s feelings and perspective.'],
];

export function getHandbookBrainReply(text, language='en') {
  const lower=text.toLowerCase().trim();
  if (/(kill myself|suicide|self harm|saktan ang sarili|magpakamatay)/i.test(lower)) return language==='tl' ? 'Ikinalulungkot kong mabigat ito. Kung nasa agarang panganib ka o baka saktan mo ang sarili mo, tumawag sa local emergency services ngayon o lumapit sa taong mapagkakatiwalaan malapit sa iyo. Maaari ka ring mag-message sa isang trusted friend o pamilya at sabihing kailangan mo ng kasama.' : 'I’m really sorry you are carrying this. If you may hurt yourself or are in immediate danger, please contact local emergency services now or reach a trusted person nearby. You can also message a friend or family member and tell them you need someone with you.';
  if (has(lower,'i am sad','im sad','malungkot ako')) return language==='tl' ? 'Pasensya na, mukhang mabigat ang nararamdaman mo. Hindi mo kailangang ikwento lahat, pero puwede akong makinig o tumulong maghanap ng maliit na susunod na hakbang.' : 'I’m sorry you’re feeling this way. You do not need to explain everything, but I can listen or help you find one small next step.';
  if (has(lower,'i am angry','im angry','galit ako')) return language==='tl' ? 'Mukhang sobrang frustrating nito. Huminga muna tayo sandali, tapos tingnan natin nang mahinahon ang nangyari.' : 'That sounds really frustrating. Let’s pause for a moment, then look at what happened calmly.';
  if (has(lower,'i am bored','im bored','bored ako')) return language==='tl' ? 'Subukan nating gawing masaya: makipag-chat, maglaro, ayusin ang profile mo, o gumawa ng maliit na creative challenge.' : 'Let’s find something fun: chat with someone, play a game, organize your profile, or try a small creative challenge.';
  if (has(lower,'good night','magandang gabi')) return language==='tl' ? 'Magandang gabi! Magpahinga ka nang maayos at ingatan ang sarili mo. ♡' : 'Good night! Rest well and take care of yourself. ♡';
  if (has(lower,'how are you','kumusta ka')) return language==='tl' ? 'Okay naman ako at handang tumulong. Kumusta ka naman? ☁︎' : 'I’m doing well and ready to help. How are you feeling today? ☁︎';
  if (has(lower,'sorry','pasensya na')) return language==='tl' ? 'Okay lang iyon. Salamat sa pagsabi—ayusin natin ito together.' : 'That’s okay. Thank you for telling me. Let’s fix it together.';
  if (has(lower,'you are wrong','youre wrong','mali ka')) return language==='tl' ? 'Posible—salamat sa pag-correct sa akin. Sabihin mo kung ano ang mali para maayos ko ito nang tama.' : 'You may be right. Thank you for catching it. Tell me what was wrong and I will correct it.';
  if (has(lower,'command is not working','command not working','hindi gumagana ang command')) return language==='tl' ? 'I-check natin: ano ang command, ano ang exact error, at may permission ka ba? Siguraduhin ding online ako at may access ako sa channel.' : 'Let’s troubleshoot it. Tell me the command, exact error, and whether you have permission. Also check that I am online and can access the channel.';
  if (has(lower,'how do i introduce','paano mag introduce','paano magpakilala')) return language==='tl' ? 'Pumunta sa introduction channel, pindutin ang **Introduction** button, sagutan ang template, at i-submit. Maaari kang makatanggap ng introduction role pagkatapos.' : 'Go to the introduction channel, press **Introduction**, complete the template, and submit it. You may receive the introduction role afterward.';
  if (has(lower,'why cant i join giveaway','why can i not join giveaway','bakit hindi ako makasali sa giveaway')) return language==='tl' ? 'I-check kung mayroon ka ng required role at kung pasok ka sa giveaway rules. Kung tingin mo ay error ito, mag-open ng ticket para sa staff.' : 'Check that you have the required role and meet the giveaway rules. If you think it is an error, open a ticket for staff.';
  if (has(lower,'what should i study','ano dapat aralin')) return language==='tl' ? 'Unahin ang pinaka-urgent na topic, hatiin ito sa maliliit na bahagi, at mag-practice ng ilang questions. Kaya kitang tulungan gumawa ng simple study plan.' : 'Start with the most urgent topic, break it into small parts, and practice a few questions. I can help make a simple study plan.';
  if (has(lower,'write an essay','make an essay','gumawa ng essay')) return language==='tl' ? 'Pumili ng topic, gumawa ng malinaw na introduction, ipaliwanag ang main points sa body, at magtapos sa conclusion. I-send mo ang topic kung gusto mong gumawa tayo ng outline.' : 'Choose a topic, write a clear introduction, explain your main points in the body, then end with a conclusion. Send the topic if you want an outline.';
  if (has(lower,'make a resume','write a resume','gumawa ng resume')) return 'Include contact details, education, experience, skills, achievements, and relevant projects. Keep it clear and focused on the position.';
  if (has(lower,'interview tomorrow','job interview','may interview ako')) return language==='tl' ? 'Maghanda ng maikling introduction, basahin ang role, mag-practice ng common questions, at maghanda ng dalawang tanong para sa interviewer. Kaya mo ito step by step.' : 'Prepare a short introduction, review the role, practice common questions, and prepare two questions for the interviewer. You can do this step by step.';
  if (has(lower,'organize my day','plan my day','ayusin araw ko')) return language==='tl' ? 'Ilista ang tasks at deadlines mo. Tutulungan kitang ayusin sila bilang urgent, important, quick, at optional.' : 'List your tasks and deadlines. I can sort them into urgent, important, quick, and optional.';
  if (has(lower,'how do i apologize','paano humingi ng sorry')) return language==='tl' ? 'Sabihin kung ano ang ipinagso-sorry mo, kilalanin kung paano sila naapektuhan, iwasan ang excuses, at ipaliwanag ang gagawin mong mas maayos.' : 'Say what you are sorry for, acknowledge how it affected them, avoid excuses, and explain what you will do differently.';
  if (has(lower,'comfort a friend','comfort my friend','paano i-comfort')) return language==='tl' ? 'Makinig muna, i-validate ang feelings nila, huwag humusga, at tanungin kung gusto nila ng advice o may makakasama lang.' : 'Listen first, validate their feelings, avoid judging them, and ask whether they want advice or simply someone to stay with them.';
  if (has(lower,'good morning in filipino','good morning filipino')) return '“Magandang umaga!”';
  if (has(lower,'thank you in japanese','thank you japanese')) return '“Arigatou gozaimasu” (ありがとうございます) is a polite way to say “Thank you.”';
  if (has(lower,'take care to filipino','take care in filipino','translate take care')) return '“Mag-ingat ka.” For a warmer plural or polite version: “Mag-ingat kayo.”';
  if (has(lower,'can you speak korean','speak korean')) return 'I can help with basic Korean phrases and translations. Send the sentence you want translated, and I will tell you when it needs checking.';
  for (const [triggers, answer] of dictionary) if(triggers.some(trigger=>lower.includes(trigger))) return answer;
  return null;
}
