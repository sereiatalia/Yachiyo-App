import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleCommand } from './commands.js';
import { ensureGuild, getFishChannel } from './services/guildService.js';
import { sendAuditLog } from './services/auditService.js';
import { fishInventory, fishAlmanac } from './services/economyService.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { fishAgain } from './handlers/fishing.js';
import { createConfession, getConfessionChannel, attachConfessionMessage, getConfession, createConfessionReply } from './services/confessionService.js';

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => console.log(`Yachiyo is online as ${client.user.tag}`));
client.on('guildCreate', guild => ensureGuild(guild.id).catch(console.error));
client.on('guildMemberAdd', m => sendAuditLog(client,m.guild,{eventType:'member.join',targetId:m.id,data:{summary:`${m.user.tag} joined the server.`}}).catch(console.error));
client.on('guildMemberRemove', m => sendAuditLog(client,m.guild,{eventType:'member.leave',targetId:m.id,data:{summary:`${m.user.tag} left the server.`}}).catch(console.error));
client.on('messageDelete', msg => {
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
  if (interaction.isButton()) {
    if (interaction.customId === 'fish_again') { const fishChannel=await getFishChannel(interaction.guildId); if(fishChannel && interaction.channelId!==fishChannel) return interaction.reply({content:'🎣 Fishing is only available in <#'+fishChannel+'>.',ephemeral:true}); return fishAgain(interaction); }
    if (interaction.customId === 'fish_inventory') {
      const rows=await fishInventory(interaction.user.id);
      return interaction.reply({ephemeral:true,embeds:[new EmbedBuilder().setColor(0x4db8e8).setTitle('🎒 '+interaction.user.username+'’s Aquarium').setDescription(rows.length?rows.map(x=>'**'+x.fish_name+'** • ×'+x.quantity).join('\n'):'Your aquarium is empty.')]});
    }
    if (interaction.customId === 'fish_almanac') {
      const rows=await fishAlmanac(interaction.user.id);
      return interaction.reply({ephemeral:true,embeds:[new EmbedBuilder().setColor(0x8e7dff).setTitle('📖 CELESTIAL FISH ALMANAC').setDescription(rows.length?rows.map(x=>'**'+x.rarity+'** — '+x.discovered+' discovered • '+x.caught+' caught').join('\n'):'No discoveries yet.')]});
    }
  }
  if (interaction.isChatInputCommand()) {
    handleCommand(interaction).catch(async error => {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) await interaction.reply({content:'Yachiyo encountered an error.',ephemeral:true});
    });
  }
});
client.on('messageCreate', async message => { if (message.author.bot || !message.guild || !message.content.startsWith(process.env.PREFIX || '.')) return; const [name]=message.content.slice((process.env.PREFIX||'.').length).trim().split(/\s+/); if(name==='ping') return message.reply('Yachiyo is watching over this server.'); if(name==='balance') { const { balance }=await import('./services/economyService.js'); const b=await balance(message.author.id); return message.reply(`☾ You have **${b.wallet.toLocaleString()}** global coins.`); } });
client.on('error', error => console.error('[DISCORD]', error));

client.login(process.env.DISCORD_TOKEN);
