// Card Mystery Realm — UI (Simplified Collection Edition)
export {};

import { PackOpenAnimation } from './animations/PackOpenAnimation';
import { SynthesisEffect } from './animations/SynthesisEffect';

// ── Types ─────────────────────────────────────────────────────────────────────
type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

interface CardTemplate {
  id: number;
  name: string;
  rarity: Rarity;
  icon: string;
  series: string;
  story?: string;
}

interface CardInstance {
  instanceId: number;
  templateId: number;
  mythicNumber?: number;
  obtainedAt: string; // ISO date string
}

// ── Card pool ─────────────────────────────────────────────────────────────────
const CARD_TEMPLATES: CardTemplate[] = [
  // ── Common — Volcanic Origins (60) ───────────────────────────────────────
  { id:1,   name:'Ember Lizard',       rarity:'common', icon:'🦎', series:'Volcanic Origins' },
  { id:2,   name:'Ash Sprite',         rarity:'common', icon:'🔥', series:'Volcanic Origins' },
  { id:3,   name:'Stone Golem',        rarity:'common', icon:'🗿', series:'Volcanic Origins' },
  { id:4,   name:'Lava Crab',          rarity:'common', icon:'🦀', series:'Volcanic Origins' },
  { id:5,   name:'Cinder Bat',         rarity:'common', icon:'🦇', series:'Volcanic Origins' },
  { id:6,   name:'Magma Slug',         rarity:'common', icon:'🐌', series:'Volcanic Origins' },
  { id:7,   name:'Soot Imp',           rarity:'common', icon:'👺', series:'Volcanic Origins' },
  { id:8,   name:'Flame Moth',         rarity:'common', icon:'🦋', series:'Volcanic Origins' },
  { id:9,   name:'Obsidian Shard',     rarity:'common', icon:'🌑', series:'Volcanic Origins' },
  { id:10,  name:'Smoke Wisp',         rarity:'common', icon:'💨', series:'Volcanic Origins' },
  { id:11,  name:'Char Beetle',        rarity:'common', icon:'🐞', series:'Volcanic Origins' },
  { id:12,  name:'Lava Pebble',        rarity:'common', icon:'🌋', series:'Volcanic Origins' },
  { id:13,  name:'Ember Toad',         rarity:'common', icon:'🐸', series:'Volcanic Origins' },
  { id:14,  name:'Ash Hound',          rarity:'common', icon:'🐕', series:'Volcanic Origins' },
  { id:15,  name:'Cinder Sprite',      rarity:'common', icon:'🌠', series:'Volcanic Origins' },
  { id:16,  name:'Flame Rat',          rarity:'common', icon:'🐀', series:'Volcanic Origins' },
  { id:17,  name:'Scorched Sparrow',   rarity:'common', icon:'🐦', series:'Volcanic Origins' },
  { id:18,  name:'Magma Ant',          rarity:'common', icon:'🐜', series:'Volcanic Origins' },
  { id:19,  name:'Soot Snail',         rarity:'common', icon:'🐡', series:'Volcanic Origins' },
  { id:20,  name:'Ember Frog',         rarity:'common', icon:'🐊', series:'Volcanic Origins' },
  { id:21,  name:'Lava Worm',          rarity:'common', icon:'🐟', series:'Volcanic Origins' },
  { id:22,  name:'Cinder Crab',        rarity:'common', icon:'🦞', series:'Volcanic Origins' },
  { id:23,  name:'Ash Crow',           rarity:'common', icon:'🐓', series:'Volcanic Origins' },
  { id:24,  name:'Flame Shrimp',       rarity:'common', icon:'🦐', series:'Volcanic Origins' },
  { id:25,  name:'Obsidian Mole',      rarity:'common', icon:'🦫', series:'Volcanic Origins' },
  { id:26,  name:'Soot Gecko',         rarity:'common', icon:'🐉', series:'Volcanic Origins' },
  { id:27,  name:'Magma Fly',          rarity:'common', icon:'🦨', series:'Volcanic Origins' },
  { id:28,  name:'Ember Colt',         rarity:'common', icon:'🐴', series:'Volcanic Origins' },
  { id:29,  name:'Char Finch',         rarity:'common', icon:'🐤', series:'Volcanic Origins' },
  { id:30,  name:'Lava Snapper',       rarity:'common', icon:'🐢', series:'Volcanic Origins' },
  { id:31,  name:'Cinder Ox',          rarity:'common', icon:'🐂', series:'Volcanic Origins' },
  { id:32,  name:'Flame Kitten',       rarity:'common', icon:'🐱', series:'Volcanic Origins' },
  { id:33,  name:'Ash Bunny',          rarity:'common', icon:'🐇', series:'Volcanic Origins' },
  { id:34,  name:'Magma Chick',        rarity:'common', icon:'🐣', series:'Volcanic Origins' },
  { id:35,  name:'Soot Lamb',          rarity:'common', icon:'🐑', series:'Volcanic Origins' },
  { id:36,  name:'Ember Piglet',       rarity:'common', icon:'🐷', series:'Volcanic Origins' },
  { id:37,  name:'Char Duckling',      rarity:'common', icon:'🦆', series:'Volcanic Origins' },
  { id:38,  name:'Lava Pup',           rarity:'common', icon:'🐶', series:'Volcanic Origins' },
  { id:39,  name:'Cinder Cub',         rarity:'common', icon:'🐻', series:'Volcanic Origins' },
  { id:40,  name:'Flame Hamster',      rarity:'common', icon:'🐹', series:'Volcanic Origins' },
  { id:41,  name:'Obsidian Turtle',    rarity:'common', icon:'🐠', series:'Volcanic Origins' },
  { id:42,  name:'Soot Monkey',        rarity:'common', icon:'🐒', series:'Volcanic Origins' },
  { id:43,  name:'Magma Parrot',       rarity:'common', icon:'🦜', series:'Volcanic Origins' },
  { id:44,  name:'Ember Hedgehog',     rarity:'common', icon:'🦔', series:'Volcanic Origins' },
  { id:45,  name:'Char Caterpillar',   rarity:'common', icon:'🐛', series:'Volcanic Origins' },
  { id:46,  name:'Lava Snail',         rarity:'common', icon:'🐚', series:'Volcanic Origins' },
  { id:47,  name:'Cinder Bee',         rarity:'common', icon:'🐝', series:'Volcanic Origins' },
  { id:48,  name:'Flame Ladybug',      rarity:'common', icon:'🌿', series:'Volcanic Origins' },
  { id:49,  name:'Ash Dragonfly',      rarity:'common', icon:'🦗', series:'Volcanic Origins' },
  { id:50,  name:'Magma Firefly',      rarity:'common', icon:'🌟', series:'Volcanic Origins' },
  { id:51,  name:'Soot Scorpion',      rarity:'common', icon:'🦂', series:'Volcanic Origins' },
  { id:52,  name:'Ember Spider',       rarity:'common', icon:'🕷', series:'Volcanic Origins' },
  { id:53,  name:'Char Centipede',     rarity:'common', icon:'🐍', series:'Volcanic Origins' },
  { id:54,  name:'Lava Mantis',        rarity:'common', icon:'🦟', series:'Volcanic Origins' },
  { id:55,  name:'Cinder Moth',        rarity:'common', icon:'🐙', series:'Volcanic Origins' },
  { id:56,  name:'Flame Grasshopper',  rarity:'common', icon:'🌾', series:'Volcanic Origins' },
  { id:57,  name:'Obsidian Ant',       rarity:'common', icon:'🍄', series:'Volcanic Origins' },
  { id:58,  name:'Soot Cricket',       rarity:'common', icon:'🎶', series:'Volcanic Origins' },
  { id:59,  name:'Magma Weasel',       rarity:'common', icon:'🦦', series:'Volcanic Origins' },
  { id:60,  name:'Ember Raccoon',      rarity:'common', icon:'🦝', series:'Volcanic Origins' },

  // ── Common — Frozen Age (60) ──────────────────────────────────────────────
  { id:61,  name:'Ice Shard',          rarity:'common', icon:'🧊', series:'Frozen Age' },
  { id:62,  name:'Snow Fox',           rarity:'common', icon:'🦊', series:'Frozen Age' },
  { id:63,  name:'Frost Wisp',         rarity:'common', icon:'🌨', series:'Frozen Age' },
  { id:64,  name:'Blizzard Pup',       rarity:'common', icon:'🐩', series:'Frozen Age' },
  { id:65,  name:'Icicle Sprite',      rarity:'common', icon:'💠', series:'Frozen Age' },
  { id:66,  name:'Snowflake Fairy',    rarity:'common', icon:'🧚', series:'Frozen Age' },
  { id:67,  name:'Frost Bunny',        rarity:'common', icon:'🐰', series:'Frozen Age' },
  { id:68,  name:'Ice Mole',           rarity:'common', icon:'🦔', series:'Frozen Age' },
  { id:69,  name:'Blizzard Bat',       rarity:'common', icon:'🦇', series:'Frozen Age' },
  { id:70,  name:'Snow Owl',           rarity:'common', icon:'🦉', series:'Frozen Age' },
  { id:71,  name:'Frost Beetle',       rarity:'common', icon:'🐞', series:'Frozen Age' },
  { id:72,  name:'Ice Crab',           rarity:'common', icon:'🦀', series:'Frozen Age' },
  { id:73,  name:'Blizzard Toad',      rarity:'common', icon:'🐸', series:'Frozen Age' },
  { id:74,  name:'Snow Sparrow',       rarity:'common', icon:'🐧', series:'Frozen Age' },
  { id:75,  name:'Frost Kitten',       rarity:'common', icon:'🐈', series:'Frozen Age' },
  { id:76,  name:'Ice Lamb',           rarity:'common', icon:'🐏', series:'Frozen Age' },
  { id:77,  name:'Blizzard Chick',     rarity:'common', icon:'🐥', series:'Frozen Age' },
  { id:78,  name:'Snow Piglet',        rarity:'common', icon:'🐖', series:'Frozen Age' },
  { id:79,  name:'Frost Duckling',     rarity:'common', icon:'🦢', series:'Frozen Age' },
  { id:80,  name:'Ice Hamster',        rarity:'common', icon:'🐭', series:'Frozen Age' },
  { id:81,  name:'Blizzard Cub',       rarity:'common', icon:'🐼', series:'Frozen Age' },
  { id:82,  name:'Snow Monkey',        rarity:'common', icon:'🐵', series:'Frozen Age' },
  { id:83,  name:'Frost Parrot',       rarity:'common', icon:'🦚', series:'Frozen Age' },
  { id:84,  name:'Ice Hedgehog',       rarity:'common', icon:'🦡', series:'Frozen Age' },
  { id:85,  name:'Blizzard Bee',       rarity:'common', icon:'🐝', series:'Frozen Age' },
  { id:86,  name:'Snow Ladybug',       rarity:'common', icon:'🦋', series:'Frozen Age' },
  { id:87,  name:'Frost Dragonfly',    rarity:'common', icon:'🦗', series:'Frozen Age' },
  { id:88,  name:'Ice Firefly',        rarity:'common', icon:'✨', series:'Frozen Age' },
  { id:89,  name:'Blizzard Scorpion',  rarity:'common', icon:'🦂', series:'Frozen Age' },
  { id:90,  name:'Snow Spider',        rarity:'common', icon:'🕸', series:'Frozen Age' },
  { id:91,  name:'Frost Centipede',    rarity:'common', icon:'🐍', series:'Frozen Age' },
  { id:92,  name:'Ice Mantis',         rarity:'common', icon:'🦟', series:'Frozen Age' },
  { id:93,  name:'Blizzard Moth',      rarity:'common', icon:'🐛', series:'Frozen Age' },
  { id:94,  name:'Snow Grasshopper',   rarity:'common', icon:'🌿', series:'Frozen Age' },
  { id:95,  name:'Frost Ant',          rarity:'common', icon:'🐜', series:'Frozen Age' },
  { id:96,  name:'Ice Cricket',        rarity:'common', icon:'🎵', series:'Frozen Age' },
  { id:97,  name:'Blizzard Weasel',    rarity:'common', icon:'🦦', series:'Frozen Age' },
  { id:98,  name:'Snow Raccoon',       rarity:'common', icon:'🐨', series:'Frozen Age' },
  { id:99,  name:'Frost Slug',         rarity:'common', icon:'🐌', series:'Frozen Age' },
  { id:100, name:'Ice Imp',            rarity:'common', icon:'👹', series:'Frozen Age' },
  { id:101, name:'Blizzard Worm',      rarity:'common', icon:'🐟', series:'Frozen Age' },
  { id:102, name:'Snow Shrimp',        rarity:'common', icon:'🦐', series:'Frozen Age' },
  { id:103, name:'Frost Crow',         rarity:'common', icon:'🐓', series:'Frozen Age' },
  { id:104, name:'Ice Fly',            rarity:'common', icon:'🌾', series:'Frozen Age' },
  { id:105, name:'Blizzard Colt',      rarity:'common', icon:'🐎', series:'Frozen Age' },
  { id:106, name:'Snow Finch',         rarity:'common', icon:'🐦', series:'Frozen Age' },
  { id:107, name:'Frost Snapper',      rarity:'common', icon:'🐡', series:'Frozen Age' },
  { id:108, name:'Ice Ox',             rarity:'common', icon:'🐃', series:'Frozen Age' },
  { id:109, name:'Blizzard Rat',       rarity:'common', icon:'🐁', series:'Frozen Age' },
  { id:110, name:'Snow Gecko',         rarity:'common', icon:'🦎', series:'Frozen Age' },
  { id:111, name:'Frost Pebble',       rarity:'common', icon:'🔷', series:'Frozen Age' },
  { id:112, name:'Ice Snail',          rarity:'common', icon:'🐚', series:'Frozen Age' },
  { id:113, name:'Blizzard Frog',      rarity:'common', icon:'🐊', series:'Frozen Age' },
  { id:114, name:'Snow Hound',         rarity:'common', icon:'🐕', series:'Frozen Age' },
  { id:115, name:'Frost Turtle',       rarity:'common', icon:'🐢', series:'Frozen Age' },
  { id:116, name:'Ice Caterpillar',    rarity:'common', icon:'🍄', series:'Frozen Age' },
  { id:117, name:'Blizzard Sparrow',   rarity:'common', icon:'🕊', series:'Frozen Age' },
  { id:118, name:'Snow Ant',           rarity:'common', icon:'🌱', series:'Frozen Age' },
  { id:119, name:'Frost Firefly',      rarity:'common', icon:'🌟', series:'Frozen Age' },
  { id:120, name:'Ice Raccoon',        rarity:'common', icon:'🦝', series:'Frozen Age' },

  // ── Rare — Volcanic Origins (25) ─────────────────────────────────────────
  { id:121, name:'Thunder Hawk',       rarity:'rare', icon:'⚡', series:'Volcanic Origins' },
  { id:122, name:'Magma Serpent',      rarity:'rare', icon:'🐍', series:'Volcanic Origins' },
  { id:123, name:'Lava Titan',         rarity:'rare', icon:'🏔', series:'Volcanic Origins' },
  { id:124, name:'Cinder Wolf',        rarity:'rare', icon:'🐺', series:'Volcanic Origins' },
  { id:125, name:'Flame Condor',       rarity:'rare', icon:'🦅', series:'Volcanic Origins' },
  { id:126, name:'Obsidian Golem',     rarity:'rare', icon:'🗿', series:'Volcanic Origins' },
  { id:127, name:'Magma Hydra',        rarity:'rare', icon:'🐲', series:'Volcanic Origins' },
  { id:128, name:'Ember Wyvern',       rarity:'rare', icon:'🦎', series:'Volcanic Origins' },
  { id:129, name:'Soot Chimera',       rarity:'rare', icon:'🦁', series:'Volcanic Origins' },
  { id:130, name:'Lava Basilisk',      rarity:'rare', icon:'🐊', series:'Volcanic Origins' },
  { id:131, name:'Char Manticore',     rarity:'rare', icon:'🦂', series:'Volcanic Origins' },
  { id:132, name:'Flame Gryphon',      rarity:'rare', icon:'🦉', series:'Volcanic Origins' },
  { id:133, name:'Ash Cerberus',       rarity:'rare', icon:'🐕', series:'Volcanic Origins' },
  { id:134, name:'Magma Kraken',       rarity:'rare', icon:'🦑', series:'Volcanic Origins' },
  { id:135, name:'Cinder Sphinx',      rarity:'rare', icon:'🐯', series:'Volcanic Origins' },
  { id:136, name:'Ember Cyclops',      rarity:'rare', icon:'👁', series:'Volcanic Origins' },
  { id:137, name:'Soot Minotaur',      rarity:'rare', icon:'🐂', series:'Volcanic Origins' },
  { id:138, name:'Lava Harpy',         rarity:'rare', icon:'🦆', series:'Volcanic Origins' },
  { id:139, name:'Char Medusa',        rarity:'rare', icon:'🐙', series:'Volcanic Origins' },
  { id:140, name:'Flame Pegasus',      rarity:'rare', icon:'🐴', series:'Volcanic Origins' },
  { id:141, name:'Obsidian Unicorn',   rarity:'rare', icon:'🦄', series:'Volcanic Origins' },
  { id:142, name:'Magma Centaur',      rarity:'rare', icon:'🏹', series:'Volcanic Origins' },
  { id:143, name:'Cinder Naga',        rarity:'rare', icon:'🐉', series:'Volcanic Origins' },
  { id:144, name:'Ember Djinn',        rarity:'rare', icon:'🧞', series:'Volcanic Origins' },
  { id:145, name:'Soot Elemental',     rarity:'rare', icon:'🔥', series:'Volcanic Origins' },

  // ── Rare — Frozen Age (25) ────────────────────────────────────────────────
  { id:146, name:'Blizzard Wolf',      rarity:'rare', icon:'🐺', series:'Frozen Age' },
  { id:147, name:'Moon Fairy',         rarity:'rare', icon:'🧚', series:'Frozen Age' },
  { id:148, name:'Frost Titan',        rarity:'rare', icon:'🗻', series:'Frozen Age' },
  { id:149, name:'Ice Serpent',        rarity:'rare', icon:'🐍', series:'Frozen Age' },
  { id:150, name:'Snow Condor',        rarity:'rare', icon:'🦅', series:'Frozen Age' },
  { id:151, name:'Crystal Golem',      rarity:'rare', icon:'🔷', series:'Frozen Age' },
  { id:152, name:'Blizzard Hydra',     rarity:'rare', icon:'🐲', series:'Frozen Age' },
  { id:153, name:'Frost Wyvern',       rarity:'rare', icon:'🦕', series:'Frozen Age' },
  { id:154, name:'Ice Chimera',        rarity:'rare', icon:'🦁', series:'Frozen Age' },
  { id:155, name:'Snow Basilisk',      rarity:'rare', icon:'🦎', series:'Frozen Age' },
  { id:156, name:'Blizzard Manticore', rarity:'rare', icon:'🦂', series:'Frozen Age' },
  { id:157, name:'Frost Gryphon',      rarity:'rare', icon:'🦉', series:'Frozen Age' },
  { id:158, name:'Ice Cerberus',       rarity:'rare', icon:'🐕', series:'Frozen Age' },
  { id:159, name:'Snow Kraken',        rarity:'rare', icon:'🦑', series:'Frozen Age' },
  { id:160, name:'Blizzard Sphinx',    rarity:'rare', icon:'🐈', series:'Frozen Age' },
  { id:161, name:'Frost Cyclops',      rarity:'rare', icon:'👁', series:'Frozen Age' },
  { id:162, name:'Ice Minotaur',       rarity:'rare', icon:'🐃', series:'Frozen Age' },
  { id:163, name:'Snow Harpy',         rarity:'rare', icon:'🕊', series:'Frozen Age' },
  { id:164, name:'Blizzard Medusa',    rarity:'rare', icon:'🐙', series:'Frozen Age' },
  { id:165, name:'Frost Pegasus',      rarity:'rare', icon:'🐎', series:'Frozen Age' },
  { id:166, name:'Ice Unicorn',        rarity:'rare', icon:'🦄', series:'Frozen Age' },
  { id:167, name:'Snow Centaur',       rarity:'rare', icon:'🏹', series:'Frozen Age' },
  { id:168, name:'Blizzard Naga',      rarity:'rare', icon:'🐉', series:'Frozen Age' },
  { id:169, name:'Frost Djinn',        rarity:'rare', icon:'🧞', series:'Frozen Age' },
  { id:170, name:'Ice Elemental',      rarity:'rare', icon:'❄', series:'Frozen Age' },

  // ── Epic — Volcanic Origins (13) ─────────────────────────────────────────
  { id:171, name:'Void Knight',        rarity:'epic', icon:'⚔', series:'Volcanic Origins', story:'A warrior forged in the void between worlds, seeking purpose in endless battle.' },
  { id:172, name:'Inferno Drake',      rarity:'epic', icon:'🐲', series:'Volcanic Origins', story:'Born from the heart of an erupting volcano, its breath melts steel.' },
  { id:173, name:'Magma Colossus',     rarity:'epic', icon:'🗿', series:'Volcanic Origins', story:'A titan of living rock, its footsteps crack the earth and birth new volcanoes.' },
  { id:174, name:'Ember Seraph',       rarity:'epic', icon:'😇', series:'Volcanic Origins', story:'A fallen angel reborn in fire, its wings leave trails of burning light.' },
  { id:175, name:'Lava Leviathan',     rarity:'epic', icon:'🐉', series:'Volcanic Origins', story:'Ancient sea serpent that swims through rivers of molten rock.' },
  { id:176, name:'Cinder Archon',      rarity:'epic', icon:'🔮', series:'Volcanic Origins', story:'A cosmic judge who sentences worlds to burn for their transgressions.' },
  { id:177, name:'Flame Behemoth',     rarity:'epic', icon:'🦁', series:'Volcanic Origins', story:'The first beast, older than memory, whose roar ignites the sky.' },
  { id:178, name:'Obsidian Revenant',  rarity:'epic', icon:'💀', series:'Volcanic Origins', story:'A warrior who refused death, now bound to obsidian armor for eternity.' },
  { id:179, name:'Soot Lich',          rarity:'epic', icon:'🧙', series:'Volcanic Origins', story:'A sorcerer who traded mortality for mastery over ash and ruin.' },
  { id:180, name:'Magma Warlord',      rarity:'epic', icon:'🔪', series:'Volcanic Origins', story:'Commander of the volcanic legions, undefeated in ten thousand battles.' },
  { id:181, name:'Char Specter',       rarity:'epic', icon:'👻', series:'Volcanic Origins', story:'The ghost of a city consumed by lava, forever searching for its lost home.' },
  { id:182, name:'Ember Valkyrie',     rarity:'epic', icon:'🔰', series:'Volcanic Origins', story:'She rides through eruptions to collect the souls of the worthy fallen.' },
  { id:183, name:'Lava Titan King',    rarity:'epic', icon:'👑', series:'Volcanic Origins', story:'Ruler of the deep earth, his crown is forged from the planet\'s core.' },

  // ── Epic — Frozen Age (12) ────────────────────────────────────────────────
  { id:184, name:'Crystal Dragon',     rarity:'epic', icon:'🐉', series:'Frozen Age', story:'Ancient guardian of the glacial vaults, its scales refract starlight.' },
  { id:185, name:'Aurora Witch',       rarity:'epic', icon:'🌀', series:'Frozen Age', story:'She weaves the northern lights into spells that bend reality.' },
  { id:186, name:'Frost Colossus',     rarity:'epic', icon:'🗻', series:'Frozen Age', story:'A giant of living ice, its breath freezes time itself in a ten-mile radius.' },
  { id:187, name:'Blizzard Seraph',    rarity:'epic', icon:'😇', series:'Frozen Age', story:'An angel of winter who descends to end the warmth of dying worlds.' },
  { id:188, name:'Ice Leviathan',      rarity:'epic', icon:'🦕', series:'Frozen Age', story:'Swims beneath glaciers, its passage causes earthquakes that reshape continents.' },
  { id:189, name:'Snow Archon',        rarity:'epic', icon:'🔭', series:'Frozen Age', story:'Keeper of the frozen records, it has witnessed every winter since the first.' },
  { id:190, name:'Blizzard Behemoth',  rarity:'epic', icon:'🐘', series:'Frozen Age', story:'The beast of eternal winter, its fur is woven from frozen starlight.' },
  { id:191, name:'Crystal Revenant',   rarity:'epic', icon:'💀', series:'Frozen Age', story:'Preserved in ice for millennia, it awakens to finish a war long forgotten.' },
  { id:192, name:'Frost Lich',         rarity:'epic', icon:'🧟', series:'Frozen Age', story:'A necromancer who froze their own soul to achieve immortality.' },
  { id:193, name:'Ice Warlord',        rarity:'epic', icon:'⚔', series:'Frozen Age', story:'General of the glacial armies, her sword has never known warmth.' },
  { id:194, name:'Snow Specter',       rarity:'epic', icon:'👻', series:'Frozen Age', story:'The spirit of a frozen kingdom, haunting the tundra where its people once lived.' },
  { id:195, name:'Blizzard Valkyrie',  rarity:'epic', icon:'🔰', series:'Frozen Age', story:'She descends from the aurora to carry fallen warriors to the eternal ice.' },

  // ── Legendary — Volcanic Origins (4) ─────────────────────────────────────
  { id:196, name:'Celestial Phoenix',  rarity:'legendary', icon:'🦅', series:'Volcanic Origins', story:'Reborn from cosmic fire every millennium, it carries the memory of dead stars.' },
  { id:197, name:'Magma God',          rarity:'legendary', icon:'🌋', series:'Volcanic Origins', story:'The deity of creation itself, who shaped the world by pouring its blood into the void.' },
  { id:198, name:'Infernal Sovereign', rarity:'legendary', icon:'😈', series:'Volcanic Origins', story:'Ruler of the underworld, its throne is the molten heart of the planet.' },
  { id:199, name:'Ember Archangel',    rarity:'legendary', icon:'👼', series:'Volcanic Origins', story:'The first light ever kindled, now guardian of all that burns with purpose.' },

  // ── Legendary — Frozen Age (4) ────────────────────────────────────────────
  { id:200, name:'Eternal Titan',      rarity:'legendary', icon:'👑', series:'Frozen Age', story:'The last king of a frozen empire, preserved in ice for ten thousand years.' },
  { id:201, name:'Frost God',          rarity:'legendary', icon:'❄', series:'Frozen Age', story:'The deity of endings, who will one day freeze the last star and bring silence.' },
  { id:202, name:'Glacial Sovereign',  rarity:'legendary', icon:'🌊', series:'Frozen Age', story:'Ruler of the deep ice, its palace lies at the bottom of a frozen ocean.' },
  { id:203, name:'Blizzard Archangel', rarity:'legendary', icon:'🕊', series:'Frozen Age', story:'The last warmth before the eternal winter, a paradox made divine.' },

  // ── Mythic — Beyond (3) ───────────────────────────────────────────────────
  { id:204, name:'The Void Sovereign', rarity:'mythic', icon:'🌌', series:'Beyond', story:'It exists between all things. To hold this card is to touch the edge of existence itself.' },
  { id:205, name:'Primordial Flame',   rarity:'mythic', icon:'☀', series:'Beyond', story:'The first fire that lit the universe. Every flame is its echo.' },
  { id:206, name:'Abyssal Leviathan',  rarity:'mythic', icon:'🌊', series:'Beyond', story:'Older than the oceans it swims in. Its dreams shape the tides.' },
];

