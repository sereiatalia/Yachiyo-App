import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';
const FONT='Arial';
async function background(url){ const response=await fetch(url); if(!response.ok) throw new Error('Fish background unavailable'); return loadImage(Buffer.from(await response.arrayBuffer())); }
function center(ctx,text,y,size,weight='normal'){ ctx.font=`${weight} ${size}px ${FONT}`; ctx.textAlign='center'; ctx.fillText(text,500,y); }
export async function createFishCard({fish,rarity,reward,valueBonus=0,luckBonus=0}) {
  const canvas=createCanvas(1000,600); const ctx=canvas.getContext('2d');
  try { const image=await background(rarity.background); ctx.drawImage(image,0,0,1000,600); } catch { ctx.fillStyle='#162a48'; ctx.fillRect(0,0,1000,600); }
  ctx.fillStyle='rgba(20,20,35,.18)'; ctx.fillRect(0,0,1000,600); ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,.65)'; ctx.shadowBlur=10;
  ctx.font='italic 27px Arial'; ctx.textAlign='center'; ctx.fillText('You successfully catch a...',500,78);
  center(ctx,`${rarity.label.toUpperCase()} CATCH!`,132,52,'bold');
  ctx.font='italic 23px Arial'; ctx.fillText(rarity.label==='Common'?'Just a regular day at the river...':rarity.label==='Epic'?'A truly remarkable find, this will be remembered!':'The cosmic tide has granted you a remarkable discovery!',500,171);
  center(ctx,`${fish.name.toUpperCase()}`,298,84,'bold');
  ctx.font='italic 30px Arial'; ctx.fillText('Successfully saved to Almanac',500,380);
  ctx.font='28px Arial'; ctx.fillText(`Est. Value: ${fish.value.toLocaleString()} coins`,500,430);
  ctx.font='25px Arial'; ctx.fillText(`Fishing Reward: +${reward.toLocaleString()} coins`,500,478);
  ctx.font='23px Arial'; ctx.fillText(`Value Bonus: +${valueBonus}%  |  Luck Bonus: +${luckBonus}%`,500,525);
  ctx.shadowBlur=0; return new AttachmentBuilder(await canvas.encode('png'),{name:'yachiyo-fish-catch.png'});
}
