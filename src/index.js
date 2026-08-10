import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, PermissionFlagsBits, REST, Routes, ChannelType } from 'discord.js';
import { commands, handleCommand } from './commands.js';
import { ensureGuild, getFishChannel, getVoiceChannels } from './services/guildService.js';
import { sendAuditLog } from './services/auditService.js';
import { fishInventory, fishAlmanac, fishCollection } from './services/economyService.js';
import { buildAlmanacView } from './ui/almanac.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from 'discord.js';
import { fishAgain } from './handlers/fishing.js';
import { ROD_TIERS, buyItem, getRod, upgradeRod, evolveRod, getActiveEffects, itemInventory } from './services/fishingProgression.js';
import { createConfession, getConfessionChannel, attachConfessionMessage, getConfession, createConfessionReply } from './services/confessionService.js';
import { getCurseSettings, findMatchedCurseWords, recordCurseWarning } from './services/curseService.js';
import { getIntroductionSettings, recordIntroduction, setIntroductionPanelMessage, renderServerEmojis, getIntroductionByMessageId, resetIntroduction } from './services/introductionService.js';
import { getGiveaway, getGiveawayByMessage, setGiveawayEmoji, addGiveawayEntry, getGiveawayEntries, finishGiveaway } from './services/giveawayService.js';
import { getRules, saveRulesPanel, updateRule } from './services/rulesService.js';
import { getTicketSettings, setTicketPanel, createTicket, getTicketByChannel, deleteTicket, getTicketAccessRoles } from './services/ticketService.js';
import { joinVoiceChannel, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { recordBump, getBumpTimer, getBumpPanel, setBumpPanelMessage, saveBumpReminder, markBumpReminderNotified, pendingBumpReminders } from './services/bumpService.js';
import { getServerInfo, saveServerInfoPanel, updateServerInfo, getServerInfoStaffRoles, getProfileStats, recordProfileMessage, replaceProfileMessageCounts } from './services/serverInfoService.js';
import { getOfflineBrainReply } from './services/offlineBrainService.js';

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required');

const filteredMessageIds = new Set();
const introductionPanelTimers = new Map();
const ticketPanelTimers = new Map();
const ticketPanelMessages = new Map();
const voiceConnections = new Map();
const CARL_BOT_ID = '235148962103951360';
const pendingBumps = new Map();
const bumpReminderTimers = new Map();
const profileRecounts = new Set();

function scheduleBumpReminder(guildId, userId, remindAt) {
  const key=guildId+':'+userId; clearTimeout(bumpReminderTimers.get(key));
  const delay=Math.max(0,new Date(remindAt).getTime()-Date.now());
  bumpReminderTimers.set(key,setTimeout(async()=>{ const user=await client.users.fetch(userId).catch(()=>null); if(user) await user.send('₊˚⊹ᰔ Your Carl-bot bump cooldown is over. You can use `/bump` again now!').catch(()=>null); await markBumpReminderNotified(guildId,userId).catch(console.error); },delay));
}

async function keepVoiceConnection(guildId, channelId) {
  const guild=client.guilds.cache.get(guildId); const channel=await client.channels.fetch(channelId).catch(()=>null);
  if(!guild || !channel?.isVoiceBased()) throw new Error('Voice channel unavailable.');
  const old=voiceConnections.get(guildId); old?.destroy();
  const connection=joinVoiceChannel({channelId:channel.id,guildId:guild.id,adapterCreator:guild.voiceAdapterCreator,selfDeaf:false,selfMute:true});
  voiceConnections.set(guildId,connection);
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try { await entersState(connection, VoiceConnectionStatus.Ready, 5_000); }
    catch { if (voiceConnections.get(guildId)===connection) { connection.destroy(); setTimeout(()=>keepVoiceConnection(guildId,channelId).catch(console.error),2_000); } }
  });
  connection.on('error', error => console.error('[VOICE]', error));
}
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
  for (const voice of await getVoiceChannels().catch(() => [])) keepVoiceConnection(voice.guild_id, voice.voice_channel_id).catch(console.error);
  for (const reminder of await pendingBumpReminders().catch(() => [])) scheduleBumpReminder(reminder.guild_id,reminder.user_id,reminder.remind_at);
});
client.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.id !== client.user?.id || newState.channelId) return;
  const voice = voiceConnections.get(newState.guild.id);
  if (voice) setTimeout(() => keepVoiceConnection(newState.guild.id, voice.joinConfig.channelId).catch(console.error), 2000);
});
client.on('voiceJoinRequest', (guildId, channelId) => keepVoiceConnection(guildId, channelId).catch(console.error));
client.on('giveawayEnd', async giveawayId => {
  const giveaway = await getGiveaway(giveawayId).catch(() => null);
  if (!giveaway || giveaway.status !== 'active' || !giveaway.emoji) return;
  const entries = await getGiveawayEntries(giveawayId);
  const winners = entries.sort(() => Math.random() - 0.5).slice(0, giveaway.winner_count);
  await finishGiveaway(giveawayId, winners);
  const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
  if (channel?.isTextBased()) await channel.send('🎉 Giveaway **#' + giveawayId + '** ended! Winner(s): ' + (winners.length ? winners.map(id => '<@' + id + '>').join(', ') : 'No eligible participants.') );
});
client.on('rulesPanelRefresh', async guildId => {
  const rules=await getRules(guildId).catch(()=>null); if(!rules) return;
  const channel=await client.channels.fetch(rules.channel_id).catch(()=>null); if(!channel?.isTextBased()) return;
  if(rules.panel_message_id) { const old=await channel.messages.fetch(rules.panel_message_id).catch(()=>null); if(old?.author?.id===client.user?.id) await old.delete().catch(()=>null); }
  const menu=new StringSelectMenuBuilder().setCustomId('rules_section_select').setPlaceholder('୨୧ Browse the rulebook').addOptions(rules.sections.map(s=>({label:s.section_number.toString().padStart(3,'0')+' · '+s.title,value:String(s.section_number)})));
  const panelEmbed=new EmbedBuilder().setColor(0xd9b8e8).setTitle('°❀⋆.ೃ࿔*:･°❀⋆.ೃ࿔*:･\n📖  RULE BOOK').setDescription('₊˚⊹ᰔ  Welcome to our little corner of the server.\n\nBy remaining in this server, you agree to follow all rules listed below. These guidelines help keep our community safe, comfortable, and welcoming.\n\n°❀⋆.ೃ࿔*:･°❀⋆.ೃ࿔*:･').setFooter({text:'♡ please help keep the server warm and safe ♡'}); if(rules.banner_url) panelEmbed.setImage(rules.banner_url);
  const panel=await channel.send({embeds:[panelEmbed],components:[new ActionRowBuilder().addComponents(menu)]});
  await saveRulesPanel(guildId,panel.id);
});
async function createServerInfoEmbed(guild, info) {
  const owner=await guild.fetchOwner().catch(()=>null);
  const created=Math.floor(guild.createdTimestamp/1000);
  const embed=new EmbedBuilder().setColor(0xf3a6c7).setTitle('°❀⋆.ೃ࿔*:･  '+info.title+'  °❀⋆.ೃ࿔*:･').setDescription(`${info.description}\n\n₊˚⊹ᰔ **Server Name:** ${guild.name}\n˚. ᵎᵎ **Date Created:** <t:${created}:D>\n⭑.ᐟ **Server Owner:** ${owner ? owner.user.tag : 'Unavailable'}\n⊹ ࣪ ˖ **Members:** ${guild.memberCount.toLocaleString()}\n\n♡ ${info.extra_info}`).setFooter({text:'‎ꫂ᭪݁ Yachiyo • server information'});
  if(info.banner_url) embed.setImage(info.banner_url);
  return embed;
}
client.createServerInfoEmbed=createServerInfoEmbed;
client.profileRecounts=profileRecounts;
client.recountProfiles=async guild => {
  if(profileRecounts.has(guild.id)) throw new Error('Recount already running');
  profileRecounts.add(guild.id);
  try {
    const counts=new Map(); let messages=0, channels=0;
    const readable=[...guild.channels.cache.values()].filter(channel=>channel.isTextBased?.() && channel.messages?.fetch && channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.ViewChannel));
    for(const channel of readable) {
      channels++; let before;
      while(true) {
        const batch=await channel.messages.fetch({limit:100,before}).catch(()=>null);
        if(!batch?.size) break;
        for(const message of batch.values()) if(!message.author?.bot) { counts.set(message.author.id,(counts.get(message.author.id)??0)+1); messages++; }
        if(batch.size<100) break;
        before=batch.last().id;
      }
    }
    await replaceProfileMessageCounts(guild.id,counts);
    return {messages,channels};
  } finally { profileRecounts.delete(guild.id); }
};
client.on('serverInfoPanelRefresh', async guildId => {
  const info=await getServerInfo(guildId).catch(()=>null); if(!info) return;
  const channel=await client.channels.fetch(info.channel_id).catch(()=>null); if(!channel?.isTextBased()) return;
  if(info.panel_message_id) { const old=await channel.messages.fetch(info.panel_message_id).catch(()=>null); if(old?.author?.id===client.user?.id) await old.delete().catch(()=>null); }
  const buttons=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('server_info_staffs').setLabel('STAFFS ୨୧').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('server_info_profile').setLabel('YOUR PROFILE ♡').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('server_info_bot').setLabel('SERVER BOT ˚').setStyle(ButtonStyle.Secondary));
  const panel=await channel.send({embeds:[await createServerInfoEmbed(channel.guild,info)],components:[buttons]});
  await saveServerInfoPanel(guildId,panel.id);
});
async function refreshTicketPanel(guildId) {
  const settings=await getTicketSettings(guildId); if(!settings) throw new Error('Ticket setup was not found.');
  const channel=await client.channels.fetch(settings.channel_id).catch(()=>null); if(!channel?.isTextBased()) throw new Error('Yachiyo cannot access the selected ticket channel.');
  if(settings.panel_message_id) { const old=await channel.messages.fetch(settings.panel_message_id).catch(()=>null); if(old?.author?.id===client.user?.id) await old.delete().catch(()=>null); }
  const menu=new StringSelectMenuBuilder().setCustomId('ticket_category_select').setPlaceholder('୨୧ Choose a ticket category').addOptions({label:'Reports',value:'reports',description:'Report a concern to staff'},{label:'Suggestions',value:'suggestions',description:'Share an idea for the server'},{label:'Feedback',value:'feedback',description:'Send feedback to staff'});
  const panel=await channel.send({embeds:[new EmbedBuilder().setColor(0xd9b8e8).setTitle('₊˚⊹ᰔ  Contact Yachiyo’s staff').setDescription('Choose a category below to privately share a report, suggestion, or feedback. A temporary private channel will be created for you.')],components:[new ActionRowBuilder().addComponents(menu)]});
  await setTicketPanel(guildId,panel.id);
}
client.refreshTicketPanel = refreshTicketPanel;
client.on('ticketPanelRefresh', guildId => refreshTicketPanel(guildId).catch(console.error));
client.on('bumpPanelRefresh', async guildId => {
  const settings=await getBumpPanel(guildId).catch(()=>null); if(!settings) return;
  const channel=await client.channels.fetch(settings.channel_id).catch(()=>null); if(!channel?.isTextBased()) return;
  if(settings.panel_message_id) { const old=await channel.messages.fetch(settings.panel_message_id).catch(()=>null); if(old?.author?.id===client.user?.id) await old.delete().catch(()=>null); }
  const panel=await channel.send({embeds:[new EmbedBuilder().setColor(0xd9b8e8).setTitle('°❀⋆.ೃ࿔*:･ BUMP CORNER °❀⋆.ೃ࿔*:･').setDescription('₊˚⊹ᰔ Help the server grow and keep your personal bump streak glowing.\n\nBefore clicking **Remind me to bump**, please use Carl-bot’s `/bump` command first.\n\nYachiyo starts your reminder only after Carl confirms a successful bump. ♡')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bump_remind').setLabel('🔔 Remind me to bump').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('bump_my_status').setLabel('⏳ My timer').setStyle(ButtonStyle.Secondary))]});
  await setBumpPanelMessage(guildId,panel.id);
});
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;
  const giveawayId = client.pendingGiveawayEmoji?.get(reaction.message.id);
  if (giveawayId) {
    const giveaway = await getGiveaway(giveawayId).catch(() => null);
    if (giveaway?.host_user_id === user.id) {
      await setGiveawayEmoji(giveawayId, reaction.emoji.toString());
      client.pendingGiveawayEmoji.delete(reaction.message.id);
      await reaction.message.react(reaction.emoji).catch(() => null);
      await reaction.users.remove(user.id).catch(() => null);
      await reaction.message.channel.send('✅ Giveaway reaction set to ' + reaction.emoji.toString() + '. Members with the required role can now enter!');
      return;
    }
  }
  const giveaway = await getGiveawayByMessage(reaction.message.id);
  if (!giveaway || giveaway.status !== 'active' || giveaway.emoji !== reaction.emoji.toString()) return;
  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (giveaway.required_role_id && !member?.roles.cache.has(giveaway.required_role_id)) return reaction.users.remove(user.id).catch(() => null);
  await addGiveawayEntry(giveaway.id, user.id);
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
  const panel = await channel.send({ embeds: [new EmbedBuilder().setColor(0xf3a6c7).setTitle(renderServerEmojis(settings.panel_title, channel.guild)).setDescription(renderServerEmojis(settings.panel_message, channel.guild))], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('introduction_get_template').setLabel('୨୧ Introduction').setStyle(ButtonStyle.Primary))] });
  await setIntroductionPanelMessage(guildId, panel.id);
}
client.on('guildCreate', guild => ensureGuild(guild.id).catch(console.error));
client.on('guildMemberAdd', m => sendAuditLog(client,m.guild,{eventType:'member.join',targetId:m.id,data:{summary:`${m.user.tag} joined the server.`}}).catch(console.error));
client.on('guildMemberRemove', m => sendAuditLog(client,m.guild,{eventType:'member.leave',targetId:m.id,data:{summary:`${m.user.tag} left the server.`}}).catch(console.error));
client.on('messageDelete', async msg => {
  if (filteredMessageIds.delete(msg.id)) return;
  if (!msg.guild) return;
  const intro = await getIntroductionByMessageId(msg.guild.id, msg.id).catch(() => null);
  if (intro) {
    const settings = await getIntroductionSettings(msg.guild.id).catch(() => null);
    await resetIntroduction(msg.guild.id, intro.user_id).catch(console.error);
    const member = await msg.guild.members.fetch(intro.user_id).catch(() => null);
    if (settings?.reward_role_id && member?.roles.cache.has(settings.reward_role_id)) {
      await member.roles.remove(settings.reward_role_id, 'Introduction message deleted').catch(console.error);
    }
    await sendAuditLog(client, msg.guild, { eventType:'moderation.introduction_deleted', actorId:intro.user_id, targetId:msg.channelId, data:{messageId:msg.id, summary:'An introduction was deleted; its reward role was removed.'} }).catch(console.error);
  }
  if (!msg.author || msg.author.bot || msg.author.id === client.user?.id) return;
  sendAuditLog(client, msg.guild, { eventType:'message.delete', actorId:msg.author.id, targetId:msg.channelId, data:{ channelName:msg.channel?.name, messageId:msg.id, authorId:msg.author.id, createdTimestamp:msg.createdTimestamp, content:msg.content, attachments:msg.attachments?.size, attachmentUrls:[...msg.attachments.values()].map(a => a.url), attachmentDetails:[...msg.attachments.values()].map(a => ({name:a.name,url:a.url,contentType:a.contentType})), summary:'A message was deleted.' } }).catch(console.error);
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
  if (interaction.isButton() && interaction.customId === 'server_info_staffs') {
    const configured=await getServerInfoStaffRoles(interaction.guildId);
    if(!configured.length) return interaction.reply({content:'No staff roles have been added yet.',ephemeral:true});
    await interaction.guild.members.fetch().catch(()=>null);
    const groups=[];
    for(const item of configured) {
      const role=interaction.guild.roles.cache.get(item.role_id) ?? await interaction.guild.roles.fetch(item.role_id).catch(()=>null);
      if(!role) continue;
      const members=[...role.members.values()].filter(member=>!member.user.bot).map(member=>'<@'+member.id+'>');
      const visible=members.slice(0,40);
      groups.push('₊˚⊹ᰔ **'+role.name+'**\n'+(visible.length?visible.join(' • ')+(members.length>visible.length?'\n*+'+(members.length-visible.length)+' more members*':''):'*No members currently hold this role.*'));
    }
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xf3a6c7).setTitle('°❀⋆.ೃ࿔*:･  STAFFS  °❀⋆.ೃ࿔*:･').setDescription(groups.join('\n\n')||'*No available staff roles.*').setFooter({text:'♡ This list updates automatically when roles change.'})],ephemeral:true});
  }
  if (interaction.isButton() && interaction.customId === 'server_info_profile') {
    const member=await interaction.guild.members.fetch(interaction.user.id).catch(()=>null); const stats=await getProfileStats(interaction.guildId,interaction.user.id);
    if(!member) return interaction.reply({content:'I could not load your server profile.',ephemeral:true});
    const roles=[...member.roles.cache.values()].filter(role=>role.id!==interaction.guild.id);
    const joined=Math.floor(member.joinedTimestamp/1000), created=Math.floor(member.user.createdTimestamp/1000);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xf3a6c7).setAuthor({name:member.displayName,iconURL:member.user.displayAvatarURL({extension:'png',size:128})}).setTitle('₊˚⊹ᰔ Your Profile').setDescription(`♡ **Name:** ${member.user.username}\n⭑.ᐟ **Display Name:** ${member.displayName}\n˚. ᵎᵎ **Joined Server:** <t:${joined}:D>\n⊹ ࣪ ˖ **Discord Account:** <t:${created}:D>\n₊˚⊹ᰔ **Messages Sent:** ${Number(stats.message_count).toLocaleString()}\n♡ **Roles:** ${roles.length}\n⸝⸝ **Highest Role:** ${member.roles.highest.id===interaction.guild.id?'None':member.roles.highest}\n⋆.˚ **User ID:** ${member.id}`).setFooter({text:'‎ꫂ᭪݁ Your profile is visible only to you.'})],ephemeral:true});
  }
  if (interaction.isButton() && interaction.customId === 'server_info_bot') return interaction.reply({embeds:[new EmbedBuilder().setColor(0xf3a6c7).setTitle('⭑.ᐟ Meet Yachiyo').setDescription('₊˚⊹ᰔ **Yachiyo** is this server’s cozy little guardian.\n\nShe helps with introductions, tickets, rulebooks, moderation logs, giveaways, reminders, server panels, and more.\n\n♡ Mention me for a small offline English/Filipino helper reply, or use `/help` to explore my commands.').setFooter({text:'Yachiyo • made with care for your community'})],ephemeral:true});
  if (interaction.isButton() && (interaction.customId === 'bump_remind' || interaction.customId === 'bump_my_status')) {
    const next=await getBumpTimer(interaction.guildId,interaction.user.id);
    if(!next || new Date(next)<=new Date()) return interaction.reply({content:'Use Carl-bot’s `/bump` first, then click this after Carla confirms the successful bump.',ephemeral:true});
    const timestamp=Math.floor(new Date(next).getTime()/1000);
    if(interaction.customId === 'bump_my_status') return interaction.reply({content:'⏳ Your next bump is available <t:'+timestamp+':R>.',ephemeral:true});
    await saveBumpReminder(interaction.guildId,interaction.user.id,next); scheduleBumpReminder(interaction.guildId,interaction.user.id,next);
    return interaction.reply({content:'🔔 Reminder saved! I’ll DM you <t:'+timestamp+':R> when it is time to bump again.',ephemeral:true});
  }
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
    const modal=new ModalBuilder().setCustomId('ticket_form:'+interaction.values[0]).setTitle('Submit '+interaction.values[0]+' ticket');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_subject').setLabel('Short subject').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_details').setLabel('Tell us what happened').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000)));
    return interaction.showModal(modal);
  }
  if (interaction.isButton() && interaction.customId === 'ticket_close') {
    const ticket=await getTicketByChannel(interaction.channelId).catch(()=>null); if(!ticket) return interaction.reply({content:'This ticket is already closed.',ephemeral:true});
    await interaction.reply({content:'🕊️ This ticket will close shortly.',ephemeral:true}); await deleteTicket(interaction.channelId).catch(()=>null); return setTimeout(()=>interaction.channel.delete('Ticket closed').catch(()=>null),1500);
  }
  if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_form:')) {
    const settings=await getTicketSettings(interaction.guildId); if(!settings) return interaction.reply({content:'Tickets are not set up yet.',ephemeral:true});
    const category=interaction.customId.split(':')[1], subject=interaction.fields.getTextInputValue('ticket_subject'), details=interaction.fields.getTextInputValue('ticket_details');
    const safe=interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,18)||'member';
    const staffRoles=await getTicketAccessRoles(interaction.guildId);
    const permissions=[{id:interaction.guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},...staffRoles.map(item=>({id:item.role_id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))];
    const channel=await interaction.guild.channels.create({name:'ticket-'+safe,type:ChannelType.GuildText,parent:settings.ticket_category_id ?? undefined,permissionOverwrites:permissions});
    await createTicket({guildId:interaction.guildId,channelId:channel.id,userId:interaction.user.id,category,subject});
    const closeRow=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('Close ticket').setStyle(ButtonStyle.Danger));
    const staffMentions=staffRoles.map(item=>'<@&'+item.role_id+'>').join(' ');
    await channel.send({content:staffMentions||undefined,allowedMentions:{roles:staffRoles.map(item=>item.role_id)},embeds:[new EmbedBuilder().setColor(0xd9b8e8).setAuthor({name:interaction.user.globalName||interaction.user.username,iconURL:interaction.user.displayAvatarURL()}).setTitle('₊˚⊹ᰔ New '+category[0].toUpperCase()+category.slice(1)+' ticket').setDescription('♡ **From:** <@'+interaction.user.id+'>\n⭑ **Subject:** '+subject+'\n\n'+details+'\n\n₊˚⊹ᰔ Staff will be with you shortly.')]});
    const closePanel=await channel.send({embeds:[new EmbedBuilder().setColor(0xd9b8e8).setDescription('♡ When you are finished, use the button below to close this ticket. Staff may also close it when your concern has been resolved.')],components:[closeRow]}); ticketPanelMessages.set(channel.id,closePanel.id);
    return interaction.reply({content:'✅ Your private ticket has been created: <#'+channel.id+'>',ephemeral:true});
  }
  if (interaction.isStringSelectMenu() && interaction.customId === 'rules_section_select') {
    const rules=await getRules(interaction.guildId); const section=rules?.sections.find(s=>String(s.section_number)===interaction.values[0]);
    if(!section) return interaction.reply({content:'That rule section is unavailable.',ephemeral:true});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xd9b8e8).setTitle('⭑.ᐟ  '+String(section.section_number).padStart(3,'0')+' · '+section.title).setDescription(section.content+'\n\n⋆.˚  please help keep the community comfortable  ⋆.˚')],ephemeral:true});
  }
  if (interaction.isModalSubmit() && interaction.customId.startsWith('rules_edit:')) {
    const section=Number(interaction.customId.split(':')[1]); await updateRule(interaction.guildId,section,interaction.fields.getTextInputValue('title').trim(),interaction.fields.getTextInputValue('content').trim()); await interaction.reply({content:'✅ Rule section updated.',ephemeral:true}); return interaction.client.emit('rulesPanelRefresh',interaction.guildId);
  }
  if (interaction.isModalSubmit() && interaction.customId === 'server_info_edit') {
    await updateServerInfo(interaction.guildId,{title:interaction.fields.getTextInputValue('title').trim(),description:interaction.fields.getTextInputValue('description').trim(),extraInfo:interaction.fields.getTextInputValue('extra_info').trim()});
    await interaction.reply({content:'✅ Server information panel updated.',ephemeral:true});
    return interaction.client.emit('serverInfoPanelRefresh',interaction.guildId);
  }
  if (interaction.isModalSubmit() && (interaction.customId === 'introduction_edit_template' || interaction.customId === 'introduction_edit_panel')) {
    try {
      const { getIntroductionSettings, saveIntroductionSettings } = await import('./services/introductionService.js');
      const current = await getIntroductionSettings(interaction.guildId);
      if (!current) return interaction.reply({content:'Introduction is not set up yet.', ephemeral:true});
      const template = interaction.customId === 'introduction_edit_template'
        ? interaction.fields.getTextInputValue('template').trim()
        : current.template;
      const panelTitle = interaction.customId === 'introduction_edit_panel'
        ? interaction.fields.getTextInputValue('panel_title').trim()
        : current.panel_title;
      const panelMessage = interaction.customId === 'introduction_edit_panel'
        ? interaction.fields.getTextInputValue('panel_message').trim()
        : current.panel_message;
      await saveIntroductionSettings({guildId: interaction.guildId, channelId: current.channel_id, template, panelTitle, panelMessage, rewardRoleId: current.reward_role_id});
      await interaction.reply({content:'✅ Introduction ' + (interaction.customId.endsWith('template') ? 'template' : 'panel') + ' updated.', ephemeral:true});
      if (interaction.customId === 'introduction_edit_panel') interaction.client.emit('introductionPanelRefresh', interaction.guildId);
      return;
    } catch (error) {
      console.error('[INTRODUCTION_EDIT]', error);
      return interaction.reply({content:'Yachiyo could not save that introduction edit.', ephemeral:true});
    }
  }
  if (interaction.isModalSubmit() && interaction.customId.startsWith('introduction_setup:')) {
    try {
      const [, channelId, rewardRoleId] = interaction.customId.split(':');
      const settings = await (await import('./services/introductionService.js')).saveIntroductionSettings({
        guildId: interaction.guildId,
        channelId,
        template: interaction.fields.getTextInputValue('template').trim(),
        panelTitle: interaction.fields.getTextInputValue('panel_title').trim(),
        panelMessage: interaction.fields.getTextInputValue('panel_message').trim(),
        rewardRoleId: rewardRoleId || null,
      });
      await interaction.reply({content: '✅ Introduction settings saved. I am refreshing the panel in <#' + channelId + '>.', ephemeral:true});
      return interaction.client.emit('introductionPanelRefresh', interaction.guildId, settings);
    } catch (error) {
      console.error('[INTRODUCTION_SETUP]', error);
      return interaction.reply({content:'Yachiyo could not save the introduction settings.', ephemeral:true});
    }
  }
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
  if (interaction.isModalSubmit() && interaction.customId === 'introduction_submit') {
    try {
      const settings = await getIntroductionSettings(interaction.guildId);
      if (!settings) return interaction.reply({content:'Introduction is not set up yet.', ephemeral:true});
      const channel = await interaction.client.channels.fetch(settings.channel_id).catch(() => null);
      if (!channel?.isTextBased()) return interaction.reply({content:'The configured introduction channel is unavailable.', ephemeral:true});
      const content = interaction.fields.getTextInputValue('introduction_content').trim();
      const posted = await channel.send({
        content: '<@' + interaction.user.id + '>',
        embeds: [new EmbedBuilder()
          .setColor(0xf3a6c7)
          .setAuthor({name: interaction.user.globalName || interaction.user.username, iconURL: interaction.user.displayAvatarURL({ extension: 'png', size: 128 })})
          .setDescription(renderServerEmojis(content, interaction.guild))
          .setFooter({text: 'Yachiyo • member introduction'})]
      });
      await recordIntroduction(interaction.guildId, interaction.user.id, posted.id);
      setTimeout(() => interaction.client.emit('introductionPanelRefresh', interaction.guildId), 3000);
      const role = settings.reward_role_id ? (interaction.guild.roles.cache.get(settings.reward_role_id) ?? await interaction.guild.roles.fetch(settings.reward_role_id).catch(() => null)) : null;
      if (!role) return interaction.reply({content:'✅ Your introduction was posted, but no reward role is configured. Ask an admin to use `/introduction-reward-role`.', ephemeral:true});
      if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) || !role.editable) return interaction.reply({content:'✅ Your introduction was posted, but Yachiyo cannot assign <@&' + role.id + '>. Give Yachiyo Manage Roles and move its bot role above the reward role.', ephemeral:true});
      await interaction.member.roles.add(role, 'Introduction submitted');
      return interaction.reply({content:'✅ Your introduction was posted in <#' + settings.channel_id + '> and you received <@&' + role.id + '>!', ephemeral:true});
    } catch (error) {
      console.error('[INTRODUCTION_SUBMIT]', error);
      return interaction.reply({content:'Yachiyo could not submit your introduction or assign the reward role.', ephemeral:true});
    }
  }
  if (interaction.isButton() && interaction.customId === 'introduction_get_template') {
    const settings = await getIntroductionSettings(interaction.guildId);
    if (!settings) return interaction.reply({content:'Introduction is not set up yet.', ephemeral:true});
    const modal = new ModalBuilder().setCustomId('introduction_submit').setTitle('Submit your introduction');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('introduction_content').setLabel('Your introduction').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000).setValue(settings.template)));
    return interaction.showModal(modal);
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
  if (!message.guild) return;
  const interactionName = message.interactionMetadata?.name ?? message.interaction?.commandName;
  if (interactionName === 'bump') {
    const userId = message.interactionMetadata?.user?.id ?? message.interaction?.user?.id ?? (!message.author.bot ? message.author.id : null);
    if (userId) {
      const key = message.guild.id + ':' + message.channelId;
      pendingBumps.set(key, userId);
      setTimeout(() => pendingBumps.delete(key), 30_000);
    }
  }
  if (message.author.bot && (message.author.id === CARL_BOT_ID || /carl/i.test(message.author.username || message.author.tag || ''))) {
    if (/you'?ve successfully bumped this server/i.test(message.content || '')) {
      const userId = message.interactionMetadata?.user?.id ?? message.interaction?.user?.id ?? pendingBumps.get(message.guild.id + ':' + message.channelId);
      if (userId) await recordBump(message.guild.id, userId, 6).catch(console.error);
    }
    return;
  }
  if (message.author.bot) return;
  await recordProfileMessage(message.guild.id,message.author.id).catch(console.error);
  if (client.user && message.mentions.has(client.user) && !message.content.startsWith(process.env.PREFIX || '.')) {
    const clean=message.content.replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '').trim();
    const reply=await getOfflineBrainReply({text:clean,guild:message.guild,user:message.author.username});
    await message.reply({content:reply,allowedMentions:{repliedUser:false}}).catch(console.error);
  }
  const ticket=await getTicketByChannel(message.channelId).catch(()=>null);
  if (ticket) {
    clearTimeout(ticketPanelTimers.get(message.channelId));
    ticketPanelTimers.set(message.channelId,setTimeout(async()=>{
      const oldId=ticketPanelMessages.get(message.channelId); const old=oldId?await message.channel.messages.fetch(oldId).catch(()=>null):null; if(old) await old.delete().catch(()=>null);
      const panel=await message.channel.send({embeds:[new EmbedBuilder().setColor(0xd9b8e8).setDescription('♡ When you are finished, use the button below to close this ticket. Staff may also close it when your concern has been resolved.')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('Close ticket').setStyle(ButtonStyle.Danger))]}).catch(()=>null); if(panel) ticketPanelMessages.set(message.channelId,panel.id);
    },2000));
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