// ── Pack definitions ──────────────────────────────────────────────────────────
const PACKS = [
  {
    id: 'basic', name: 'Basic Pack', icon: '📦', cost: 100,
    desc: 'Standard draw',
    weeklyLimit: 0,
    odds: { common:60, rare:20, epic:10, legendary:0.99, mythic:0.1 },
    luckGain: 1,
    draws: 1,
  },
  {
    id: 'premium', name: 'Premium Pack', icon: '🎁', cost: 500,
    desc: 'Higher rare chance',
    weeklyLimit: 10,
    odds: { common:35, rare:40, epic:20, legendary:5, mythic:0.1 },
    luckGain: 2,
    draws: 1,
  },
  {
    id: 'mythic', name: 'Mythic Pack', icon: '🌟', cost: 2000,
    desc: 'Best odds for Legendary+',
    weeklyLimit: 1,
    odds: { common:0, rare:44, epic:40, legendary:15, mythic:1 },
    luckGain: 5,
    draws: 1,
  },
  {
    id: 'multi', name: '10× Multi Draw', icon: '💫', cost: 900,
    desc: '10 cards at once (Basic odds)',
    weeklyLimit: 0,
    odds: { common:60, rare:20, epic:10, legendary:0.99, mythic:0.1 },
    luckGain: 1,
    draws: 10,
  },
];

