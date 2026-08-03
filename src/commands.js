import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { balance, claim, addMoney } from './services/economyService.js';
import { setLogChannel, ensureGuild } from './services/guildService.js';
export const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check whether Yachiyo is online.'),
  new SlashCommandBuilder().setName('balance').setDescription('View your global Yachiyo balance.').addUserOption(o=>o.setName('user').setDescription('User to view').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily cosmic allowance.'),
  new SlashCommandBuilder().setName('work').setDescription('Work for coins.'),
  new SlashCommandBuilder().setName('fish').setDescription('Go fishing for coins.'),
  new SlashCommandBuilder().setName('economy-add').setDescription('Add global coins to a user.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addUserOption(o=>o.setName('user').setDescription('Target').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder().setName('logs').setDescription('Set the audit-log channel.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addChannelOption(o=>o.setName('channel').setDescription('Text channel').setRequired(true))
].map(c=>c.toJSON());
export async function handleCommand(interaction) {
  await ensureGuild(interaction.guildId);
  const name=interaction.commandName;
  if(name==='ping') return interaction.reply('Yachiyo is watching over this server.');
  if(name==='balance') { const user=interaction.options.getUser('user')??interaction.user; const b=await balance(user.id); return interaction.reply({embeds:[new EmbedBuilder().setColor(0x8e7dff).setTitle('☾ Cosmic Balance').setDescription(`<@${user.id}> has **${b.wallet.toLocaleString()}** coins in their global wallet and **${b.bank.toLocaleString()}** in the bank.`)]}); }
  if(['daily','work','fish'].includes(name)) { try { const r=await claim(interaction.user.id,name); return interaction.reply(`✦ You received **${r.amount.toLocaleString()}** coins.`); } catch(e) { return interaction.reply({content:`Yachiyo says: ${e.message}`,ephemeral:true}); } }
  if(name==='economy-add') { const b=await addMoney(interaction.options.getUser('user').id,interaction.options.getInteger('amount'),'admin'); return interaction.reply(`Added coins. New wallet: **${b.wallet.toLocaleString()}**.`); }
  if(name==='logs') { const channel=interaction.options.getChannel('channel'); await setLogChannel(interaction.guildId,channel.id); return interaction.reply(`Audit logs will be sent to <#${channel.id}>.`); }
}
