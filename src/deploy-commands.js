import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const deployGlobally = process.env.DEPLOY_GLOBAL === 'true' || !guildId;
const registeredCommands = commands.filter(command => !['economy-add','fishbattle','fishbattlepvp'].includes(command.name));

if (deployGlobally) {
  await rest.put(Routes.applicationCommands(applicationId), { body: registeredCommands });
  console.log(`Deployed ${commands.length} global commands.`);
  console.log('[COMMANDS] '+commands.map(command=>command.name).join(', '));

  // Remove stale guild-scoped copies so Discord does not show duplicate commands.
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: [] });
    console.log(`Cleared guild-scoped commands for ${guildId}.`);
  }
} else {
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: registeredCommands });
  console.log(`Deployed ${commands.length} guild commands.`);
  console.log('[COMMANDS] '+commands.map(command=>command.name).join(', '));
}
