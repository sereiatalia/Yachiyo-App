import { buildAlmanacView } from './ui/almanac.js';
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { balance, claim, castFish, addMoney, transfer, bankMove, leaderboard, rollFish, saveFish, fishInventory, fishAlmanac, fishCollection, cooldownRemaining } from './services/economyService.js';
import { FISH_RARITIES } from './config/fishRarities.js';
import { createFishCard } from './ui/fishCard.js';
import { handleFishCommand } from './commands/fishing/fish.js';
import { runPullSequence } from './services/fishingPresentation.js';
import { setLogChannel, setFishChannel, getFishChannel, ensureGuild } from './services/guildService.js';
import { createCase, warn, recentCases } from './services/moderationService.js';
import { sendAuditLog } from './services/auditService.js';
import { setConfessionChannel } from './services/confessionService.js';
import { parseCurseWords, addCurseWords, setCurseWords, setCurseEnabled, getCurseSettings } from './services/curseService.js';
import { getMarketSnapshot, getMarketFish, formatMarketLines, recordSupply } from './services/fishMarketService.js';
import { ROD_TIERS, getRod, upgradeRod, evolveRod, getActiveEffects, getFishingBonuses, buyItem, drinkItem, itemInventory } from './services/fishingProgression.js';
import { DEFAULT_INTRODUCTION_TEMPLATE, getIntroductionStatus, resetIntroduction, saveIntroductionSettings, setProtectedChannel, listProtectedChannels } from './services/introductionService.js';
const YACHIYO_PURPLE = 0x8e7dff;
const YACHIYO_BLUE = 0x4db8e8;
const yEmbed = (title, description, color = YACHIYO_PURPLE) => new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setFooter({ text: 'Yachiyo • Cosmic server manager' });
export const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check whether Yachiyo is online.'),
  new SlashCommandBuilder().setName('help').setDescription('Open Yachiyo’s command center.'),
  new SlashCommandBuilder().setName('balance').setDescription('View your global Yachiyo balance.').addUserOption(o=>o.setName('user').setDescription('User to view').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily cosmic allowance.'),
  new SlashCommandBuilder().setName('work').setDescription('Work for coins.'),
  new SlashCommandBuilder().setName('fish').setDescription('Go fishing for coins.'),
  new SlashCommandBuilder().setName('economy-add').setDescription('Add global coins to a user.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addUserOption(o=>o.setName('user').setDescription('Target').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder().setName('logs').setDescription('Set the audit-log channel.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addChannelOption(o=>o.setName('channel').setDescription('Text channel').setRequired(true))
  ,new SlashCommandBuilder().setName('confession').setDescription('Submit an anonymous confession.').setDMPermission(false)
  ,new SlashCommandBuilder().setName('confession-setup').setDescription('Set the channel where confessions are published.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false).addChannelOption(o=>o.setName('channel').setDescription('Confession channel').setRequired(true))
  ,new SlashCommandBuilder().setName('introduction-setup').setDescription('Set up the member introduction channel.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false).addChannelOption(o=>o.setName('channel').setDescription('Introduction channel').setRequired(true)).addRoleOption(o=>o.setName('reward_role').setDescription('Role awarded after a valid introduction').setRequired(false))
  ,new SlashCommandBuilder().setName('introduction-panel').setDescription('Refresh or edit the introduction panel.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false).addStringOption(o=>o.setName('action').setDescription('Panel action').setRequired(false).addChoices({name:'Refresh panel',value:'refresh'},{name:'Edit panel',value:'edit'}))
  ,new SlashCommandBuilder().setName('introduction-template').setDescription('View or edit the introduction template.').setDMPermission(false).addStringOption(o=>o.setName('action').setDescription('Template action').setRequired(false).addChoices({name:'View template',value:'view'},{name:'Edit template',value:'edit'}))
  ,new SlashCommandBuilder().setName('introduction-reset').setDescription('Reset a member introduction limit.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false).addUserOption(o=>o.setName('user').setDescription('Member to reset').setRequired(true))
  ,new SlashCommandBuilder().setName('introduction-status').setDescription('View introduction system status.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false)
  ,new SlashCommandBuilder().setName('protected-channel').setDescription('Prevent bot moderation from deleting messages in a channel and monitor deletions.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).setDMPermission(false).addChannelOption(o=>o.setName('channel').setDescription('Channel to protect').setRequired(true)).addBooleanOption(o=>o.setName('enabled').setDescription('Enable protection').setRequired(true))
  ,new SlashCommandBuilder().setName('protected-channels').setDescription('List protected moderation channels.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).setDMPermission(false)
  ,new SlashCommandBuilder().setName('fish-setup').setDescription('Set the only channel where fishing is allowed.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false).addChannelOption(o=>o.setName('channel').setDescription('Fishing channel').setRequired(true))
  ,new SlashCommandBuilder().setName('curse-setup').setDescription('Save curse words and activate the server filter.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false).addStringOption(o=>o.setName('words').setDescription('Comma or newline separated words, in any language.').setRequired(true))
  ,new SlashCommandBuilder().setName('curse').setDescription('Activate, deactivate, or view the curse filter.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false).addStringOption(o=>o.setName('action').setDescription('Filter action').setRequired(true).addChoices({name:'Activate',value:'on'},{name:'Deactivate',value:'off'},{name:'View status',value:'status'}))
  ,new SlashCommandBuilder().setName('curse-list').setDescription('View the saved curse words.').setDMPermission(false)
  ,new SlashCommandBuilder().setName('warn').setDescription('Warn a member.').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false))
  ,new SlashCommandBuilder().setName('warnings').setDescription('View recent warnings and cases.').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))
  ,new SlashCommandBuilder().setName('kick').setDescription('Kick a member.').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false))
  ,new SlashCommandBuilder().setName('ban').setDescription('Ban a member.').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false))
  ,new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member.').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(o=>o.setName('minutes').setDescription('Minutes, max 28 days').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false))
  ,new SlashCommandBuilder().setName('purge').setDescription('Delete recent messages.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(o=>o.setName('amount').setDescription('1–100').setRequired(true))
  ,new SlashCommandBuilder().setName('pay').setDescription('Transfer global coins.').addUserOption(o=>o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true))
  ,new SlashCommandBuilder().setName('deposit').setDescription('Move coins into your bank.').addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true))
  ,new SlashCommandBuilder().setName('withdraw').setDescription('Withdraw coins from your bank.').addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true))
  ,new SlashCommandBuilder().setName('leaderboard').setDescription('View the global economy leaderboard.')
  ,new SlashCommandBuilder().setName('unlock').setDescription('Unlock the current channel.').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  ,new SlashCommandBuilder().setName('lock').setDescription('Lock the current channel.').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  ,new SlashCommandBuilder().setName('unban').setDescription('Unban a user.').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addStringOption(o=>o.setName('user_id').setDescription('User ID').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false))
  ,new SlashCommandBuilder().setName('untimeout').setDescription('Remove a member timeout.').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))
  ,new SlashCommandBuilder().setName('fishinventory').setDescription('View your caught fish collection.')
  ,new SlashCommandBuilder().setName('fishalmanac').setDescription('View your fishing discoveries.')
  ,new SlashCommandBuilder().setName('give').setDescription('Give global coins to another user.').addUserOption(o=>o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true))
  ,new SlashCommandBuilder().setName('gamble').setDescription('Risk coins for a chance at a larger reward.').addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o=>o.setName('multiplier').setDescription('Choose your risk and reward multiplier.').setRequired(true).addChoices({name:'x1.5 • Safe • 65% chance',value:'1.5'},{name:'x2 • Balanced • 45% chance',value:'2'},{name:'x3 • Risky • 25% chance',value:'3'}))
  ,new SlashCommandBuilder().setName('rob').setDescription('Attempt to rob another user.').addUserOption(o=>o.setName('user').setDescription('Target').setRequired(true))
  ,new SlashCommandBuilder().setName('fishprofile').setDescription('View a global fishing profile.').addUserOption(o=>o.setName('user').setDescription('User').setRequired(false))
  ,new SlashCommandBuilder().setName('fishleaderboard').setDescription('View the global fishing leaderboard.')
  ,new SlashCommandBuilder().setName('fishshop').setDescription('Open the cosmic fish shop.')
  ,new SlashCommandBuilder().setName('fishrod').setDescription('View or upgrade your fishing rod.').addStringOption(o=>o.setName('action').setDescription('Rod action').setRequired(false).addChoices({name:'View rod',value:'view'},{name:'Upgrade rod',value:'upgrade'},{name:'Evolve rod',value:'evolve'}))
  ,new SlashCommandBuilder().setName('fishstatuseffects').setDescription('View active fishing effects.')
  ,new SlashCommandBuilder().setName('fishdrink').setDescription('Drink a fishing buff.').addStringOption(o=>o.setName('item').setDescription('Buff drink').setRequired(true).addChoices({name:'Luck drink • 5 minutes',value:'luck_drink'},{name:'Value drink • 5 minutes',value:'value_drink'}))
  ,new SlashCommandBuilder().setName('fishmarket').setDescription('View the changing fish market.')
  ,new SlashCommandBuilder().setName('fishaquarium').setDescription('Open your personal fish aquarium.')
  ,new SlashCommandBuilder().setName('fishbattle').setDescription('Battle your equipped fish.')
  ,new SlashCommandBuilder().setName('fishbattlepvp').setDescription('Challenge another fisher.').addUserOption(o=>o.setName('user').setDescription('Opponent').setRequired(true))
].map(c=>c.toJSON());
export async function handleCommand(interaction) {
  await ensureGuild(interaction.guildId);
  const name=interaction.commandName;
  const adminOnly=['economy-add','logs','confession-setup','introduction-setup','introduction-panel','introduction-reset','introduction-status','fish-setup','curse-setup','curse','warn','warnings','kick','ban','timeout','purge','lock','unlock','unban','untimeout'];
  if(adminOnly.includes(name) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({content:'🛡️ Only server administrators can use this command.',ephemeral:true});
  if(name==='ping') return interaction.reply({embeds:[yEmbed('☾ Yachiyo is watching over this server.','✦ The moonlit command center is online and watching this server.',YACHIYO_BLUE)]});
  if(name==='help') return interaction.reply({embeds:[new EmbedBuilder().setColor(0x8e7dff).setTitle('☾ YACHIYO COMMAND CENTER').setDescription('*The moonlit server manager is ready to assist.*').addFields({name:'✦ Economy',value:'`/balance`  `/daily`  `/work`  `/fish`\n`/pay`  `/deposit`  `/withdraw`  `/leaderboard`'},{name:'✦ Fishing',value:'`/fishinventory`  `/fishalmanac`\nUse the buttons on a catch card to explore your collection.'},{name:'✦ Moderation',value:'`/warn`  `/warnings`  `/kick`  `/ban`  `/timeout`\n`/untimeout`  `/unban`  `/purge`  `/lock`  `/unlock`  `/logs`\n`/curse-setup`  `/curse`  `/curse-list`'}).setFooter({text:'Yachiyo • Cosmic server manager'})]});
  if(name==='balance') {
    const user=interaction.options.getUser('user')??interaction.user;
    const b=await balance(user.id);
    const total=b.wallet+b.bank;
    return interaction.reply({embeds:[new EmbedBuilder()
      .setColor(0xf0b6d8)
      .setTitle('💰 '+user.username+' • Balance')
      .setDescription(
        '**Cash:** '+b.wallet.toLocaleString()+' coins\n'+
        '**Bank:** '+b.bank.toLocaleString()+' coins\n'+
        '**Total:** '+total.toLocaleString()+' coins'
      )
      .setFooter({text:'Global economy • shared across every server'})]});
  }
  if(['daily','work'].includes(name)) { try { const r=await claim(interaction.user.id,name); return interaction.reply({embeds:[yEmbed(name==='daily'?'🌙 Daily Cosmic Allowance':'🛠️ Work Complete',`✦ You received **${r.amount.toLocaleString()}** global coins.\n\nYour fortune has been recorded across every server.`)]}); } catch(e) { return interaction.reply({content:`Yachiyo says: ${e.message}`,ephemeral:true}); } }
  if(name==='confession') {
    const modal=new ModalBuilder().setCustomId('confession_submit').setTitle('☾ Send a private confession');
    const input=new TextInputBuilder().setCustomId('confession_content').setLabel('What would you like to confess?').setStyle(TextInputStyle.Paragraph).setPlaceholder('Write your confession here...').setRequired(true).setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
  if(name==='fish-setup') {
    const channel=interaction.options.getChannel('channel');
    await setFishChannel(interaction.guildId,channel.id);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x4db8e8).setTitle('🎣 Celestial fishing grounds prepared').setDescription('Fishing is now restricted to <#'+channel.id+'>.\n\nThe Cast Again buttons will only work there too.')]});
  }
  if(name==='confession-setup') {
    const channel=interaction.options.getChannel('channel');
    await setConfessionChannel(interaction.guildId,channel.id);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xf3a6c7).setTitle('💌 Confession chamber prepared').setDescription('Confessions will now be published in <#'+channel.id+'>.')]});
  }
  if (name === 'introduction-setup') {
    const channel = interaction.options.getChannel('channel');
    const rewardRole = interaction.options.getRole('reward_role');
    const modal = new ModalBuilder().setCustomId('introduction_setup:' + channel.id + ':' + (rewardRole?.id ?? '')).setTitle('Set up introductions');
    const template = new TextInputBuilder().setCustomId('template').setLabel('Introduction template').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000).setValue(DEFAULT_INTRODUCTION_TEMPLATE);
    const title = new TextInputBuilder().setCustomId('panel_title').setLabel('Panel title').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256).setValue('🌷 Introduction Channel');
    const message = new TextInputBuilder().setCustomId('panel_message').setLabel('Panel description / instructions').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000).setValue('Click the button below to get your introduction template.\n\nPlease fill in every field and send it in this channel.');
    modal.addComponents(new ActionRowBuilder().addComponents(template), new ActionRowBuilder().addComponents(title), new ActionRowBuilder().addComponents(message));
    return interaction.showModal(modal);
  }
  if (name === 'introduction-panel') {
    const settings = await getIntroductionStatus(interaction.guildId);
    if (!settings) return interaction.reply({content:'Introduction is not set up yet. Run `/introduction-setup` first.', ephemeral:true});
    if (interaction.options.getString('action') === 'edit') {
      const modal = new ModalBuilder().setCustomId('introduction_edit_panel').setTitle('Edit introduction panel');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_title').setLabel('Panel title').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256).setValue(settings.panel_title)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_message').setLabel('Panel description / instructions').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000).setValue(settings.panel_message))
      );
      return interaction.showModal(modal);
    }
    await interaction.reply({content:'🌷 Refreshing the introduction panel…', ephemeral:true});
    return interaction.client.emit('introductionPanelRefresh', interaction.guildId, settings);
  }
  if (name === 'introduction-template') {
    if (interaction.options.getString('action') === 'edit' && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({content:'🛡️ Only server administrators can edit the introduction template.',ephemeral:true});
    const settings = await getIntroductionStatus(interaction.guildId);
    if (settings && interaction.options.getString('action') === 'edit') {
      const modal = new ModalBuilder().setCustomId('introduction_edit_template').setTitle('Edit introduction template');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('template').setLabel('Introduction template').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000).setValue(settings.template)));
      return interaction.showModal(modal);
    }
    return interaction.reply({content: settings ? '```\n' + settings.template + '\n```' : 'Introduction is not set up yet.', ephemeral:true});
  }
  if (name === 'introduction-reset') {
    const user = interaction.options.getUser('user');
    await resetIntroduction(interaction.guildId, user.id);
    return interaction.reply({content:'✅ Reset the introduction limit for <@' + user.id + '>.', ephemeral:true});
  }
  if (name === 'introduction-status') {
    const settings = await getIntroductionStatus(interaction.guildId);
    if (!settings) return interaction.reply({content:'Introduction is not set up yet.', ephemeral:true});
    return interaction.reply({embeds:[yEmbed('🌷 Introduction status', 'Channel: <#' + settings.channel_id + '>\nAccepted introductions: **' + settings.accepted_count + '**\nMember limit: **1 accepted introduction**\nPanel message: ' + (settings.panel_message_id ? 'connected' : 'not posted'))], ephemeral:true});
  }
  if (name === 'protected-channel') {
    const channel = interaction.options.getChannel('channel');
    const enabled = interaction.options.getBoolean('enabled');
    await setProtectedChannel(interaction.guildId, channel.id, enabled);
    return interaction.reply({content: (enabled ? '🛡️ Protected ' : '✅ Unprotected ') + '<#' + channel.id + '>. Yachiyo will monitor message deletions there.', ephemeral:true});
  }
  if (name === 'protected-channels') {
    const rows = await listProtectedChannels(interaction.guildId);
    return interaction.reply({content: rows.length ? '🛡️ Protected channels:\n' + rows.map(row => '<#' + row.channel_id + '>').join('\n') : 'No protected channels are configured.', ephemeral:true});
  }
  if(name==='curse-setup') {
    const words=parseCurseWords(interaction.options.getString('words'));
    if(!words.length) return interaction.reply({content:'Add at least one word, separated by commas or new lines.',ephemeral:true});
    const savedSettings=await addCurseWords(interaction.guildId,words);
    const savedCount=savedSettings.words?.length??words.length;
    await setCurseEnabled(interaction.guildId,true);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xff6b9d).setTitle('🧼 Curse filter activated').setDescription('Saved **'+savedCount+'** filtered word(s) for this server.\n\nMessages containing a match are removed immediately. Warnings are tracked separately for each user and word; the third warning applies a 1-minute timeout.')]});
  }
  if(name==='curse-list') {
    const settings=await getCurseSettings(interaction.guildId);
    const words=settings.words??[];
    const description=words.length ? words.map((word,index)=>'**'+(index+1)+'.** '+word).join('\n') : '*No curse words have been saved for this server.*';
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xff6b9d).setTitle('🧼 Saved curse words').setDescription(description).setFooter({text:'Administrators manage the saved words with /curse-setup.'})],ephemeral:true});
  }
  if(name==='curse') {
    const action=interaction.options.getString('action');
    const settings=await getCurseSettings(interaction.guildId);
    if(action==='status') return interaction.reply({embeds:[new EmbedBuilder().setColor(settings.enabled?0x42d392:0x8e7dff).setTitle('🧼 Curse filter status').setDescription('Status: **'+(settings.enabled?'ACTIVE':'OFF')+'**\nSaved words: **'+(settings.words?.length??0)+'**\n\nUse `/curse-setup` to replace the list or choose Activate/Deactivate here.')]});
    await setCurseEnabled(interaction.guildId,action==='on');
    return interaction.reply({embeds:[new EmbedBuilder().setColor(action==='on'?0x42d392:0x8e7dff).setTitle(action==='on'?'🧼 Curse filter activated':'🧼 Curse filter deactivated').setDescription(action==='on'?'Filtered messages will be removed and warnings will be recorded.':'The filter is off; saved words remain available for the next activation.')]});
  }

  if(name==='fish') return handleFishCommand(interaction);
  if(name==='fishinventory') { const rows=await itemInventory(interaction.user.id); const labels={luck_drink:'🍀 Luck Drink',value_drink:'💎 Value Drink',speed_drink:'⚡ Speed Drink'}; return interaction.reply({embeds:[new EmbedBuilder().setColor(0xf3a6c7).setTitle('👜 '+interaction.user.username+'’s Cosmic Pouch').setDescription(rows.length?rows.map(x=>'**'+(labels[x.item_id]||x.item_id)+'** • ×'+x.quantity).join('\n'):'*Your pouch is empty. Visit /fishshop to collect a drink.*').setFooter({text:'Fish are recorded in your Fish Almanac.'})]}); }