// ── Synthesis recipes ─────────────────────────────────────────────────────────
const RECIPES = [
  { id:'same3',    name:'Same Rarity Shuffle', icon:'🔮',
    desc:'3 cards of the same rarity → 1 random card of that same rarity',
    cost:3, mode:'same', successRate:100 },
  { id:'upgrade-c', name:'Common → Rare',      icon:'⬆️',
    desc:'2 Common + 1 any → Rare (20% success)',
    cost:3, mode:'upgrade', fromRarity:'common' as Rarity, toRarity:'rare' as Rarity, successRate:20 },
  { id:'upgrade-r', name:'Rare → Epic',        icon:'⬆️',
    desc:'2 Rare + 1 any → Epic (10% success)',
    cost:3, mode:'upgrade', fromRarity:'rare' as Rarity, toRarity:'epic' as Rarity, successRate:10 },
  { id:'upgrade-e', name:'Epic → Legendary',   icon:'✨',
    desc:'2 Epic + 1 any → Legendary (5% success)',
    cost:3, mode:'upgrade', fromRarity:'epic' as Rarity, toRarity:'legendary' as Rarity, successRate:5 },
];

// ── Score table ───────────────────────────────────────────────────────────────
const RARITY_SCORE: Record<Rarity, number> = {
  common:1, rare:3, epic:10, legendary:50, mythic:500
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  coins: 999999999,
  luckValue: 0,
  legendaryPity: 0,   // draws since last legendary
  mythicPity: 0,      // draws since last mythic
  totalDraws: 0,
  nextInstanceId: 1,
  mythicCounter: 0,   // global mythic serial
  weeklyDraws: {} as Record<string, number>,  // packId -> count this week
  weekReset: '',      // ISO date of current week start
  lastLoginDate: '',
  inventory: [] as CardInstance[],
  consecutiveFailures: 0,
  seenInstanceIds: [] as number[], // for NEW badge tracking
  discoveredTemplateIds: [] as number[], // catalog: ever-owned template ids
};

