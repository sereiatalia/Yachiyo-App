import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleCommand } from './commands.js';
import { ensureGuild } from './services/guildService.js';
import { sendAuditLog } from './services/auditService.js';

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => console.log(`Yachiyo is online as ${client.user.tag}`));
client.on('guildCreate', guild => ensureGuild(guild.id).catch(console.error));
client.on('guildMemberAdd', m => sendAuditLog(client,m.guild,{eventType:'member.join',targetId:m.id,data:{summary:`${m.user.tag} joined the server.`}}).catch(console.error));
client.on('guildMemberRemove', m => sendAuditLog(client,m.guild,{eventType:'member.leave',targetId:m.id,data:{summary:`${m.user.tag} left the server.`}}).catch(console.error));
client.on('messageDelete', msg => { if(msg.guild) sendAuditLog(client,msg.guild,{eventType:'message.delete',actorId:msg.author?.id,targetId:msg.channelId,data:{summary:`A message was deleted in <#${msg.channelId}>.`}}).catch(console.error); });
client.on('messageUpdate', (oldMsg,newMsg) => { if(newMsg.guild && oldMsg.content!==newMsg.content) sendAuditLog(client,newMsg.guild,{eventType:'message.edit',actorId:newMsg.author?.id,targetId:newMsg.channelId,data:{summary:`A message was edited in <#${newMsg.channelId}>.`}}).catch(console.error); });
client.on('roleCreate', role => sendAuditLog(client,role.guild,{eventType:'role.create',targetId:role.id,data:{summary:`Role **${role.name}** was created.`}}).catch(console.error));
client.on('roleDelete', role => sendAuditLog(client,role.guild,{eventType:'role.delete',targetId:role.id,data:{summary:`Role **${role.name}** was deleted.`}}).catch(console.error));
client.on('channelCreate', channel => { if(channel.guild) sendAuditLog(client,channel.guild,{eventType:'channel.create',targetId:channel.id,data:{summary:`Channel **${channel.name}** was created.`}}).catch(console.error); });
client.on('channelDelete', channel => { if(channel.guild) sendAuditLog(client,channel.guild,{eventType:'channel.delete',targetId:channel.id,data:{summary:`Channel **${channel.name}** was deleted.`}}).catch(console.error); });
client.on('interactionCreate', interaction => { if (interaction.isChatInputCommand()) handleCommand(interaction).catch(async e => { console.error(e); if (!interaction.replied) await interaction.reply({content:'Yachiyo encountered an error.',ephemeral:true}); }); });
client.on('messageCreate', async message => { if (message.author.bot || !message.guild || !message.content.startsWith(process.env.PREFIX || '.')) return; const [name]=message.content.slice((process.env.PREFIX||'.').length).trim().split(/\s+/); if(name==='ping') return message.reply('Yachiyo is watching over this server.'); if(name==='balance') { const { balance }=await import('./services/economyService.js'); const b=await balance(message.author.id); return message.reply(`☾ You have **${b.wallet.toLocaleString()}** global coins.`); } });
client.on('error', error => console.error('[DISCORD]', error));

client.login(process.env.DISCORD_TOKEN);
