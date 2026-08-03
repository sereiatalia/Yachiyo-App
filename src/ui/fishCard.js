import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { AttachmentBuilder } from 'discord.js';

const WIDTH = 1000;
const HEIGHT = 500;

// Railway's Linux image includes DejaVu Sans. Registering it explicitly avoids
// platform-dependent canvas font fallbacks that can produce invisible text.
for (const [path, family] of [
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'YachiyoSans'],
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'YachiyoSansBold']
]) {
  if (existsSync(path)) GlobalFonts.registerFromPath(path, family);
}

async function loadBackground(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Fish background unavailable');
  return loadImage(Buffer.from(await response.arrayBuffer()));
}

function drawText(ctx, text, y, size, { bold = false, italic = false, shadow = true } = {}) {
  const family = bold ? 'YachiyoSansBold, DejaVu Sans' : 'YachiyoSans, DejaVu Sans';
  ctx.font = (italic ? 'italic ' : '') + size + 'px ' + family;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (shadow) {
    ctx.lineWidth = Math.max(3, Math.round(size / 16));
    ctx.strokeStyle = '#10131d';
    ctx.strokeText(text, WIDTH / 2, y);
  }
  ctx.fillStyle = '#ffffff';
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

  const flavor = rarity.label === 'Common'
    ? 'Just a regular day at the river...'
    : rarity.label === 'Epic'
      ? 'A truly remarkable find, this will be remembered!'
      : 'The cosmic tide has granted you a remarkable discovery!';

  drawText(ctx, 'You successfully catch a...', 80, 28, { italic: true });
  drawText(ctx, rarity.label.toUpperCase() + ' CATCH!', 130, 50, { bold: true });
  drawText(ctx, flavor, 165, 20, { italic: true });

  const fishName = fish.name.toUpperCase();
  const nameSize = Math.min(115, Math.max(48, Math.floor(900 / Math.max(fishName.length, 8) * 1.35)));
  drawText(ctx, fishName, 290, nameSize, { bold: true });

  drawText(ctx, 'Successfully saved to Almanac', 360, 32, { italic: true, shadow: false });
  drawText(ctx, 'Est. Value: ' + Number(fish.value ?? 0).toLocaleString() + ' coins', 395, 24, { shadow: false });
  drawText(ctx, 'Fishing Reward: +' + Number(reward ?? 0).toLocaleString() + ' coins', 420, 22, { shadow: false });
  drawText(ctx, 'Value Bonus: +' + Math.round(valueBonus) + '% | Luck Bonus: +' + Math.round(luckBonus) + '%', 450, 22, { shadow: false });

  return new AttachmentBuilder(await canvas.encode('png'), { name: 'yachiyo-fish-catch.png' });
}