const SAVE_KEY = 'cmr_v2';

// Record a template as ever-discovered (persists even after card is consumed/sold)
function recordDiscovered(templateId: number) {
  if (!state.discoveredTemplateIds.includes(templateId)) {
    state.discoveredTemplateIds.push(templateId);
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    Object.assign(state, JSON.parse(raw));
  } catch { localStorage.removeItem(SAVE_KEY); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTemplate(id: number): CardTemplate {
  return CARD_TEMPLATES.find(t => t.id === id)!;
}

function templatesByRarity(r: Rarity): CardTemplate[] {
  return CARD_TEMPLATES.filter(t => t.rarity === r && t.rarity !== 'mythic');
}

function toast(msg: string) {
  const el = document.getElementById('toast')!;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function uid(): number {
  return state.nextInstanceId++;
}

// ── Crypto random draw ────────────────────────────────────────────────────────
function cryptoRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

function drawRarity(odds: typeof PACKS[0]['odds'], forceMythic = false, forceLegendary = false): Rarity {
  if (forceMythic) return 'mythic';
  if (forceLegendary) return 'legendary';
  const r = cryptoRandom();
  const m  = odds.mythic    / 100;
  const l  = odds.legendary / 100;
  const e  = odds.epic      / 100;
  const ra = odds.rare      / 100;
  if (r < m)           return 'mythic';
  if (r < m + l)       return 'legendary';
  if (r < m + l + e)   return 'epic';
  if (r < m + l + e + ra) return 'rare';
  return 'common';
}

function pickTemplate(rarity: Rarity): CardTemplate {
  if (rarity === 'mythic') {
    const pool = CARD_TEMPLATES.filter(t => t.rarity === 'mythic');
    return pool[Math.floor(cryptoRandom() * pool.length)];
  }
  const pool = templatesByRarity(rarity);
  return pool[Math.floor(cryptoRandom() * pool.length)] || CARD_TEMPLATES[0];
}

function createInstance(template: CardTemplate): CardInstance {
  const inst: CardInstance = {
    instanceId: uid(),
    templateId: template.id,
    obtainedAt: new Date().toISOString(),
  };
  if (template.rarity === 'mythic') {
    inst.mythicNumber = ++state.mythicCounter;
  }
  return inst;
}

// ── Weekly limit helpers ──────────────────────────────────────────────────────
function getWeekStart(): string {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0,10);
}

function checkWeekReset() {
  const ws = getWeekStart();
  if (state.weekReset !== ws) {
    state.weekReset = ws;
    state.weeklyDraws = {};
  }
}

function weeklyUsed(packId: string): number {
  return state.weeklyDraws[packId] || 0;
}

// ── Daily login bonus ─────────────────────────────────────────────────────────
function applyDailyBonus() {
  const today = new Date().toISOString().slice(0,10);
  if (state.lastLoginDate === today) return;
  state.lastLoginDate = today;
  const bonus = calcDailyBonus();
  state.coins += bonus;
  if (bonus > 100) toast(`📅 Daily login bonus: +${bonus} 🪙`);
  saveState();
}

function calcDailyBonus(): number {
  const score = calcGalleryScore();
  const multiplier = Math.min(1 + Math.floor(score / 100) * 0.1, 2);
  return Math.round(100 * multiplier);
}

// ── Gallery score ─────────────────────────────────────────────────────────────
function calcGalleryScore(): number {
  let score = 0;
  for (const inst of state.inventory) {
    const t = getTemplate(inst.templateId);
    score += RARITY_SCORE[t.rarity];
  }
  // Series bonus: +20% if you own all cards in a series
  const seriesMap: Record<string, { total: number; owned: Set<number> }> = {};
  for (const t of CARD_TEMPLATES) {
    if (!seriesMap[t.series]) seriesMap[t.series] = { total: 0, owned: new Set() };
    seriesMap[t.series].total++;
  }
  for (const inst of state.inventory) {
    const t = getTemplate(inst.templateId);
    seriesMap[t.series].owned.add(t.id);
  }
  for (const s of Object.values(seriesMap)) {
    if (s.owned.size >= s.total) score = Math.round(score * 1.2);
  }
  return score;
}

// ── Currency display ──────────────────────────────────────────────────────────
function updateHeader() {
  document.getElementById('soft-currency')!.textContent = state.coins.toLocaleString();
  document.getElementById('daily-bonus')!.textContent = `+${calcDailyBonus()} 🪙`;
  document.getElementById('luck-value')!.textContent = state.luckValue.toString();
  document.getElementById('pity-legendary')!.textContent = `${state.legendaryPity} / 100`;
  document.getElementById('pity-mythic')!.textContent = `${state.mythicPity} / 1000`;
  document.getElementById('total-draws')!.textContent = state.totalDraws.toString();
}

// ── Card HTML helpers ─────────────────────────────────────────────────────────
function cardHTML(inst: CardInstance, cls: string): string {
  const t = getTemplate(inst.templateId);
  const mythicTag = inst.mythicNumber ? `<div class="mythic-num">#${String(inst.mythicNumber).padStart(4,'0')}</div>` : '';
  const scoreTag = `<div class="card-score">${RARITY_SCORE[t.rarity]}pt</div>`;
  return `
    <div class="${cls} ${t.rarity}" data-iid="${inst.instanceId}">
      ${mythicTag}${scoreTag}
      <div class="card-icon">${t.icon}</div>
      <div class="card-name">${t.name}</div>
      <div class="card-rarity">${t.rarity}</div>
      <div class="card-series">${t.series}</div>
    </div>`;
}

// ── Render packs ──────────────────────────────────────────────────────────────
function renderPacks() {
  checkWeekReset();
  const grid = document.getElementById('packs-grid')!;
  grid.innerHTML = PACKS.map(p => {
    const used = weeklyUsed(p.id);
    const limited = p.weeklyLimit > 0;
    const exhausted = limited && used >= p.weeklyLimit;
    const oddsText = Object.entries(p.odds)
      .filter(([,v]) => v > 0)
      .map(([k,v]) => `${k}: ${v}%`).join(' · ');
    return `
      <div class="pack-card ${limited ? 'limited' : ''} ${exhausted ? 'exhausted' : ''}" data-pack="${p.id}" style="${exhausted ? 'opacity:.45;cursor:default' : ''}">
        <div class="pack-icon">${p.icon}</div>
        <h3>${p.name}</h3>
        <div class="pack-cost">${p.cost.toLocaleString()} 🪙${p.draws > 1 ? ` × ${p.draws}` : ''}</div>
        <div class="pack-desc">${p.desc}</div>
        ${limited ? `<div class="pack-limit">${exhausted ? '⛔ Weekly limit reached' : `${used}/${p.weeklyLimit} this week`}</div>` : ''}
        <div class="pack-odds">${oddsText}</div>
      </div>`;
  }).join('');

  grid.querySelectorAll<HTMLElement>('.pack-card').forEach(el => {
    el.addEventListener('click', () => {
      const pack = PACKS.find(p => p.id === el.dataset.pack)!;
      purchasePack(pack);
    });
  });
}

function purchasePack(pack: typeof PACKS[0]) {
  checkWeekReset();
  if (pack.weeklyLimit > 0 && weeklyUsed(pack.id) >= pack.weeklyLimit) {
    toast('⛔ Weekly limit reached for this pack'); return;
  }
  const total = pack.cost * pack.draws;
  if (state.coins < total) { toast('❌ Not enough coins!'); return; }

  state.coins -= total;
  if (pack.weeklyLimit > 0) state.weeklyDraws[pack.id] = weeklyUsed(pack.id) + 1;

  const drawn: CardInstance[] = [];
  for (let i = 0; i < pack.draws; i++) {
    const forceMythic    = state.mythicPity >= 999;
    const forceLegendary = !forceMythic && state.legendaryPity >= 99;

    const rarity = drawRarity(pack.odds, forceMythic, forceLegendary);
    const template = pickTemplate(rarity);
    const inst = createInstance(template);
    drawn.push(inst);
    state.inventory.push(inst);
    recordDiscovered(inst.templateId);
    state.totalDraws++;

    if (rarity === 'mythic') {
      state.mythicPity = 0;
      state.legendaryPity = 0;
      state.luckValue = 0;
    } else if (rarity === 'legendary') {
      state.legendaryPity = 0;
      state.luckValue = 0;
      state.mythicPity++;
    } else {
      state.legendaryPity++;
      state.mythicPity++;
      // luck only from non-legendary/mythic draws, doesn't affect mythic
      state.luckValue = Math.min(state.luckValue + pack.luckGain, 500);
    }
  }

  saveState();
  updateHeader();
  renderPacks();

  // Three.js pack-open cinematic — calls showDrawResult when done
  const packAnim = new PackOpenAnimation();
  packAnim.play(
    pack.icon,
    drawn.map(inst => {
      const t = getTemplate(inst.templateId);
      return { icon: t.icon, name: t.name, rarity: t.rarity };
    }),
    () => showDrawResult(drawn),
  );
}

// ── Draw result overlay ───────────────────────────────────────────────────────
function showDrawResult(cards: CardInstance[]) {
  const overlay = document.getElementById('draw-overlay')!;
  const container = document.getElementById('drawn-cards-container')!;
  container.innerHTML = cards.map((inst, i) => {
    const t = getTemplate(inst.templateId);
    const mythicTag = inst.mythicNumber ? `<div class="mythic-num">#${String(inst.mythicNumber).padStart(4,'0')}</div>` : '';
    return `
      <div class="drawn-card ${t.rarity}" style="animation-delay:${i*0.07}s">
        ${mythicTag}
        <div class="card-icon">${t.icon}</div>
        <div class="card-name">${t.name}</div>
        <div class="card-rarity">${t.rarity}</div>
        <div class="card-series">${t.series}</div>
      </div>`;
  }).join('');
  overlay.classList.add('show');

  const hasMythic = cards.some(c => getTemplate(c.templateId).rarity === 'mythic');
  const hasLegendary = cards.some(c => getTemplate(c.templateId).rarity === 'legendary');
  if (hasMythic) toast('🌌 MYTHIC CARD OBTAINED! Incredible!');
  else if (hasLegendary) toast('🌟 Legendary card!');
}

document.getElementById('close-draw-overlay')!.addEventListener('click', () => {
  document.getElementById('draw-overlay')!.classList.remove('show');
  renderInventory();
});

// ── Inventory ─────────────────────────────────────────────────────────────────
let invFilter: string = 'all';

function renderInventory() {
  // Gallery score
  const score = calcGalleryScore();
  document.getElementById('gallery-score')!.textContent = score.toLocaleString();
  const breakdown = (['common','rare','epic','legendary','mythic'] as Rarity[]).map(r => {
    const count = state.inventory.filter(i => getTemplate(i.templateId).rarity === r).length;
    return count > 0 ? `${r}: ${count} (${count * RARITY_SCORE[r]}pt)` : '';
  }).filter(Boolean).join(' · ');
  document.getElementById('gallery-breakdown')!.textContent = breakdown || 'No cards yet';
  document.getElementById('gallery-bonus-rate')!.textContent = `+${calcDailyBonus()} 🪙 / day`;

  // Filter buttons
  document.querySelectorAll('.inv-filters button').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.filter === invFilter);
  });

  const filtered = state.inventory.filter(inst => {
    if (invFilter === 'all') return true;
    return getTemplate(inst.templateId).rarity === invFilter;
  });

  // Sort: mythic first, then by rarity, then by name
  const order: Record<Rarity, number> = { mythic:0, legendary:1, epic:2, rare:3, common:4 };
  filtered.sort((a,b) => {
    const ta = getTemplate(a.templateId), tb = getTemplate(b.templateId);
    return order[ta.rarity] - order[tb.rarity] || ta.name.localeCompare(tb.name);
  });

  document.getElementById('inv-stats')!.textContent =
    `${filtered.length} card${filtered.length !== 1 ? 's' : ''} · Total score: ${score.toLocaleString()} pts`;

  const grid = document.getElementById('inventory-grid')!;
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state">No cards here yet</div>';
    return;
  }
  grid.innerHTML = filtered.map(inst => cardHTML(inst, 'inv-card')).join('');

  grid.querySelectorAll<HTMLElement>('.inv-card').forEach(el => {
    el.addEventListener('click', () => {
      const iid = parseInt(el.dataset.iid!);
      const inst = state.inventory.find(i => i.instanceId === iid)!;
      openCardDetail(inst);
    });
  });
}