if(name==='fishalmanac') {
    const rows = await fishCollection(interaction.user.id);
    const view = buildAlmanacView(rows, 0, interaction.user.username);
    return interaction.reply({embeds:[view.embed], components:[view.controls]});
  }    if(name==='give') { try { await transfer(interaction.user.id,interaction.options.getUser('user').id,interaction.options.getInteger('amount')); return interaction.reply({embeds:[yEmbed('🎁 Cosmic Gift Delivered',`<@${interaction.options.getUser('user').id}> received **${interaction.options.getInteger('amount').toLocaleString()}** global coins.`)]}); } catch(e) { return interaction.reply({content:e.message,ephemeral:true}); } }
  if(name==='gamble') { const amount=interaction.options.getInteger('amount'); const multiplier=Number(interaction.options.getString('multiplier')||'2'); const tiers={1.5:{chance:.65,label:'SAFE'},2:{chance:.45,label:'BALANCED'},3:{chance:.25,label:'RISKY'}}; const tier=tiers[multiplier]||tiers[2]; if(amount<1) return interaction.reply({content:'Amount must be positive.',ephemeral:true}); try { const b=await balance(interaction.user.id); if(b.wallet<amount) throw new Error('Insufficient wallet funds.'); const won=Math.random()<tier.chance; const reward=Math.floor(amount*multiplier); await addMoney(interaction.user.id,won?reward:-amount,'gamble'); const after=await balance(interaction.user.id); return interaction.reply({embeds:[new EmbedBuilder().setColor(won?0x42d392:0xe05b67).setTitle('🎲 GAMBLE • x'+multiplier+' 🎲').setDescription(won?'You rolled the dice... and **WON!**':'You rolled the dice... and **LOST!**').addFields({name:'🎲 Wager',value:'**'+amount.toLocaleString()+'** coins',inline:true},{name:won?'💎 Reward':'🌊 Lost',value:'**'+(won?reward:amount).toLocaleString()+'** coins',inline:true},{name:'🍀 Luck Tier',value:'**'+tier.label+'** • '+Math.round(tier.chance*100)+'% chance',inline:true},{name:'💰 New Cash',value:'**'+after.wallet.toLocaleString()+'** coins',inline:false}).setFooter({text:'Higher multipliers bring greater rewards—and slimmer chances.'})]}); } catch(e) { return interaction.reply({content:e.message,ephemeral:true}); } }
  if(name==='rob') { const target=interaction.options.getUser('user'); if(target.id===interaction.user.id) return interaction.reply({content:'You cannot target yourself.',ephemeral:true}); try { const victim=await balance(target.id); const amount=Math.min(victim.wallet,Math.max(25,Math.floor(victim.wallet*.1))); if(amount<25) throw new Error('That user has too little wallet cash to rob.'); const success=Math.random()<.4; if(success) { await addMoney(target.id,-amount,'robbed'); await addMoney(interaction.user.id,amount,'rob'); } return interaction.reply({embeds:[new EmbedBuilder().setColor(success?0xffc857:0xe05b67).setTitle(success?'🕶️ SHADOW HEIST SUCCESS':'🚨 HEIST FOILED').setDescription(success?`You stole **${amount.toLocaleString()}** coins from <@${target.id}>.`:`The cosmic guard caught you before you could escape.`)]}); } catch(e) { return interaction.reply({content:e.message,ephemeral:true}); } }
  if(name==='fishprofile') { const user=interaction.options.getUser('user')||interaction.user; const b=await balance(user.id); const catches=await fishAlmanac(user.id); const total=catches.reduce((n,x)=>n+x.caught,0); return interaction.reply({embeds:[new EmbedBuilder().setColor(0x4db8e8).setAuthor({name:user.displayName,iconURL:user.displayAvatarURL()}).setTitle('🎣 CELESTIAL FISHER PROFILE').setDescription(`**Total Catches:** ${total}\n**Unique Discoveries:** ${catches.reduce((n,x)=>n+x.discovered,0)}\n**Global Coins:** ${b.wallet.toLocaleString()}`)]}); }
  if(name==='fishleaderboard') { const rows=await leaderboard(10); return interaction.reply({embeds:[new EmbedBuilder().setColor(0x4db8e8).setTitle('🏆 GLOBAL FISHER LEADERBOARD').setDescription(rows.map((x,i)=>`${i+1}. <@${x.user_id}> — **${Number(x.total).toLocaleString()}** coins`).join('\n')||'No fishers yet.') ]}); }
  if(name==='fishrod') {
    try {
      const action = interaction.options.getString('action') || 'view';
      const makeRow = (rod, nextTier) => {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('rod_upgrade').setLabel(rod.upgradeLevel < rod.upgradeMax ? 'Upgrade Rod' : 'Fully Upgraded').setEmoji('⬆️').setStyle(ButtonStyle.Primary).setDisabled(rod.upgradeLevel >= rod.upgradeMax)
        );
        if (nextTier) row.addComponents(new ButtonBuilder().setCustomId('rod_evolve').setLabel('Evolve Rod').setEmoji('✨').setStyle(ButtonStyle.Success).setDisabled(rod.upgradeLevel < rod.upgradeMax));
        return row;
      };
      if (action === 'upgrade') {
        const b = await balance(interaction.user.id);
        const rod = await upgradeRod(interaction.user.id, Number(b.wallet));
        const nextTier = ROD_TIERS.find(tier => tier.level === rod.level + 1) ?? null;
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xf3a6c7).setTitle('⬆️ Rod upgraded').setDescription('**' + rod.tier.name + '** is now stronger.\n\n🍀 Luck: **+' + rod.luck + '%**\n💎 Value: **+' + rod.value + '%**\n\nUpgrade **' + rod.upgradeLevel + '/' + rod.upgradeMax + '**' + (rod.upgradeLevel < rod.upgradeMax ? '\nNext upgrade: **' + rod.nextUpgradeCost.toLocaleString() + '** coins.' : '\n✨ Your rod is ready to evolve.'))],
          components: [makeRow(rod, nextTier)]
        });
      }
      if (action === 'evolve') {
        const b = await balance(interaction.user.id);
        const before = await getRod(interaction.user.id);
        const rod = await evolveRod(interaction.user.id, Number(b.wallet));
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xf3a6c7).setTitle('✨ Rod evolved').setDescription('Your **' + before.tier.name + '** has become **' + rod.tier.name + '**.\n\nThe new rod begins at **1/' + rod.upgradeMax + '**. Upgrade it to unlock stronger luck and value buffs.')],
          components: [makeRow(rod, ROD_TIERS.find(tier => tier.level === rod.level + 1) ?? null)]
        });
      }
      const rod = await getRod(interaction.user.id);
      const nextTier = ROD_TIERS.find(tier => tier.level === rod.level + 1) ?? null;
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xf3a6c7).setTitle((rod.tier.icon || '🎣') + ' ' + rod.tier.name).setDescription(rod.tier.lore || 'Your fishing rod grows with every cosmic catch.').addFields(
          {name:'✦ Upgrade level', value:'**' + rod.upgradeLevel + ' / ' + rod.upgradeMax + '**', inline:true},
          {name:'🍀 Luck', value:'+' + rod.luck + '%', inline:true},
          {name:'💎 Value', value:'+' + rod.value + '%', inline:true},
          {name:'Next upgrade', value:rod.nextUpgradeCost ? '**' + rod.nextUpgradeCost.toLocaleString() + '** coins' : 'Ready to evolve'},
          {name:'Next rod', value:nextTier ? nextTier.icon + ' **' + nextTier.name + '** • ' + nextTier.cost.toLocaleString() + ' coins' : '**Maximum tier**'}
        ).setFooter({text: rod.upgradeLevel < rod.upgradeMax ? 'Upgrade your rod to strengthen its buffs.' : 'Your rod is ready to evolve.'})],
        components: [makeRow(rod, nextTier)]
      });
    } catch(e) {
      return interaction.reply({content:e.message,ephemeral:true});
    }
  }
  if(name==='fishstatuseffects') {
    const effects=await getActiveEffects(interaction.user.id);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x8e7dff).setTitle('🧪 Active Tide Effects').setDescription(effects.length?effects.map(x=>'**'+x.item_id+'** • '+Math.max(0,x.seconds_left)+'s remaining').join('\n'):'*No active effects. The tide is calm.*')]});
  }
  if(name==='fishdrink') {
    try { const effects=await drinkItem(interaction.user.id,interaction.options.getString('item')); return interaction.reply({embeds:[yEmbed('🧪 Buff activated', 'Your fishing drink is now flowing through the cosmic reel.\n\n'+effects.map(x=>'**'+x.item_id+'** • '+x.seconds_left+'s remaining').join('\n'),0xf3a6c7)]}); }
    catch(e) { return interaction.reply({content:e.message,ephemeral:true}); }
  }
  if(name==='fishshop') {
    const shopRow=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fish_buy:luck_drink').setLabel('Buy Luck Drink • 1,000').setEmoji('🍀').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('fish_buy:value_drink').setLabel('Buy Value Drink • 1,000').setEmoji('💎').setStyle(ButtonStyle.Success)
    );
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xf3a6c7).setTitle('🧪 Yachiyo’s Tide Boutique').setDescription('Temporary drinks turn an ordinary cast into a little bit of magic.\n\n🍀 **Luck Drink** — improves rare-pull odds for 5 minutes.\n💎 **Value Drink** — marks your next fishing session with a value boost.\n\n*Your global wallet pays for every purchase.*')],components:[shopRow]});
  }
  if(name==='fishmarket') {
    const rows = await getMarketSnapshot();
    const hot = rows[0] ? '\n\n🔥 **Hot tide:** '+rows[0].fish_name+' · '+rows[0].price.toLocaleString()+' coins' : '';
    return interaction.reply({embeds:[yEmbed('🌊 Celestial Fish Exchange', 'The global tide market shifts with catches from every server.\n\n'+formatMarketLines(rows)+hot)]});
  }
  if(name==='fishaquarium') {
    const rows = await fishCollection(interaction.user.id);
    const owned = rows.filter(row => Number(row.quantity)>0);
    const total = rows.reduce((sum,row)=>sum+Number(row.quantity||0),0);
    const lines = owned.length ? owned.slice(0,20).map(row=>'🐟 **'+row.name+'** · ×'+row.quantity+' · '+row.rarity).join('\n') : '*Your aquarium is waiting for its first catch.*';
    return interaction.reply({embeds:[yEmbed('🫧 '+interaction.user.username+'’s Aquarium', '**'+owned.length+'** species discovered · **'+total+'** total catches\n\n'+lines+'\n\n*Every discovery is preserved in Yachiyo’s celestial archive.*')]});
  }
  if(['fishbattle','fishbattlepvp'].includes(name)) return interaction.reply({embeds:[yEmbed('⚔️ Cosmic Tide Arena', 'Battle interfaces are being prepared. Your catches, rods, and global profile are already connected.') ]});
  if(name==='economy-add') { const b=await addMoney(interaction.options.getUser('user').id,interaction.options.getInteger('amount'),'admin'); return interaction.reply(`Added coins. New wallet: **${b.wallet.toLocaleString()}**.`); }
  if(name==='logs') { const channel=interaction.options.getChannel('channel'); await setLogChannel(interaction.guildId,channel.id); return interaction.reply({embeds:[yEmbed('🛡️ Audit Watch Activated',`Yachiyo will now send structured audit records to <#${channel.id}>.`)]}); }
  if(['warn','kick','ban','timeout'].includes(name)) { const user=interaction.options.getUser('user'); const reason=interaction.options.getString('reason')||'No reason provided'; const member=await interaction.guild.members.fetch(user.id).catch(()=>null); if(!member) return interaction.reply({content:'That member is not in this server.',ephemeral:true}); try { let duration=null; if(name==='warn') await warn(interaction.guildId,user.id,interaction.user.id,reason); if(name==='kick') { await member.kick(reason); await createCase({guildId:interaction.guildId,targetId:user.id,moderatorId:interaction.user.id,action:'kick',reason}); } if(name==='ban') { await member.ban({reason}); await createCase({guildId:interaction.guildId,targetId:user.id,moderatorId:interaction.user.id,action:'ban',reason}); } if(name==='timeout') { const minutes=interaction.options.getInteger('minutes'); if(minutes<1||minutes>40320) return interaction.reply({content:'Minutes must be between 1 and 40,320.',ephemeral:true}); duration=minutes*60; await member.timeout(minutes*60000,reason); await createCase({guildId:interaction.guildId,targetId:user.id,moderatorId:interaction.user.id,action:'timeout',reason,durationSeconds:duration}); } await sendAuditLog(interaction.client,interaction.guild,{eventType:'moderation.action',actorId:interaction.user.id,targetId:user.id,data:{summary:'Yachiyo completed a '+name+' action.',reason}}); return interaction.reply({embeds:[yEmbed('🛡️ Moderation Action Complete',`Action: **${name}**\nMember: <@${user.id}>\nReason: ${reason}\n\n✦ This action has been recorded in the moderation case log.`)]}); } catch(e) { return interaction.reply({content:`I could not complete that action: ${e.message}`,ephemeral:true}); } }
  if(name==='warnings') { const rows=await recentCases(interaction.guildId,interaction.options.getUser('user').id); return interaction.reply({embeds:[new EmbedBuilder().setColor(0xffc857).setTitle('Moderation Cases').setDescription(rows.length?rows.map(x=>`#${x.id} • **${x.action}** • ${x.reason}`).join('\n'):'No cases found.')]}); }
  if(name==='purge') { const amount=interaction.options.getInteger('amount'); if(amount<1||amount>100) return interaction.reply({content:'Amount must be 1–100.',ephemeral:true}); const deleted=await interaction.channel.bulkDelete(amount,true); await createCase({guildId:interaction.guildId,targetId:interaction.user.id,moderatorId:interaction.user.id,action:'purge',reason:`Deleted ${deleted.size} messages`}); return interaction.reply({embeds:[yEmbed('🧹 Channel Cleared',`Yachiyo removed **${deleted.size}** messages from this channel.`,0xe67e22)],ephemeral:true}); }
  if(name==='pay') { try { await transfer(interaction.user.id,interaction.options.getUser('user').id,interaction.options.getInteger('amount')); return interaction.reply({embeds:[yEmbed('💫 Transfer Complete','Your global coin transfer crossed the cosmic tide safely.')]}); } catch(e) { return interaction.reply({content:e.message,ephemeral:true}); } }
  if(['deposit','withdraw'].includes(name)) { try { const b=await bankMove(interaction.user.id,interaction.options.getInteger('amount'),name); return interaction.reply({embeds:[yEmbed(name==='deposit'?'🏦 Deposit Complete':'💳 Withdrawal Complete',`Wallet: **${b.wallet.toLocaleString()}** coins\nBank: **${b.bank.toLocaleString()}** coins`)]}); } catch(e) { return interaction.reply({content:e.message,ephemeral:true}); } }
  if(name==='leaderboard') { const rows=await leaderboard(); return interaction.reply({embeds:[new EmbedBuilder().setColor(0x8e7dff).setTitle('☾ Global Cosmic Leaderboard').setDescription(rows.map((x,i)=>`${i+1}. <@${x.user_id}> — **${Number(x.total).toLocaleString()}** coins`).join('\n')||'No accounts yet.')]}); }
  if(name==='lock'||name==='unlock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone,{SendMessages:name==='unlock'}); await createCase({guildId:interaction.guildId,targetId:interaction.channelId,moderatorId:interaction.user.id,action:name,reason:`Channel ${name}ed`}); return interaction.reply({embeds:[yEmbed(name==='lock'?'🔒 Channel Sealed':'🔓 Channel Opened',`This channel has been ${name}ed by Yachiyo.`,0xe67e22)]}); }
  if(name==='unban') { const id=interaction.options.getString('user_id'); await interaction.guild.members.unban(id,interaction.options.getString('reason')||'No reason provided'); await createCase({guildId:interaction.guildId,targetId:id,moderatorId:interaction.user.id,action:'unban',reason:interaction.options.getString('reason')}); return interaction.reply({embeds:[yEmbed('🌙 Ban Lifted',`<@${id}> may now return to the server.`)]}); }
  if(name==='untimeout') { const user=interaction.options.getUser('user'); const member=await interaction.guild.members.fetch(user.id); await member.timeout(null,'Timeout removed'); await createCase({guildId:interaction.guildId,targetId:user.id,moderatorId:interaction.user.id,action:'untimeout',reason:'Timeout removed'}); return interaction.reply({embeds:[yEmbed('⏱️ Timeout Removed',`<@${user.id}> is no longer timed out.`)]}); }
}
