import { castFish, saveFish } from './fishing-rewards.js';
import { recordSupply } from './fishing-market.js';

export async function resolveCatch(userId, fish) {
  await castFish(userId);
  await saveFish(userId, fish);
  await recordSupply(fish);
  return fish;
}