document.querySelectorAll('.inv-filters button').forEach(btn => {
  btn.addEventListener('click', () => {
    invFilter = (btn as HTMLElement).dataset.filter!;
    renderInventory();
  });
});

// ── Card detail dialog ────────────────────────────────────────────────────────
function openCardDetail(inst: CardInstance): void;
function openCardDetail(templateId: number): void;
function openCardDetail(arg: CardInstance | number) {
  const isInstance = typeof arg !== 'number';
  const templateId = isInstance ? (arg as CardInstance).templateId : arg;
  const t = getTemplate(templateId);
  
  // Find best instance for mythic number and obtained date (if any)
  const instances = state.inventory.filter(i => i.templateId === templateId);
  const bestInst = instances.find(i => i.mythicNumber) || instances[instances.length - 1];
  
  const mythicTag = bestInst?.mythicNumber ? `<div class="mythic-num">#${String(bestInst.mythicNumber).padStart(4,'0')}</div>` : '';
  document.getElementById('cd-card-preview')!.innerHTML = `
    <div class="detail-card ${t.rarity}">
      ${mythicTag}
      <div class="card__shine"></div>
      <div class="card__glare"></div>
      <div class="card-icon">${t.icon}</div>
      <div class="card-name">${t.name}</div>
      <div class="card-rarity">${t.rarity}</div>
    </div>`;
  document.getElementById('cd-name')!.textContent = t.name;
  const rarityEl = document.getElementById('cd-rarity')!;
  rarityEl.textContent = t.rarity.toUpperCase();
  rarityEl.className = `card-detail-rarity ${t.rarity}`;
  document.getElementById('cd-series')!.textContent = `Series: ${t.series}`;
  const mythicEl = document.getElementById('cd-mythic')!;
  if (bestInst?.mythicNumber) {
    mythicEl.textContent = `✨ Mythic #${String(bestInst.mythicNumber).padStart(4,'0')}`;
    mythicEl.style.display = 'block';
  } else {
    mythicEl.style.display = 'none';
  }
  const storyEl = document.getElementById('cd-story')!;
  if (t.story) {
    storyEl.textContent = `"${t.story}"`;
    storyEl.style.display = 'block';
  } else {
    storyEl.style.display = 'none';
  }
  document.getElementById('cd-score')!.textContent = `Collection Score: ${RARITY_SCORE[t.rarity]} pts`;
  const obtainedEl = document.getElementById('cd-obtained')!;
  if (bestInst) {
    obtainedEl.textContent = `Obtained: ${new Date(bestInst.obtainedAt).toLocaleDateString()}`;
  } else {
    obtainedEl.textContent = `Not currently owned`;
  }
  document.getElementById('card-detail')!.classList.add('show');
}

