import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const guildIds = (guildId || '').split(',').map(id => id.trim()).filter(Boolean);
const clearGuildIds = (process.env.CLEAR_GUILD_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
const deployGlobally = process.env.DEPLOY_GLOBAL === 'true' || !guildId;
const disabledEconomyCommands = new Set(['balance','daily','work','fish','economy-add','admin-abuse','pay','deposit','withdraw','leaderboard','level','fish-setup','fishinventory','fishalmanac','give','gamble','rob','fishprofile','fishleaderboard','server-shop','server-inventory','fishshop','fishrod','fishstatuseffects','fishdrink','fishmarket','fishaquarium','fishbattle','fishbattlepvp']);
const registeredCommands = commands.filter(command => !disabledEconomyCommands.has(command.name));

if (deployGlobally) {
  // Remove stale guild-scoped copies before publishing the global command list.
  for (const id of [...new Set([...guildIds, ...clearGuildIds])]) {
    await rest.put(Routes.applicationGuildCommands(applicationId, id), { body: [] });
    console.log(`Cleared guild-scoped commands for ${id}.`);
  }
  await rest.put(Routes.applicationCommands(applicationId), { body: registeredCommands });
  console.log(`Deployed ${commands.length} global commands.`);
  console.log('[COMMANDS] '+commands.map(command=>command.name).join(', '));
} else {
  for (const configuredGuildId of guildIds) await rest.put(Routes.applicationGuildCommands(applicationId, configuredGuildId), { body: registeredCommands });
  console.log(`Deployed ${commands.length} guild commands.`);
  console.log('[COMMANDS] '+commands.map(command=>command.name).join(', '));
  await rest.put(Routes.applicationCommands(applicationId), { body: [] });
  console.log('Cleared stale global commands.');
}
