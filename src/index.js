import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleCommand } from './commands.js';
import { ensureGuild } from './services/guildService.js';

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => console.log(`Yachiyo is online as ${client.user.tag}`));
client.on('guildCreate', guild => ensureGuild(guild.id).catch(console.error));
client.on('interactionCreate', interaction => { if (interaction.isChatInputCommand()) handleCommand(interaction).catch(async e => { console.error(e); if (!interaction.replied) await interaction.reply({content:'Yachiyo encountered an error.',ephemeral:true}); }); });
client.on('messageCreate', async message => { if (message.author.bot || !message.guild || !message.content.startsWith(process.env.PREFIX || '.')) return; const [name]=message.content.slice((process.env.PREFIX||'.').length).trim().split(/\s+/); if(name==='ping') return message.reply('Yachiyo is watching over this server.'); if(name==='balance') { const { balance }=await import('./services/economyService.js'); const b=await balance(message.author.id); return message.reply(`☾ You have **${b.wallet.toLocaleString()}** global coins.`); } });
client.on('error', error => console.error('[DISCORD]', error));

client.login(process.env.DISCORD_TOKEN);