document.getElementById('card-detail-close')!.addEventListener('click', () => {
  document.getElementById('card-detail')!.classList.remove('show');
});
document.getElementById('card-detail')!.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('card-detail')!.classList.remove('show');
});

// ── Synthesis ─────────────────────────────────────────────────────────────────
let activeRecipe: typeof RECIPES[0] | null = null;
let dialogSelection = new Set<number>(); // instanceIds
let synthMultiTimes = 1; // ×1 / ×3 / ×5 / ×10

function renderSynthesis() {
  const section = document.getElementById('synth-section')!;
  section.innerHTML = RECIPES.map(r => {
    let canOpen: boolean;
    if (r.mode === 'same') {
      // Need at least 3 cards of any single non-mythic rarity
      const countByRarity: Record<string, number> = {};
      for (const inst of state.inventory) {
        const rarity = getTemplate(inst.templateId).rarity;
        if (rarity === 'mythic') continue;
        countByRarity[rarity] = (countByRarity[rarity] || 0) + 1;
      }
      canOpen = Object.values(countByRarity).some(c => c >= r.cost);
    } else {
      // Upgrade: need at least 2 of fromRarity + 1 any non-mythic
      const fromRarity = (r as any).fromRarity as Rarity;
      const primaryCount = state.inventory.filter(i => getTemplate(i.templateId).rarity === fromRarity).length;
      const anyCount = state.inventory.filter(i => getTemplate(i.templateId).rarity !== 'mythic').length;
      canOpen = primaryCount >= 2 && anyCount >= r.cost;
    }
    return `
      <div class="synth-recipe">
        <h3>${r.icon} ${r.name}</h3>
        <p>${r.desc}</p>
        <div class="rate">Success: ${r.successRate}%</div>
        <button data-recipe="${r.id}" ${canOpen ? '' : 'disabled'}>Select Cards &amp; Synthesize</button>
      </div>`;
  }).join('');

  section.querySelectorAll<HTMLElement>('button[data-recipe]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recipe = RECIPES.find(r => r.id === btn.dataset.recipe)!;
      openSynthDialog(recipe);
    });
  });
}

// Auto-select: picks best cards for `times` batches (lowest score first to preserve valuable cards).
// For times=1 selects `cost` cards; for times=N selects up to N*cost unique cards.
function autoSelectCards(recipe: typeof RECIPES[0], times = 1): void {
  dialogSelection = new Set();
  const rarityOrder: Record<Rarity, number> = { mythic:0, legendary:1, epic:2, rare:3, common:4 };
  // Pool: non-mythic, sorted cheapest first
  let pool = state.inventory
    .filter(i => getTemplate(i.templateId).rarity !== 'mythic')
    .sort((a, b) => {
      const ta = getTemplate(a.templateId), tb = getTemplate(b.templateId);
      const rDiff = rarityOrder[tb.rarity] - rarityOrder[ta.rarity]; // common=4 first
      return rDiff !== 0 ? rDiff : RARITY_SCORE[ta.rarity] - RARITY_SCORE[tb.rarity];
    });

  // Pick one batch worth of cards, removing used cards from pool each iteration
  for (let run = 0; run < times; run++) {
    const batchIds = new Set<number>();

    if (recipe.mode === 'same') {
      // Group remaining pool by rarity
      const countByRarity: Record<string, CardInstance[]> = {};
      for (const inst of pool) {
        const r = getTemplate(inst.templateId).rarity;
        if (!countByRarity[r]) countByRarity[r] = [];
        countByRarity[r].push(inst);
      }
      const eligible = Object.entries(countByRarity)
        .filter(([, arr]) => arr.length >= 3)
        .sort(([ra], [rb]) => rarityOrder[rb as Rarity] - rarityOrder[ra as Rarity]);
      if (eligible.length === 0) break; // not enough cards for this run
      const [, cards] = eligible[0];
      cards.slice(0, 3).forEach(inst => batchIds.add(inst.instanceId));

    } else if (recipe.mode === 'upgrade') {
      const fromRarity = (recipe as any).fromRarity as Rarity;
      const primary = pool.filter(i => getTemplate(i.templateId).rarity === fromRarity);
      if (primary.length < 2) break;
      primary.slice(0, 2).forEach(inst => batchIds.add(inst.instanceId));
      const any = pool.find(i => !batchIds.has(i.instanceId));
      if (!any) break;
      batchIds.add(any.instanceId);
    }

    if (batchIds.size < recipe.cost) break; // couldn't fill a full batch
    batchIds.forEach(id => dialogSelection.add(id));
    // Remove used cards from pool so next batch picks different cards
    pool = pool.filter(i => !batchIds.has(i.instanceId));
  }
}

function openSynthDialog(recipe: typeof RECIPES[0]) {
  activeRecipe = recipe;
  dialogSelection = new Set();
  synthMultiTimes = 1;
  // Reset multi-btn UI
  document.querySelectorAll('.synth-multi-btn').forEach(b => {
    b.classList.toggle('active', (b as HTMLElement).dataset.times === '1');
  });
  renderSynthDialog();
  document.getElementById('synth-dialog')!.classList.add('show');
}

function closeSynthDialog() {
  document.getElementById('synth-dialog')!.classList.remove('show');
  activeRecipe = null;
  dialogSelection = new Set();
}

