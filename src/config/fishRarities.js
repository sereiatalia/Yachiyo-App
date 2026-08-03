export const FISH_RARITIES = {
  common: { label:'Common', color:0xb8c4d0, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/common_bg.jpg' },
  uncommon: { label:'Uncommon', color:0x4db8e8, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/uncommon_bg.jpg' },
  rare: { label:'Rare', color:0x2166d1, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/rare_bg.jpg' },
  epic: { label:'Epic', color:0x9a7bd1, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/epic_bg.jpg' },
  legendary: { label:'Legendary', color:0xe88f9a, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/legendary_bg.jpg' },
  mythic: { label:'Mythic', color:0xff7a00, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/mythic_bg.jpg' },
  ancient: { label:'Ancient', color:0xb88935, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/ancient_bg.jpg' },
  celestial: { label:'Celestial', color:0xf2c66d, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/celestial_bg.jpg' },
  secret: { label:'Secret', color:0xf08a24, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/secret_bg.jpg' },
  tsukuyomi: { label:'Tsukuyomi', color:0x9d314e, background:'https://raw.githubusercontent.com/sereiatalia/Yachiyo/main/tsukuyomi_bg.jpg' }
};

const fish = (name, rarity, value, weight=1) => ({ name, rarity, value, weight });
export const FISH_TABLE = [
  fish('Bass','common',20,10), fish('Salmon','common',20,10), fish('Trout','common',20,10), fish('Anchovy','common',20,10), fish('Carp','common',20,10), fish('Catfish','common',20,10), fish('Cod','common',20,10), fish('Herring','common',20,10), fish('Flounder','common',20,10), fish('Tilapia','common',20,10),
  fish('Tuna','uncommon',40,8), fish('Snook','uncommon',40,8), fish('Mackerel','uncommon',40,8), fish('Snapper','uncommon',200,8), fish('Wahoo','uncommon',40,8), fish('Halibut','uncommon',40,8), fish('Grouper','uncommon',40,8), fish('Pargos','uncommon',40,8), fish('Pike','uncommon',40,8), fish('Marlin','uncommon',40,8),
  fish('Octopus','rare',80,5), fish('Lobster','rare',80,5), fish('Eel','rare',80,5), fish('Squid','rare',80,5), fish('Crab','rare',80,5), fish('Blowfish','rare',80,5), fish('Urchin','rare',80,5), fish('Seahorse','rare',80,5), fish('Stingray','rare',80,5), fish('Turtle','rare',80,5),
  fish('Shark','epic',700,3), fish('Manta','epic',700,3), fish('Goliath','epic',700,3), fish('Mako','epic',700,3), fish('Thresher','epic',700,3), fish('Sawfish','epic',700,3), fish('Sailfish','epic',700,3), fish('Narwhal','epic',700,3), fish('Orca','epic',700,3), fish('Beluga','epic',700,3),
  fish('Whale','legendary',1500,1.5), fish('Arowana','legendary',1500,1.5), fish('Arapaima','legendary',1500,1.5), fish('Nautilus','legendary',1500,1.5), fish('Sunfish','legendary',1500,1.5), fish('Oarfish','legendary',1500,1.5),
  fish('Goblin','mythic',5000,.7), fish('Chimera','mythic',5000,.7), fish('Angler','mythic',5000,.7), fish('Gulper','mythic',5000,.7), fish('Viper','mythic',5000,.7), fish('Blobfish','mythic',5000,.7),
  fish('Lampreys','ancient',20000,.25), fish('Lungfish','ancient',20000,.25), fish('Hagfish','ancient',20000,.25), fish('Sturgeon','ancient',20000,.25), fish('Bowfin','ancient',20000,.25), fish('Gar','ancient',20000,.25),
  fish('Ponyo','celestial',100000,.08), fish('Poseidon','celestial',100000,.08), fish('Umi','celestial',100000,.08), fish('Aquaman','celestial',100000,.08), fish('Jinbe','celestial',100000,.08), fish('Nami','celestial',100000,.08), fish('Kaworu','celestial',100000,.08), fish('Kisame','celestial',100000,.08), fish('Tamaki','celestial',100000,.08), fish('Gyarados','celestial',100000,.08),
  fish('Aquarius','secret',500000,.015), fish('Furina','secret',500000,.015), fish('Rafayel','secret',500000,.015), fish('Kokomi','secret',500000,.015), fish('Miku','secret',500000,.015), fish('Ariel','secret',500000,.015),
  fish('Yachiyo','tsukuyomi',5000000,.003), fish('Iroha','tsukuyomi',5000000,.003), fish('Kaguya','tsukuyomi',5000000,.003)
];

export const RARITY_ORDER = ['common','uncommon','rare','epic','legendary','mythic','ancient','celestial','secret','tsukuyomi'];
export const RARITY_PHRASES = {
  common:'Just a regular day at the river...',
  uncommon:'Not bad, a little extra effort pays off!',
  rare:'You have a keen eye for the treasures of the deep!',
  epic:'A truly remarkable find, this will be remembered!',
  legendary:'An absolute masterpiece of the ocean!',
  mythic:'The deep has revealed something impossible.',
  ancient:'A relic of a forgotten era breaches the surface...',
  celestial:'The stars align for this divine catch!',
  secret:'The ocean secrets are finally yours to hold.',
  tsukuyomi:'The river parted, and with a single pull, I drew eternity to the surface.'
};

export const PULL_CUTSCENES = {
  secret: ['The water goes completely still...','A second moon appears beneath the surface...','Something ancient has answered your call.'],
  tsukuyomi: ['The stars vanish from the sky...','The tide rises against the laws of nature...','A lunar silhouette opens its eyes beneath the water...','The Tsukuyomi current has chosen you.'],
  celestial: ['The surface begins to glow with starlight...','A celestial current wraps around your line...'],
  ancient: ['The water turns the color of old bronze...','Something from before recorded history is moving below...'],
  legendary: ['The line screams against the reel...','A massive shadow breaks the sunlit water...'],
  epic: ['The current suddenly pulls back...','Your rod bends beneath an extraordinary weight...']
};
