// Fishing presentation assets reused from the original Yachiyo repository.
// The bot can use these URLs in embeds without duplicating binary files.
export const FISH_RARITIES = {
  common: { label:'Common', color:0xb8c4d0, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/common_bg.jpg' },
  uncommon: { label:'Uncommon', color:0x4db8e8, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/uncommon_bg.jpg' },
  rare: { label:'Rare', color:0x2166d1, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/rare_bg.jpg' },
  epic: { label:'Epic', color:0x9a7bd1, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/epic_bg.jpg' },
  legendary: { label:'Legendary', color:0xe88f9a, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/legendary_bg.jpg' },
  mythic: { label:'Mythic', color:0xff7a00, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/mythic_bg.jpg' },
  ancient: { label:'Ancient', color:0xb88935, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/ancient_bg.jpg' },
  secret: { label:'Secret', color:0x3b91d1, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/secret_bg.jpg' },
  celestial: { label:'Celestial', color:0xf2c66d, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/celestial_bg.jpg' },
  tsukuyomi: { label:'Tsukuyomi', color:0x9d314e, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/tsukuyomi_bg.jpg' }
};
export const FISH_TABLE = [
  {name:'Silver Minnow',rarity:'common',value:35,weight:35}, {name:'Moon Koi',rarity:'uncommon',value:90,weight:25},
  {name:'Sapphire Guppy',rarity:'rare',value:180,weight:16}, {name:'Pearl Eel',rarity:'epic',value:350,weight:10},
  {name:'Rose Leviathan',rarity:'legendary',value:750,weight:6}, {name:'Ember Krakenling',rarity:'mythic',value:1500,weight:3},
  {name:'Ancient Dragonfish',rarity:'ancient',value:3500,weight:2}, {name:'Abyssal Secret',rarity:'secret',value:7500,weight:1},
  {name:'Celestial Ryū',rarity:'celestial',value:15000,weight:.5}, {name:'Tsukuyomi’s Tide',rarity:'tsukuyomi',value:50000,weight:.1}
];