function renderSynthDialog() {
  if (!activeRecipe) return;
  const r = activeRecipe;
  document.getElementById('synth-dialog-title')!.textContent = `${r.icon} ${r.name}`;
  document.getElementById('synth-dialog-desc')!.textContent = r.desc;
  document.getElementById('synth-dialog-rate')!.textContent = `Success rate: ${r.successRate}%`;
  const counter = document.getElementById('synth-dialog-counter')!;
  const totalNeeded = r.cost * synthMultiTimes;
  if (synthMultiTimes > 1) {
    const completeBatches = Math.floor(dialogSelection.size / r.cost);
    counter.textContent = `${dialogSelection.size} / ${totalNeeded} cards selected (${completeBatches} / ${synthMultiTimes} batches)`;
    counter.style.color = dialogSelection.size === totalNeeded ? '#a0ff80' : '#80c0ff';
  } else {
    counter.textContent = `${dialogSelection.size} / ${r.cost} selected`;
    counter.style.color = dialogSelection.size === r.cost ? '#a0ff80' : '#ffd700';
  }
  const confirmBtn = document.getElementById('synth-dialog-confirm') as HTMLButtonElement;
  confirmBtn.disabled = synthMultiTimes > 1
    ? dialogSelection.size < r.cost  // need at least 1 full batch
    : dialogSelection.size !== r.cost;
  confirmBtn.textContent = synthMultiTimes > 1 ? `Synthesize ×${synthMultiTimes}` : 'Synthesize';

  const rarityOrder: Record<Rarity,number> = { mythic:0, legendary:1, epic:2, rare:3, common:4 };
  const nonMythic = state.inventory.filter(i => getTemplate(i.templateId).rarity !== 'mythic');

  // Determine which cards are selectable based on recipe rules
  const selectedIds = [...dialogSelection];
  const selectedRarities = selectedIds.map(id => getTemplate(state.inventory.find(i => i.instanceId === id)!.templateId).rarity);

  function isSelectable(inst: CardInstance): boolean {
    if (dialogSelection.has(inst.instanceId)) return true; // already selected — always toggleable
    if (dialogSelection.size >= r.cost) return false; // selection full — nothing else selectable
    const t = getTemplate(inst.templateId);
    if (r.mode === 'same') {
      // All 3 must be same rarity — lock to first selected rarity
      if (selectedIds.length === 0) return true;
      return t.rarity === selectedRarities[0];
    } else if (r.mode === 'upgrade') {
      const fromRarity = (r as any).fromRarity as Rarity;
      const primaryCount = selectedRarities.filter(rv => rv === fromRarity).length;
      const anyCount = selectedRarities.filter(rv => rv !== fromRarity).length;
      if (primaryCount < 2) {
        // Still need primary rarity cards
        return t.rarity === fromRarity;
      } else {
        // 2 primary filled — 3rd slot is any non-mythic
        return anyCount < 1;
      }
    }
    return true;
  }

  const sorted = [...nonMythic].sort((a,b) =>
    rarityOrder[getTemplate(a.templateId).rarity] - rarityOrder[getTemplate(b.templateId).rarity]
  );

  const grid = document.getElementById('synth-dialog-grid')!;
  if (sorted.length === 0) {
    grid.innerHTML = '<span style="color:#5a4a7a;padding:20px">No eligible cards</span>';
    return;
  }

  grid.innerHTML = sorted.map(inst => {
    const t = getTemplate(inst.templateId);
    const sel = dialogSelection.has(inst.instanceId);
    const selectable = isSelectable(inst);
    const mythicTag = inst.mythicNumber ? `<div class="pick-mythic">#${inst.mythicNumber}</div>` : '';
    const dimmed = !sel && !selectable ? ' dimmed' : '';
    return `
      <div class="synth-pick-card ${t.rarity} ${sel ? 'selected' : ''}${dimmed}" data-iid="${inst.instanceId}" data-selectable="${selectable}">
        ${mythicTag}
        <div class="pick-icon">${t.icon}</div>
        <div class="pick-name">${t.name}</div>
        <div class="pick-rarity">${t.rarity}</div>
      </div>`;
  }).join('');

  grid.querySelectorAll<HTMLElement>('.synth-pick-card').forEach(el => {
    el.addEventListener('click', () => {
      if (synthMultiTimes > 1) return; // multi-mode: auto-managed, no manual picking
      const iid = parseInt(el.dataset.iid!);
      if (dialogSelection.has(iid)) {
        dialogSelection.delete(iid);
      } else if (el.dataset.selectable === 'true' && dialogSelection.size < r.cost) {
        dialogSelection.add(iid);
      }
      renderSynthDialog();
    });
  });
}

function performSynthesis(recipe: typeof RECIPES[0]) {
  const times = synthMultiTimes;

  // For multi-synth, auto-select all batches if not fully selected
  if (times > 1 && dialogSelection.size < recipe.cost) {
    autoSelectCards(recipe, times);
  }

  if (times === 1) {
    // ── Single synthesis ──────────────────────────────────────────────────
    if (dialogSelection.size !== recipe.cost) return;
    const ids = [...dialogSelection];
    const missing = ids.filter(id => !state.inventory.find(i => i.instanceId === id));
    if (missing.length) { closeSynthDialog(); return; }
    const selectedTemplates = ids.map(id => getTemplate(state.inventory.find(i => i.instanceId === id)!.templateId));

    let outputRarity: Rarity = 'common';
    if (recipe.mode === 'same') {
      const firstRarity = selectedTemplates[0].rarity;
      if (!selectedTemplates.every(t => t.rarity === firstRarity)) {
        toast('❌ Same Rarity Shuffle requires 3 cards of the same rarity'); return;
      }
      outputRarity = firstRarity;
    } else if (recipe.mode === 'upgrade') {
      const fromRarity = (recipe as any).fromRarity as Rarity;
      if (selectedTemplates.filter(t => t.rarity === fromRarity).length < 2) {
        toast(`❌ This recipe requires at least 2 ${fromRarity} cards`); return;
      }
      outputRarity = (recipe as any).toRarity as Rarity;
    }

    state.inventory = state.inventory.filter(i => !dialogSelection.has(i.instanceId));
    const success = cryptoRandom() * 100 < recipe.successRate;
    let newInst: CardInstance | null = null;
    if (success) {
      const template = pickTemplate(outputRarity);
      newInst = createInstance(template);
      state.inventory.push(newInst);
      recordDiscovered(newInst.templateId);
      state.consecutiveFailures = 0;
    } else {
      state.consecutiveFailures++;
    }
    saveState();
    closeSynthDialog();

    const resultTemplate = newInst ? getTemplate(newInst.templateId) : null;
    const materialInfos = selectedTemplates.map(t => ({ icon: t.icon, rarity: t.rarity, name: t.name }));
    const resultInfo = resultTemplate ? { icon: resultTemplate.icon, rarity: resultTemplate.rarity, name: resultTemplate.name } : null;

    const fx = new SynthesisEffect();
    fx.play(materialInfos, resultInfo, success, () => {
      if (success && resultTemplate) {
        toast(`✅ Synthesis succeeded! Got ${resultTemplate.icon} ${resultTemplate.name}`);
      } else {
        toast('💥 Synthesis failed — materials consumed');
      }
      renderSynthesis();
      renderInventory();
    });

  } else {
    // ── Multi-synthesis: consume pre-selected batches, then show summary ──
    // dialogSelection holds all N*cost cards; slice into batches of `cost`
    const allIds = [...dialogSelection];
    if (allIds.length < recipe.cost) { toast('❌ Not enough cards'); return; }

    let successCount = 0;
    let failCount = 0;
    let remaining = 0;

    const batches = Math.min(times, Math.floor(allIds.length / recipe.cost));
    for (let i = 0; i < batches; i++) {
      const batchIds = allIds.slice(i * recipe.cost, (i + 1) * recipe.cost);
      const batchSet = new Set(batchIds);
      const batchTemplates = batchIds.map(id => getTemplate(state.inventory.find(inst => inst.instanceId === id)!.templateId));

      let iterOutputRarity: Rarity = 'common';
      if (recipe.mode === 'same') {
        iterOutputRarity = batchTemplates[0].rarity;
      } else if (recipe.mode === 'upgrade') {
        iterOutputRarity = (recipe as any).toRarity as Rarity;
      }

      state.inventory = state.inventory.filter(inst => !batchSet.has(inst.instanceId));
      const success = cryptoRandom() * 100 < recipe.successRate;
      if (success) {
        const template = pickTemplate(iterOutputRarity);
        const newMultiInst = createInstance(template);
        state.inventory.push(newMultiInst);
        recordDiscovered(newMultiInst.templateId);
        state.consecutiveFailures = 0;
        successCount++;
      } else {
        state.consecutiveFailures++;
        failCount++;
      }
      remaining = i + 1;
    }

    saveState();
    closeSynthDialog();
    renderSynthesis();
    renderInventory();

    const total = successCount + failCount;
    if (total === 0) {
      toast('❌ Not enough cards for multi-synthesis');
    } else {
      toast(`⚗️ ×${total} Synthesis: ✅ ${successCount} succeeded, 💥 ${failCount} failed`);
    }
  }
}

