import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, PermissionFlagsBits, REST, Routes } from 'discord.js';
import { commands, handleCommand } from './commands.js';
import { ensureGuild, getFishChannel } from './services/guildService.js';
import { sendAuditLog } from './services/auditService.js';
import { fishInventory, fishAlmanac, fishCollection } from './services/economyService.js';
import { buildAlmanacView } from './ui/almanac.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { fishAgain } from './handlers/fishing.js';
import { ROD_TIERS, buyItem, getRod, upgradeRod, evolveRod, getActiveEffects, itemInventory } from './services/fishingProgression.js';
import { createConfession, getConfessionChannel, attachConfessionMessage, getConfession, createConfessionReply } from './services/confessionService.js';
import { getCurseSettings, findMatchedCurseWords, recordCurseWarning } from './services/curseService.js';
import { getIntroductionSettings, getIntroductionCount, isIntroductionTemplateValid, recordIntroduction, setIntroductionPanelMessage } from './services/introductionService.js';

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required');

const filteredMessageIds = new Set();
const introductionPanelTimers = new Map();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', async () => {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: commands });
      console.log(`Registered ${commands.length} guild slash commands.`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
      console.log(`Registered ${commands.length} global slash commands.`);
    }
  } catch (error) {
    console.error('[COMMAND_DEPLOY]', error);
  }
  console.log(`Yachiyo is online as ${client.user.tag}`);
});
client.on('introductionPanelRefresh', (guildId) => {
  clearTimeout(introductionPanelTimers.get(guildId));
  introductionPanelTimers.set(guildId, setTimeout(() => refreshIntroductionPanel(guildId).catch(console.error), 1500));
});
async function refreshIntroductionPanel(guildId) {
  const settings = await getIntroductionSettings(guildId);
  if (!settings) return;
  const channel = await client.channels.fetch(settings.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;
  if (settings.panel_message_id) {
    const oldPanel = await channel.messages.fetch(settings.panel_message_id).catch(() => null);
    if (oldPanel?.author?.id === client.user?.id) await oldPanel.delete().catch(() => null);
  }
  const panel = await channel.send({ embeds: [new EmbedBuilder().setColor(0xf3a6c7).setTitle(settings.panel_title).setDescription(settings.panel_message)], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('introduction_get_template').setLabel('୨୧ Get template').setStyle(ButtonStyle.Primary))] });
  await setIntroductionPanelMessage(guildId, panel.id);
}
client.on('guildCreate', guild => ensureGuild(guild.id).catch(console.error));
client.on('guildMemberAdd', m => sendAuditLog(client,m.guild,{eventType:'member.join',targetId:m.id,data:{summary:`${m.user.tag} joined the server.`}}).catch(console.error));
client.on('guildMemberRemove', m => sendAuditLog(client,m.guild,{eventType:'member.leave',targetId:m.id,data:{summary:`${m.user.tag} left the server.`}}).catch(console.error));
client.on('messageDelete', msg => {
  if (filteredMessageIds.delete(msg.id)) return;
  if (!msg.guild || !msg.author || msg.author.bot || msg.author.id === client.user?.id) return;
  sendAuditLog(client, msg.guild, { eventType:'message.delete', actorId:msg.author.id, targetId:msg.channelId, data:{ channelName:msg.channel?.name, messageId:msg.id, authorId:msg.author.id, createdTimestamp:msg.createdTimestamp, content:msg.content, attachments:msg.attachments?.size, attachmentUrls:[...msg.attachments.values()].map(a => a.url), summary:'A message was deleted.' } }).catch(console.error);
});
client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!newMsg.guild || (oldMsg.content === newMsg.content && oldMsg.attachments?.size === newMsg.attachments?.size)) return;
  const message = newMsg.partial ? await newMsg.fetch().catch(() => newMsg) : newMsg;
  const author = message.author;
  if (!author || author.bot || author.id === client.user?.id) return;
  sendAuditLog(client, message.guild, { eventType:'message.edit', actorId:author.id, targetId:message.channelId, data:{ channelName:message.channel?.name, messageId:message.id, authorId:author.id, createdTimestamp:message.createdTimestamp, before:oldMsg.content, after:message.content, attachmentUrls:[...message.attachments.values()].map(a => a.url), previousAttachmentUrls:[...(oldMsg.attachments?.values?.() ?? [])].map(a => a.url), summary:'A message was edited.' } }).catch(console.error);
});
client.on('roleCreate', role => sendAuditLog(client,role.guild,{eventType:'role.create',targetId:role.id,data:{summary:`Role **${role.name}** was created.`}}).catch(console.error));
client.on('roleDelete', role => sendAuditLog(client,role.guild,{eventType:'role.delete',targetId:role.id,data:{summary:`Role **${role.name}** was deleted.`}}).catch(console.error));
client.on('channelCreate', channel => { if(channel.guild) sendAuditLog(client,channel.guild,{eventType:'channel.create',targetId:channel.id,data:{summary:`Channel **${channel.name}** was created.`}}).catch(console.error); });
client.on('channelDelete', channel => { if(channel.guild) sendAuditLog(client,channel.guild,{eventType:'channel.delete',targetId:channel.id,data:{summary:`Channel **${channel.name}** was deleted.`}}).catch(console.error); });
client.on('interactionCreate', async interaction => {
  if (interaction.isModalSubmit() && interaction.customId === 'confession_submit') {
    try {
      const content=interaction.fields.getTextInputValue('confession_content').trim();
      const channelId=await getConfessionChannel(interaction.guildId);
      if(!channelId) return interaction.reply({content:'💌 Confessions are not set up yet. Ask an administrator to run /confession-setup.',ephemeral:true});
      const row=await createConfession({guildId:interaction.guildId,authorId:interaction.user.id,content});
      const confessionEmbed=new EmbedBuilder().setColor(0xf3a6c7).setTitle('💌 Confession (#'+row.confession_number+')').setDescription('> '+content.replace(/\n/g,'\n> ')+'\n\nHey anon! Please use this space wisely.');
      const buttons=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confession_submit_again').setLabel('Submit a confession (ง •̀_•́)ง').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('confession_reply:'+row.id).setLabel('Reply ◎☆').setStyle(ButtonStyle.Danger)
      );
      const channel=await client.channels.fetch(channelId).catch(()=>null);
      if(!channel?.isTextBased()) return interaction.reply({content:'The configured confession channel is unavailable.',ephemeral:true});
      const message=await channel.send({embeds:[confessionEmbed],components:[buttons]});
      await attachConfessionMessage(row.id,channelId,message.id);
      await sendAuditLog(client,interaction.guild,{eventType:'confession.create',actorId:interaction.user.id,targetId:channelId,data:{summary:'A new confession was submitted.',confession:content,confessionId:row.confession_number,serverName:interaction.guild?.name ?? 'this server'}});
      return interaction.reply({content:'💌 Your confession was submitted anonymously.',ephemeral:true});
    } catch(error) {
      console.error('[CONFESSION]',error);
      return interaction.reply({content:'Yachiyo could not save that confession. Please try again.',ephemeral:true});
    }
  }
  if (interaction.isModalSubmit() && interaction.customId.startsWith('confession_reply:')) {
    try {
      const parts=interaction.customId.split(':');
      const confessionId=parts[1];
      const mode=parts[2];
      const content=interaction.fields.getTextInputValue('confession_reply_content').trim();
      const confession=await getConfession(confessionId,interaction.guildId);
      if(!confession) return interaction.reply({content:'That confession no longer exists.',ephemeral:true});
      await createConfessionReply({confessionId,guildId:interaction.guildId,authorId:interaction.user.id,mode,content});
      const serverName=interaction.guild?.name ?? 'this server';
      const anonymousEmbed=new EmbedBuilder().setColor(0xf3a6c7).setTitle('💬 Anonymous reply • '+serverName+' • Confession #'+confession.confession_number).setDescription('> '+content.replace(/\n/g,'\n> ')+'\n\n*Anonymous reply from Yachiyo.*');
      if(mode==='thread') {
        const channel=await client.channels.fetch(confession.channel_id).catch(()=>null);
        const message=channel?.messages?.fetch?await channel.messages.fetch(confession.message_id).catch(()=>null):null;
        if(!message) return interaction.reply({content:'The original confession message could not be found.',ephemeral:true});
        const thread=message.thread??await message.startThread({name:'Confession #'+confession.confession_number+' replies',autoArchiveDuration:1440});
        const threadReply=await thread.send({embeds:[anonymousEmbed]});
        const originalSender=await client.users.fetch(confession.author_user_id).catch(()=>null);
        if(originalSender && originalSender.id!==interaction.user.id) {
          const threadUrl='https://discord.com/channels/'+interaction.guildId+'/'+thread.id+'/'+threadReply.id;
          await originalSender.send({
            embeds:[new EmbedBuilder().setColor(0xf3a6c7).setTitle('💬 Someone replied to your confession').setDescription('An anonymous reply was added to **'+serverName+' • Confession #'+confession.confession_number+'**.\n\nUse the button below to view the thread.')],
            components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open Thread').setStyle(ButtonStyle.Link).setURL(threadUrl))]
          }).catch(()=>null);
        }
      } else {
        const recipient=await client.users.fetch(confession.author_user_id).catch(()=>null);
        if(!recipient) return interaction.reply({content:'The confession sender could not be reached.',ephemeral:true});
        await recipient.send({embeds:[anonymousEmbed]}).catch(()=>null);
      }
      await sendAuditLog(client,interaction.guild,{eventType:'confession.reply',actorId:interaction.user.id,targetId:confession.channel_id,data:{channelName:interaction.guild.channels.cache.get(confession.channel_id)?.name ?? 'confessions',summary:'An anonymous '+mode+' reply was sent for confession #'+confession.confession_number+'.',confession:content,confessionId:confession.confession_number,serverName}});
      return interaction.reply({content:'✅ Your anonymous reply was sent.',ephemeral:true});
    } catch(error) {
      console.error('[CONFESSION_REPLY]',error);
      return interaction.reply({content:'Yachiyo could not send that reply.',ephemeral:true});
    }
  }
  if (interaction.isButton() && interaction.customId === 'confession_submit_again') {
    const modal=new ModalBuilder().setCustomId('confession_submit').setTitle('☾ Send a private confession');
    const input=new TextInputBuilder().setCustomId('confession_content').setLabel('What would you like to confess?').setStyle(TextInputStyle.Paragraph).setPlaceholder('Write your confession here...').setRequired(true).setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
  if (interaction.isButton() && interaction.customId === 'introduction_get_template') {
    const settings = await getIntroductionSettings(interaction.guildId);
    if (!settings) return interaction.reply({content:'Introduction is not set up yet.', ephemeral:true});
    return interaction.reply({content:'Copy this template, fill every field, then send it in <#' + settings.channel_id + '>:\n```\n' + settings.template + '\n```', ephemeral:true});
  }
  if (interaction.isButton() && interaction.customId.startsWith('confession_reply:')) {
    const confessionId=interaction.customId.split(':')[1];
    const options=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confession_reply_option:'+confessionId+':thread').setLabel('Reply Thread').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('confession_reply_option:'+confessionId+':private').setLabel('Reply Privately').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({content:'Choose how you want to reply anonymously:',components:[options],ephemeral:true});
  }
  if (interaction.isButton() && interaction.customId.startsWith('confession_reply_option:')) {
    const parts=interaction.customId.split(':');
    const modal=new ModalBuilder().setCustomId('confession_reply:'+parts[1]+':'+parts[2]).setTitle(parts[2]==='thread'?'Reply in confession thread':'Reply privately');
    const input=new TextInputBuilder().setCustomId('confession_reply_content').setLabel('Anonymous reply').setStyle(TextInputStyle.Paragraph).setPlaceholder('Write your reply...').setRequired(true).setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
  if (interaction.isButton() && (interaction.customId === 'rod_upgrade' || interaction.customId === 'rod_evolve')) {
    try {
      const b = await (await import('./services/economyService.js')).balance(interaction.user.id);
      const current = await getRod(interaction.user.id);
      const rod = interaction.customId === 'rod_upgrade'
        ? await upgradeRod(interaction.user.id, Number(b.wallet))
        : await evolveRod(interaction.user.id, Number(b.wallet));
      const nextTier = ROD_TIERS.find(tier => tier.level === rod.level + 1) ?? null;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rod_upgrade').setLabel(rod.upgradeLevel < rod.upgradeMax ? 'Upgrade Rod' : 'Fully Upgraded').setEmoji('⬆️').setStyle(ButtonStyle.Primary).setDisabled(rod.upgradeLevel >= rod.upgradeMax)
      );
      if (nextTier) row.addComponents(new ButtonBuilder().setCustomId('rod_evolve').setLabel('Evolve Rod').setEmoji('✨').setStyle(ButtonStyle.Success).setDisabled(rod.upgradeLevel < rod.upgradeMax));
      const title = interaction.customId === 'rod_evolve' ? '✨ Rod evolved' : '⬆️ Rod upgraded';
      const text = interaction.customId === 'rod_evolve'
        ? 'Your new **' + rod.tier.name + '** begins at **1/' + rod.upgradeMax + '**. Keep upgrading to reveal its full cosmic power.'
        : '**' + rod.tier.name + '** is now at **' + rod.upgradeLevel + '/' + rod.upgradeMax + '**.\n🍀 Luck: **+' + rod.luck + '%**\n💎 Value: **+' + rod.value + '%**' + (rod.upgradeLevel >= rod.upgradeMax ? '\n\n✨ Ready to evolve.' : '\n\nNext upgrade: **' + rod.nextUpgradeCost.toLocaleString() + '** coins.');
      return interaction.update({embeds:[new EmbedBuilder().setColor(0xf3a6c7).setTitle(title).setDescription(text)],components:[row]});
    } catch(error) {
      return interaction.reply({content:'Yachiyo says: '+error.message,ephemeral:true});
    }
  }
  if (interaction.isButton() && interaction.customId.startsWith('fish_buy:')) {
    const itemId=interaction.customId.split(':')[1];
    const labels={luck_drink:'🍀 Luck Drink',value_drink:'💎 Value Drink'};
    try {
      await buyItem(interaction.user.id,itemId,1000);
      return interaction.reply({content:'✅ '+labels[itemId]+' added to your cosmic pouch. Use /fishdrink to activate it.',ephemeral:true});
    } catch(error) {
      return interaction.reply({content:'Yachiyo says: '+error.message,ephemeral:true});
    }
  }
  if (interaction.isButton() && /^(fish_almanac_prev|fish_almanac_next):/.test(interaction.customId)) {
    const [action, rawPage] = interaction.customId.split(':');
    const rows = await fishCollection(interaction.user.id);
    const page = Number(rawPage) + (action.endsWith('next') ? 1 : -1);
    const view = buildAlmanacView(rows, page, interaction.user.username);
    return interaction.update({ embeds: [view.embed], components: [view.controls] });
  }
  if (interaction.isButton()) {
    if (interaction.customId === 'fish_again') { const fishChannel=await getFishChannel(interaction.guildId); if(fishChannel && interaction.channelId!==fishChannel) return interaction.reply({content:'🎣 Fishing is only available in <#'+fishChannel+'>.',ephemeral:true}); return fishAgain(interaction); }
    if (interaction.customId === 'fish_inventory') {
      const rows = await itemInventory(interaction.user.id);
      const labels = { luck_drink: '🍀 Luck Drink', value_drink: '💎 Value Drink', speed_drink: '⚡ Speed Drink' };
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder()
          .setColor(0xf3a6c7)
          .setTitle('👜 ' + interaction.user.username + '’s Cosmic Pouch')
          .setDescription(rows.length ? rows.map(x => '**' + (labels[x.item_id] || x.item_id) + '** • ×' + x.quantity).join('\n') : '*Your pouch is empty. Visit /fishshop to collect a drink.*')
          .setFooter({ text: 'Fish are recorded in your Fish Almanac.' })],
      });
    }

    if (interaction.customId === 'fish_almanac') {
      const rows = await fishCollection(interaction.user.id);
      const view = buildAlmanacView(rows, 0, interaction.user.username);
      return interaction.reply({ephemeral:true, embeds:[view.embed], components:[view.controls]});
    }
    if (interaction.customId === 'fish_effects') {
      const effects = await getActiveEffects(interaction.user.id);
      const labels = { luck_drink: '🍀 Luck Drink', value_drink: '💎 Value Drink', speed_drink: '⚡ Speed Drink' };
      const body = effects.length
        ? effects.map(effect => '**' + (labels[effect.item_id] || effect.item_id) + '** • ' + Math.max(0, effect.seconds_left) + 's remaining').join('\n')
        : '*No active buffs right now.*';
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder()
          .setColor(0x8e7dff)
          .setTitle('🧪 Active Tide Effects')
          .setDescription(body)
          .setFooter({ text: 'Drink effects are stored in your global fishing profile.' })],
      });
    }
  }

  if (interaction.isChatInputCommand()) {
    handleCommand(interaction).catch(async error => {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) await interaction.reply({content:'Yachiyo encountered an error.',ephemeral:true});
    });
  }
});
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  const introductionSettings = await getIntroductionSettings(message.guild.id).catch(() => null);
  if (introductionSettings && message.channelId === introductionSettings.channel_id) {
    const isStaff = message.member?.permissions?.has(PermissionFlagsBits.Administrator) || message.member?.permissions?.has(PermissionFlagsBits.ManageGuild) || message.member?.permissions?.has(PermissionFlagsBits.ManageMessages);
    const valid = isIntroductionTemplateValid(message.content, introductionSettings.template);
    const count = await getIntroductionCount(message.guild.id, message.author.id);
    if (!isStaff && (!valid || count >= 1)) {
      filteredMessageIds.add(message.id);
      await message.delete().catch(() => null);
      return;
    }
    if (!isStaff && valid) await recordIntroduction(message.guild.id, message.author.id);
    setTimeout(() => client.emit('introductionPanelRefresh', message.guild.id), 3000);
  }
  try {
    const settings = await getCurseSettings(message.guild.id);
    const matchedWords = settings.enabled ? findMatchedCurseWords(message.content, settings.words) : [];
    if (matchedWords.length) {
      filteredMessageIds.add(message.id);
      await message.delete().catch(() => null);
      const warningCounts = [];
      for (const word of matchedWords) {
        warningCounts.push({ word, count: await recordCurseWarning({ guildId: message.guild.id, userId: message.author.id, word }) });
      }
      const timeoutRequested = warningCounts.some(item => item.count >= 3);
      let timeoutApplied = false;
      if (timeoutRequested && message.member?.moderatable) {
        timeoutApplied = Boolean(await message.member.timeout(60_000, 'Curse filter: ' + matchedWords.join(', ')).then(() => true).catch(() => false));
      }
      const lines = warningCounts.map(item => '**' + item.word + '** — warning ' + item.count + '/3').join('\n');
      const warning = await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff6b9d)
          .setTitle('⚠️ Please watch your words')
          .setDescription('Your message was removed because it contained: **' + matchedWords.join('**, **') + '**.\n\n' + lines + (timeoutApplied ? '\n\nThird warning reached — you are timed out for **1 minute**.' : '\n\nThree warnings for the same word result in a 1-minute timeout.'))],
      }).catch(() => null);
      if (warning) setTimeout(() => warning.delete().catch(() => null), 10_000);
      await sendAuditLog(client, message.guild, {
        eventType: 'moderation.curse_warning',
        actorId: message.author.id,
        targetId: message.channelId,
        data: {
          channelName: message.channel?.name ?? 'unknown-channel',
          matchedWords,
          warningCounts,
          timeoutApplied,
          content: message.content,
          summary: message.author.tag + ' used a filtered word.',
        },
      });
      return;
    }
  } catch (error) {
    console.error('[CURSE_FILTER]', error);
  }
  const prefix = process.env.PREFIX || '.';
  if (!message.content.startsWith(prefix)) return;
  const [name] = message.content.slice(prefix.length).trim().split(/\s+/);
  if (name === 'ping') return message.reply('Yachiyo is watching over this server.');
  if (name === 'balance') {
    const { balance } = await import('./services/economyService.js');
    const b = await balance(message.author.id);
    return message.reply('☾ You have **' + b.wallet.toLocaleString() + '** global coins.');
  }
});
client.on('error', error => console.error('[DISCORD]', error));

client.login(process.env.DISCORD_TOKEN);
