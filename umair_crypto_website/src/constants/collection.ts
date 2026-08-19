import type { Rarity } from '../types';

/**
 * Collection data for the home-page strip and the /collection header wall.
 *
 * ADDING ART — the home-page strip is driven by ARCHETYPES below. Drop the
 * render into /public/assets/collection and add one entry here. The header wall
 * on /collection runs off WALL_ART instead — see the note there for why it is a
 * separate, plainer list.
 *
 * Traits and rarity live on the archetype rather than on individual pieces,
 * which keeps it honest: the same render always reports the same traits.
 */

/** Final mint size. The gallery only ever shows a sample of it. */
export const COLLECTION_SIZE = 1111;

export interface Trait {
  readonly label: string;
  readonly value: string;
}

export interface Archetype {
  readonly key: string;
  readonly name: string;
  readonly image: string;
  readonly rarity: Rarity;
  readonly description: string;
  readonly traits: readonly Trait[];
}

export const ARCHETYPES: readonly Archetype[] = [
  {
    key: 'camo-tiger',
    name: 'Camo Tiger',
    image: '/assets/collection/user_art_1.jpg',
    rarity: 'COMMON',
    description: 'Tiger-striped Oohdie in a leopard camo bucket hat. Keeps a low profile while stacking.',
    traits: [
      { label: 'Background', value: 'Dusk Mauve' },
      { label: 'Hide', value: 'Tiger Stripe' },
      { label: 'Headwear', value: 'Leopard Bucket Hat' },
      { label: 'Mouth', value: 'Lit Cigarette' },
      { label: 'Attire', value: 'Field Shirt' },
    ],
  },
  {
    key: 'cyber-cowboy',
    name: 'Cyber Cowboy',
    image: '/assets/collection/user_art_2.jpg',
    rarity: 'UNCOMMON',
    description: 'Bionic red-eye sight under a classic leather cowboy hat. Never misses a target.',
    traits: [
      { label: 'Background', value: 'Sunset Orange' },
      { label: 'Hide', value: 'Tiger Stripe' },
      { label: 'Headwear', value: 'Leather Stetson' },
      { label: 'Eyes', value: 'Chrome Optic — Red' },
      { label: 'Attire', value: 'Spiked Fur Coat' },
    ],
  },
  {
    key: 'brain-dome',
    name: 'Brain Dome',
    image: '/assets/collection/user_art_3.jpg',
    rarity: 'RARE',
    description: 'Exposed hyper-brain preserved in a glass dome. Pure tactical calculation.',
    traits: [
      { label: 'Background', value: 'Swamp Olive' },
      { label: 'Headwear', value: 'Glass Cortex Dome' },
      { label: 'Eyes', value: 'Seared Socket' },
      { label: 'Face', value: 'Black Respirator' },
      { label: 'Attire', value: 'Trench Coat & Tie' },
    ],
  },
  {
    key: 'samurai-ronin',
    name: 'Samurai Ronin',
    image: '/assets/collection/user_art_5.jpg',
    rarity: 'EPIC',
    description: 'Honor-bound armored warrior equipped with a targeted scouter eyepiece.',
    traits: [
      { label: 'Background', value: 'Steel Blue' },
      { label: 'Headwear', value: 'Gold-Crested Kabuto' },
      { label: 'Eyes', value: 'Scouter — Jade' },
      { label: 'Attire', value: 'Lacquered Ō-Yoroi' },
      { label: 'Aura', value: 'Honour-Bound' },
    ],
  },
  {
    key: 'dragon-skull',
    name: 'Dragon Skull',
    image: '/assets/collection/user_art_4.jpg',
    rarity: 'LEGENDARY',
    description: 'Crowned with an ancient dragon skull helmet over cracked stone skin.',
    traits: [
      { label: 'Background', value: 'Steel Blue' },
      { label: 'Hide', value: 'Cracked Magma Stone' },
      { label: 'Headwear', value: 'Wyrm Skull Crown' },
      { label: 'Eyes', value: 'Wide Fury' },
      { label: 'Aura', value: 'Ancient' },
    ],
  },
];

/**
 * The header wall on /collection — decorative only, so these are bare paths
 * rather than archetypes: the wall never opens a piece, names it, or reports a
 * tier, and demanding traits for forty renders to scroll them past would be
 * bookkeeping nobody reads.
 *
 * ADDING ART — drop the render in /public/assets/collection and add its path.
 * The rows re-deal themselves, so no other edit is needed.
 *
 * Ordered so that near-identical builds (four ronin, three dragon skulls) are
 * never neighbours: the list rotates through the families rather than grouping
 * them, and the row deal below widens the gaps again.
 */
export const WALL_ART: readonly string[] = [
  '/assets/collection/user_art_1.jpg',
  '/assets/collection/user_art_5.jpg',
  '/assets/collection/oohdie-visor-captain.jpg',
  '/assets/collection/user_art_4.jpg',
  '/assets/collection/oohdie-mohawk-scruff.jpg',
  '/assets/collection/user_art_3.jpg',
  '/assets/collection/oohdie-crowned-admiral.jpg',
  '/assets/collection/oohdie-cosmic-cat-hood.jpg',
  '/assets/collection/oohdie-steampunk-pale.jpg',
  '/assets/collection/oohdie-third-eye-cap.jpg',
  '/assets/collection/user_art_2.jpg',
  '/assets/collection/oohdie-astronaut.jpg',
  '/assets/collection/oohdie-camo-bucket.jpg',
  '/assets/collection/oohdie-ronin-pale.jpg',
  '/assets/collection/oohdie-tiger-captain.jpg',
  '/assets/collection/oohdie-dragon-skull-plum.jpg',
  '/assets/collection/oohdie-mohawk-crew-cream.jpg',
  '/assets/collection/oohdie-brain-dome-respirator.jpg',
  '/assets/collection/oohdie-crowned-admiral-slate.jpg',
  '/assets/collection/oohdie-cosmic-cat-crew.jpg',
  '/assets/collection/oohdie-steampunk-leopard.jpg',
  '/assets/collection/oohdie-backcap-ape.jpg',
  '/assets/collection/oohdie-cyber-cowboy-amber.jpg',
  '/assets/collection/oohdie-star-wizard.jpg',
  '/assets/collection/oohdie-leopard-ruff.jpg',
  '/assets/collection/oohdie-ronin-dark.jpg',
  '/assets/collection/oohdie-dress-captain.jpg',
  '/assets/collection/oohdie-dragon-skull-steel.jpg',
  '/assets/collection/oohdie-mohawk-crew-plum.jpg',
  '/assets/collection/oohdie-brain-dome-olive.jpg',
  '/assets/collection/oohdie-bear-hoodie.jpg',
  '/assets/collection/oohdie-pharaoh.jpg',
  '/assets/collection/oohdie-violet-tophat.jpg',
  '/assets/collection/oohdie-goggle-lollipop.jpg',
  '/assets/collection/oohdie-ronin-necktie.jpg',
  '/assets/collection/oohdie-apple-arrow.jpg',
  '/assets/collection/oohdie-pirate-tricorn.jpg',
  '/assets/collection/oohdie-laurel-cyborg.jpg',
  '/assets/collection/oohdie-pixel-visor.jpg',
  '/assets/collection/oohdie-ronin-katana.jpg',
];

/**
 * Fisher-Yates over a copy. Used for the home-page strip, which draws a fresh
 * handful per visit — with five renders on disk that only varies the order,
 * but it becomes a genuine sample the moment more art lands.
 */
export function drawRandom<T>(pool: readonly T[], count: number): readonly T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