document.getElementById('synth-dialog-confirm')!.addEventListener('click', () => {
  if (activeRecipe) performSynthesis(activeRecipe);
});
document.getElementById('synth-dialog-cancel')!.addEventListener('click', closeSynthDialog);
document.getElementById('synth-dialog')!.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSynthDialog();
});
document.getElementById('synth-auto-select')!.addEventListener('click', () => {
  if (activeRecipe) { autoSelectCards(activeRecipe, synthMultiTimes); renderSynthDialog(); }
});
document.querySelectorAll<HTMLElement>('.synth-multi-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    synthMultiTimes = parseInt(btn.dataset.times!);
    document.querySelectorAll('.synth-multi-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (activeRecipe) {
      if (synthMultiTimes > 1) {
        // Preview all batches for multi-mode
        autoSelectCards(activeRecipe, synthMultiTimes);
      } else {
        // Back to ×1 — clear so user picks manually
        dialogSelection = new Set();
      }
    }
    renderSynthDialog();
  });
});

// ── Catalog ───────────────────────────────────────────────────────────────────
let catalogFilter: string = 'all';
let catalogSeries: string = '';
let catalogSort: string = 'rarity';
let catalogSearch: string = '';
let catalogUnownedOnly: boolean = false;

function renderCatalog() {
  const rarityOrder: Record<Rarity, number> = { mythic:0, legendary:1, epic:2, rare:3, common:4 };

  // Mark all currently owned cards as seen
  const seenSet = new Set(state.seenInstanceIds);
  const newIds: number[] = [];
  for (const inst of state.inventory) {
    if (!seenSet.has(inst.instanceId)) newIds.push(inst.instanceId);
  }
  if (newIds.length) {
    state.seenInstanceIds = [...state.seenInstanceIds, ...newIds];
    saveState();
  }

  // Populate series dropdown once
  const seriesSelect = document.getElementById('catalog-series') as HTMLSelectElement;
  const allSeries = [...new Set(CARD_TEMPLATES.map(t => t.series))].sort();
  if (seriesSelect.options.length <= 1) {
    allSeries.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      seriesSelect.appendChild(opt);
    });
  }
  seriesSelect.value = catalogSeries;

  // Stats bar — currently owned vs total cards
  const statsEl = document.getElementById('catalog-stats')!;
  const discoveredSet = new Set(state.discoveredTemplateIds);
  const currentOwnedSet = new Set(state.inventory.map(i => i.templateId));
  const total = CARD_TEMPLATES.length;
  const currentOwnedTotal = currentOwnedSet.size;
  const rarities: Rarity[] = ['common','rare','epic','legendary','mythic'];
  statsEl.innerHTML = `
    <div class="catalog-stat"><span class="cs-label">Total</span><span class="cs-val total">${currentOwnedTotal} / ${total}</span></div>
    ${rarities.map(r => {
      const tot = CARD_TEMPLATES.filter(t => t.rarity === r).length;
      const own = CARD_TEMPLATES.filter(t => t.rarity === r && currentOwnedSet.has(t.id)).length;
      return `<div class="catalog-stat"><span class="cs-label">${r.charAt(0).toUpperCase()+r.slice(1)}</span><span class="cs-val ${r}">${own}/${tot}</span></div>`;
    }).join('')}`;

  // Build display list
  let templates = [...CARD_TEMPLATES];
  if (catalogFilter !== 'all') templates = templates.filter(t => t.rarity === catalogFilter);
  if (catalogSeries) templates = templates.filter(t => t.series === catalogSeries);
  if (catalogSearch) {
    const q = catalogSearch.toLowerCase();
    templates = templates.filter(t => t.name.toLowerCase().includes(q));
  }
  // "Unowned" filter = never discovered
  if (catalogUnownedOnly) templates = templates.filter(t => !discoveredSet.has(t.id));

  // Sort
  if (catalogSort === 'rarity') templates.sort((a,b) => rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.name.localeCompare(b.name));
  else if (catalogSort === 'name') templates.sort((a,b) => a.name.localeCompare(b.name));
  else if (catalogSort === 'id') templates.sort((a,b) => a.id - b.id);
  else if (catalogSort === 'obtained') {
    // discovered first sorted by earliest obtainedAt, then undiscovered
    templates.sort((a,b) => {
      const ia = state.inventory.find(i => i.templateId === a.id);
      const ib = state.inventory.find(i => i.templateId === b.id);
      if (!ia && !ib) return a.id - b.id;
      if (!ia) return 1;
      if (!ib) return -1;
      return ia.obtainedAt.localeCompare(ib.obtainedAt);
    });
  }

  const grid = document.getElementById('catalog-grid')!;
  if (templates.length === 0) {
    grid.innerHTML = '<div class="catalog-empty">No cards match your filters</div>';
    return;
  }

  grid.innerHTML = templates.map(t => {
    const discovered = discoveredSet.has(t.id);
    const currentlyOwned = currentOwnedSet.has(t.id);
    // Find best instance for detail view (only from current inventory)
    const instances = state.inventory.filter(i => i.templateId === t.id);
    const inst = instances.find(i => i.mythicNumber) || instances[instances.length - 1];
    const isNew = inst && newIds.includes(inst.instanceId);
    const mythicBadge = inst?.mythicNumber ? `<div class="cat-mythic-badge">#${String(inst.mythicNumber).padStart(4,'0')}</div>` : '';
    const newBadge = isNew ? `<div class="cat-new-badge">NEW</div>` : '';
    const unknownMark = discovered ? '' : `<div class="cat-unknown">?</div>`;
    const effectLayers = discovered ? `<div class="card__shine"></div><div class="card__glare"></div>` : '';
    return `
      <div class="cat-card ${discovered ? 'owned' : 'unowned'} ${t.rarity}" data-tid="${t.id}" data-discovered="${discovered}" data-currently-owned="${currentlyOwned}">
        ${mythicBadge}${newBadge}${unknownMark}${effectLayers}
        <div class="cat-icon">${t.icon}</div>
        <div class="cat-name">${discovered ? t.name : '???'}</div>
        <div class="cat-rarity">${t.rarity}</div>
        <div class="cat-series">${discovered ? t.series : '?'}</div>
      </div>`;
  }).join('');

  grid.querySelectorAll<HTMLElement>('.cat-card').forEach(el => {
    el.addEventListener('click', () => {
      const discovered = el.dataset.discovered === 'true';
      if (!discovered) { toast('🔒 Not yet obtained — try drawing packs!'); return; }
      const tid = parseInt(el.dataset.tid!);
      // If currently owned, open with instance; otherwise open with templateId
      const currentlyOwned = el.dataset.currentlyOwned === 'true';
      if (currentlyOwned) {
        const inst = state.inventory.find(i => i.templateId === tid);
        if (inst) openCardDetail(inst);
      } else {
        openCardDetail(tid);
      }
    });
  });
}

// Catalog control listeners
document.querySelectorAll<HTMLElement>('.catalog-filter-btn[data-cf]').forEach(btn => {
  btn.addEventListener('click', () => {
    catalogFilter = btn.dataset.cf!;
    document.querySelectorAll('.catalog-filter-btn[data-cf]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCatalog();
  });
});

(document.getElementById('catalog-search') as HTMLInputElement).addEventListener('input', (e) => {
  catalogSearch = (e.target as HTMLInputElement).value.trim();
  renderCatalog();
});

(document.getElementById('catalog-series') as HTMLSelectElement).addEventListener('change', (e) => {
  catalogSeries = (e.target as HTMLSelectElement).value;
  renderCatalog();
});

(document.getElementById('catalog-sort') as HTMLSelectElement).addEventListener('change', (e) => {
  catalogSort = (e.target as HTMLSelectElement).value;
  renderCatalog();
});

document.getElementById('catalog-unowned-toggle')!.addEventListener('click', function() {
  catalogUnownedOnly = !catalogUnownedOnly;
  this.classList.toggle('active', catalogUnownedOnly);
  this.textContent = catalogUnownedOnly ? 'All Cards' : 'Show Unowned';
  renderCatalog();
});

// ── Navigation ────────────────────────────────────────────────────────────────
const pages: Record<string, () => void> = {
  packs: renderPacks,
  inventory: renderInventory,
  synthesis: renderSynthesis,
  catalog: renderCatalog,
};

document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const pageId = (btn as HTMLElement).dataset.page!;
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${pageId}`)!.classList.add('active');
    pages[pageId]?.();
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadSave();
applyDailyBonus();
updateHeader();
renderPacks();
