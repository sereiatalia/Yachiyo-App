import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';
const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
const route=process.env.DISCORD_GUILD_ID?Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID,process.env.DISCORD_GUILD_ID):Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
await rest.put(route,{body:commands});
console.log(`Deployed ${commands.length} commands.`);
