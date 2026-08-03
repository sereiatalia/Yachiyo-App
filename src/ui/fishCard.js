import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

const WIDTH = 1000;
const HEIGHT = 500;

async function loadBackground(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Fish background unavailable');
  return loadImage(Buffer.from(await response.arrayBuffer()));
}

function drawCentered(ctx, text, font, y, options = {}) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = options.color ?? '#ffffff';
  ctx.fillText(text, WIDTH / 2, y);
}

export async function createFishCard({ fish, rarity, reward, valueBonus = 0, luckBonus = 0 }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  try {
    const background = await loadBackground(rarity.background);
    ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
  } catch {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#263c62');
    gradient.addColorStop(1, '#111827');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Match the old Yachiyo card: white canvas text with a strong shadow.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.82)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const flavor = rarity.label === 'Common'
    ? 'Just a regular day at the river...'
    : rarity.label === 'Epic'
      ? 'A truly remarkable find, this will be remembered!'
      : 'The cosmic tide has granted you a remarkable discovery!';

  drawCentered(ctx, 'You successfully catch a...', 'italic 28px sans-serif', 80);
  drawCentered(ctx, `${rarity.label.toUpperCase()} CATCH!`, '700 50px sans-serif', 130);
  drawCentered(ctx, flavor, 'italic 20px sans-serif', 165);

  // Keep long fish names inside the card.
  const fishName = fish.name.toUpperCase();
  const nameSize = Math.min(115, Math.max(48, Math.floor(900 / Math.max(fishName.length, 8) * 1.35)));
  drawCentered(ctx, fishName, `700 ${nameSize}px sans-serif`, 290);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  drawCentered(ctx, 'Successfully saved to Almanac', 'italic 32px sans-serif', 360);
  drawCentered(ctx, `Est. Value: ${Number(fish.value ?? 0).toLocaleString()} coins`, '24px sans-serif', 395);
  drawCentered(ctx, `Fishing Reward: +${Number(reward ?? 0).toLocaleString()} coins`, '22px sans-serif', 420);
  drawCentered(ctx, `Value Bonus: +${Math.round(valueBonus)}% | Luck Bonus: +${Math.round(luckBonus)}%`, '22px sans-serif', 450);

  return new AttachmentBuilder(await canvas.encode('png'), { name: 'yachiyo-fish-catch.png' });
}
