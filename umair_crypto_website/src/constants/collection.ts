import type { Rarity } from '../types';

/**
 * Collection data for the home-page strip and the /collection gallery.
 *
 * ADDING ART — the whole thing is driven by ARCHETYPES below. Drop the render
 * into /public/assets/collection, add one entry here, and both the strip and
 * the gallery pick it up. Nothing else needs touching.
 *
 * Until the full 1,111 are rendered the gallery is built by repeating these
 * archetypes at weights that mimic a real rarity curve, so the wall has enough
 * bodies to read as a collection. Traits and rarity live on the archetype
 * rather than the individual piece, which keeps it honest: the same render
 * always reports the same traits.
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
  /** Share of the generated gallery this archetype fills. Should sum to ~1. */
  readonly weight: number;
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
    weight: 0.38,
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
    weight: 0.27,
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
    weight: 0.19,
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
    weight: 0.11,
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
    weight: 0.05,
  },
];

export interface GalleryPiece {
  readonly key: string;
  readonly tokenId: number;
  readonly name: string;
  readonly image: string;
  readonly rarity: Rarity;
  readonly description: string;
  readonly traits: readonly Trait[];
}

export const RARITY_ORDER: readonly Rarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
];

/*
 * Token ids are spread across the supply with a coprime stride so they look
 * scattered rather than sequential, while staying identical on every render —
 * a real shuffle here would renumber the art on each paint.
 */
const ID_STRIDE = 137;

function tokenIdAt(index: number): number {
  return ((index * ID_STRIDE) % COLLECTION_SIZE) + 1;
}

/**
 * Builds a gallery of `count` pieces by repeating the archetypes at their
 * weights, then interleaving them so the grid mixes tiers instead of running
 * commons-first. Deterministic: same input, same wall, every render.
 */
export function buildGallery(count: number): readonly GalleryPiece[] {
  /*
   * Spread each archetype evenly across the whole grid rather than dealing
   * them round-robin. A plain round-robin runs out of the rare tiers early and
   * leaves a long tail of nothing but the common build; giving every piece a
   * fractional slot and sorting on it keeps all five tiers mixed end to end.
   */
  const owedPer = ARCHETYPES.map((archetype) =>
    Math.max(1, Math.round(archetype.weight * count)),
  );

  // Rounding each share independently lands short of (or over) the target, so
  // settle the difference on the commonest tier — the one place a few pieces
  // either way does not distort the curve.
  const commonest = owedPer.indexOf(Math.max(...owedPer));
  const shortfall = count - owedPer.reduce((sum, n) => sum + n, 0);
  owedPer[commonest] = Math.max(1, owedPer[commonest] + shortfall);

  const slotted = ARCHETYPES.flatMap((archetype, k) => {
    const owed = owedPer[k];
    return Array.from({ length: owed }, (_, j) => ({
      archetype,
      slot: (j + 0.5) / owed,
    }));
  });

  slotted.sort((a, b) => a.slot - b.slot);

  return slotted.slice(0, count).map(({ archetype }, index) => {
    const tokenId = tokenIdAt(index);

    return {
      key: `${archetype.key}-${tokenId}`,
      tokenId,
      name: `Oohdie #${String(tokenId).padStart(4, '0')} — ${archetype.name}`,
      image: archetype.image,
      rarity: archetype.rarity,
      description: archetype.description,
      traits: archetype.traits,
    };
  });
}

/** The wall on /collection. Big enough to feel deep, small enough to stay fast. */
export const COLLECTION_GALLERY = buildGallery(48);

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
