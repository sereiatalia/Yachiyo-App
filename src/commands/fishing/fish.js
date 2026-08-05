import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { FISH_RARITIES } from '../../config/fishRarities.js';
import { getFishChannel } from '../../services/guildService.js';
import { getFishingBonuses } from '../../services/fishing/fishing-effects.js';
import { cooldownRemaining } from '../../services/fishing/fishing-cooldown.js';
import { resolveCatch } from '../../services/fishing/fishing-engine.js';
import { rollFish } from '../../services/fishing/fishing-roll.js';
import { createFishCard } from '../../visuals/fish-card-renderer.js';
import { runPullSequence } from '../../services/fishingPresentation.js';

export async function handleFishCommand(interaction) {
  const fishChannel = await getFishChannel(interaction.guildId);
  if (fishChannel && interaction.channelId !== fishChannel) {
    return interaction.reply({ content: '🎣 Fishing is only available in <#' + fishChannel + '>.', ephemeral: true });
  }

  const wait = await cooldownRemaining(interaction.user.id, 'fish');
  if (wait > 0) {
    return interaction.reply({ content: `🎣 Please wait **${Math.ceil(wait / 1000)} second(s)** before fishing again.`, ephemeral: true });
  }

  try {
    await interaction.deferReply();
    const casting = new EmbedBuilder()
      .setColor(0x4db8e8)
      .setTitle('🎣 YACHIYO’S CELESTIAL FISHING')
      .setDescription('╭ 𖦹 ˚｡⋆ Casting your line...\n╰──────────────\n`[████░░░░░░░░░░░░░░░░]`\n\n*The cosmic tide is moving.*');
    await interaction.editReply({ embeds: [casting] });
    await new Promise(resolve => setTimeout(resolve, 900));

    const bite = new EmbedBuilder()
      .setColor(0x8e7dff)
      .setTitle('🎣 A BITE!')
      .setDescription('╭ 𖦹 ˚｡⋆ Something is pulling the line!\n╰──────────────\n`[████████████░░░░░░░░]`\n\n*Reeling in the unknown...*');
    await interaction.editReply({ embeds: [bite] });
    await new Promise(resolve => setTimeout(resolve, 500));

    const bonuses = await getFishingBonuses(interaction.user.id);
    const fish = rollFish({ luckBonus: bonuses.luckBonus });
    const rarity = FISH_RARITIES[fish.rarity];

    await runPullSequence(interaction, fish.rarity);
    await resolveCatch(interaction.user.id, fish);

    const card = await createFishCard({
      fish,
      rarity,
      valueBonus: bonuses.valueBonus,
      luckBonus: bonuses.luckBonus
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fish_again').setLabel('Cast Again').setEmoji('🎣').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('fish_almanac').setLabel('Fish Almanac').setEmoji('📖').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('fish_inventory').setLabel('Item Pouch').setEmoji('👜').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('fish_effects').setLabel('Status Effects').setEmoji('🧪').setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      content: `🐟 **${interaction.user.displayName}** caught a ${fish.name}!`,
      files: [card],
      components: [row],
      embeds: []
    });
  } catch (error) {
    return interaction.editReply({ content: `Yachiyo says: ${error.message}`, embeds: [], components: [] });
  }
}
