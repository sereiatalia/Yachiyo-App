import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { claim, rollFish, saveFish, cooldownRemaining } from '../services/economyService.js';
import { FISH_RARITIES } from '../config/fishRarities.js';
import { createFishCard } from '../ui/fishCard.js';

export async function fishAgain(interaction) {
  const wait=await cooldownRemaining(interaction.user.id,'fish');
  if(wait>0) return interaction.reply({content:`🎣 Please wait **${Math.ceil(wait/1000)} second(s)** before fishing again.`,ephemeral:true});
  try {
    await interaction.deferReply();
    await interaction.editReply({embeds:[new EmbedBuilder().setColor(0x4db8e8).setTitle('🎣 YACHIYO’S CELESTIAL FISHING').setDescription('╭ 𖦹 ˚｡⋆ Casting your line...\n╰──────────────\n`[████░░░░░░░░░░░░░░░░]`\n\n*The cosmic tide is moving.*')]});
    await new Promise(r=>setTimeout(r,900));
    await interaction.editReply({embeds:[new EmbedBuilder().setColor(0x8e7dff).setTitle('🎣 A BITE!').setDescription('╭ 𖦹 ˚｡⋆ Something is pulling the line!\n╰──────────────\n`[████████████░░░░░░░░]`\n\n*Reeling in the unknown...*')]});
    await new Promise(r=>setTimeout(r,900));
    const reward=await claim(interaction.user.id,'fish'); const fish=rollFish(); await saveFish(interaction.user.id,fish); const rarity=FISH_RARITIES[fish.rarity];
    const card=await createFishCard({fish,rarity,reward:reward.amount,valueBonus:0,luckBonus:0});
    const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fish_again').setLabel('Cast Again').setEmoji('🎣').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('fish_almanac').setLabel('Fish Almanac').setEmoji('📖').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('fish_inventory').setLabel('Inventory').setEmoji('🎒').setStyle(ButtonStyle.Success));
    return interaction.editReply({content:`🐟 **${interaction.user.displayName}** caught a ${fish.name}!`,files:[card],components:[row],embeds:[]});
  } catch(e) { return interaction.editReply({content:`Yachiyo says: ${e.message}`,embeds:[],components:[]}); }
}
