import type { Rarity } from '../types';

/**
 * Collection data for the home-page strip and the /collection header wall.
 *
 * ADDING ART — drop the render into /public/assets/collection as `mb-*.jpg`,
 * add its path to COLLECTION_ART, and that is enough for the wall and for
 * on-chain Executives. Promoting a render to a named archetype (traits, tier)
 * is a second, deliberate step: add it to ARCHETYPES below.
 *
 * Traits and rarity live on the archetype rather than on individual pieces,
 * which keeps it honest: the same render always reports the same traits.
 *
 * Renders are exported at 640px. The largest any of them is ever drawn is the
 * 260px roster portrait on /collection, so that covers every use at 2x with
 * room to spare — and the wall loads all thirty-four eagerly, so the ceiling
 * is deliberate. Re-export from the 1200px originals if a bigger treatment
 * ever lands.
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
    key: 'street-cap',
    name: 'Street Cap',
    image: '/assets/collection/mb-street-cap.jpg',
    rarity: 'COMMON',
    description: 'Ash-grey Executive in a backwards snapback and cat-eye shades. Says nothing, signs everything.',
    traits: [
      { label: 'Background', value: 'Crimson' },
      { label: 'Hide', value: 'Ash Grey' },
      { label: 'Headwear', value: 'Red Snapback — Reversed' },
      { label: 'Eyes', value: 'Cat-Eye Shades' },
      { label: 'Mouth', value: 'Stitched Shut' },
      { label: 'Attire', value: 'Leopard Vest' },
    ],
  },
  {
    key: 'steel-jaw',
    name: 'Steel Jaw',
    image: '/assets/collection/mb-steel-jaw-captain.jpg',
    rarity: 'UNCOMMON',
    description: 'Leopard-hide Executive running a hydraulic jaw brace under a captain’s cap. Bites down and does not let go.',
    traits: [
      { label: 'Background', value: 'Slate Teal' },
      { label: 'Hide', value: 'Leopard Spot' },
      { label: 'Headwear', value: 'Naval Captain’s Cap' },
      { label: 'Jaw', value: 'Hydraulic Brace' },
      { label: 'Attire', value: 'Waistcoat & Bow Tie' },
    ],
  },
  {
    key: 'brain-dome',
    name: 'Brain Dome',
    image: '/assets/collection/mb-brain-dome.jpg',
    rarity: 'RARE',
    description: 'Exposed hyper-brain sealed under glass. Half-lidded, and entirely unimpressed.',
    traits: [
      { label: 'Background', value: 'Dusk Mauve' },
      { label: 'Hide', value: 'Ash Grey' },
      { label: 'Headwear', value: 'Glass Cortex Dome' },
      { label: 'Eyes', value: 'Half-Lidded' },
      { label: 'Attire', value: 'Python-Print Waistcoat' },
    ],
  },
  {
    key: 'samurai-ronin',
    name: 'Samurai Ronin',
    image: '/assets/collection/mb-samurai-ronin.jpg',
    rarity: 'EPIC',
    description: 'Gold-crested kabuto, red domino mask, and a plaster on one cheek. Still standing.',
    traits: [
      { label: 'Background', value: 'Amber Orange' },
      { label: 'Headwear', value: 'Gold-Crested Kabuto' },
      { label: 'Face', value: 'Red Domino Mask' },
      { label: 'Mouth', value: 'Bandaged Cheek' },
      { label: 'Attire', value: 'Spiked Check Waistcoat' },
    ],
  },
  {
    key: 'dragon-skull',
    name: 'Dragon Skull',
    image: '/assets/collection/mb-dragon-skull-officer.jpg',
    rarity: 'LEGENDARY',
    description: 'A wyrm skull helm over a red dress coat, with the rubble still hanging in the air.',
    traits: [
      { label: 'Background', value: 'Acid Green' },
      { label: 'Hide', value: 'Chestnut' },
      { label: 'Headwear', value: 'Wyrm Skull Helm' },
      { label: 'Eyes', value: 'Jade Optic' },
      { label: 'Attire', value: 'Dress Coat & Epaulettes' },
      { label: 'Aura', value: 'Levitating Rubble' },
    ],
  },
];

/**
 * Every render on disk, in one pool. Two things read it and neither wants
 * metadata: the header wall on /collection, which only ever scrolls the art
 * past, and artForToken below, which hands a real on-chain Executive its
 * picture. Demanding traits for thirty-four renders so they can slide by would
 * be bookkeeping nobody reads.
 *
 * Ordered so that near-identical builds (three dragon skulls, three horned
 * helms, two of most other families) are never neighbours. On the wall the
 * rows are dealt round-robin, so pieces three apart in this list land side by
 * side on screen: the order below leaves no family pair at that distance, and
 * the row deal widens the remaining gaps again.
 */
export const COLLECTION_ART: readonly string[] = [
  '/assets/collection/mb-pirate-tricorn.jpg',
  '/assets/collection/mb-gasmask-shades.jpg',
  '/assets/collection/mb-halo-flame.jpg',
  '/assets/collection/mb-jester-optic.jpg',
  '/assets/collection/mb-straw-goggles.jpg',
  '/assets/collection/mb-antler-eyepatch.jpg',
  '/assets/collection/mb-samurai-ronin.jpg',
  '/assets/collection/mb-dragon-skull-officer.jpg',
  '/assets/collection/mb-moto-masked.jpg',
  '/assets/collection/mb-brain-dome.jpg',
  '/assets/collection/mb-viking-laser-stripes.jpg',
  '/assets/collection/mb-lab-coat-banana.jpg',
  '/assets/collection/mb-street-cap.jpg',
  '/assets/collection/mb-miner-cucumber.jpg',
  '/assets/collection/mb-steampunk-ruff.jpg',
  '/assets/collection/mb-jester-respirator.jpg',
  '/assets/collection/mb-dragon-skull-static.jpg',
  '/assets/collection/mb-moto-pipe.jpg',
  '/assets/collection/mb-stars-cyborg.jpg',
  '/assets/collection/mb-camo-crystals.jpg',
  '/assets/collection/mb-steel-jaw-captain.jpg',
  '/assets/collection/mb-smiley-bucket.jpg',
  '/assets/collection/mb-turban-cyborg.jpg',
  '/assets/collection/mb-ushanka-cucumber.jpg',
  '/assets/collection/mb-antler-laser.jpg',
  '/assets/collection/mb-viking-scaled.jpg',
  '/assets/collection/mb-chef-respirator.jpg',
  '/assets/collection/mb-steampunk-static.jpg',
  '/assets/collection/mb-pharaoh-suit.jpg',
  '/assets/collection/mb-dragon-skull-leopard.jpg',
  '/assets/collection/mb-straw-beard.jpg',
  '/assets/collection/mb-captain-flame.jpg',
  '/assets/collection/mb-viking-laser-fur.jpg',
  '/assets/collection/mb-apple-arrow.jpg',
];

/** What the header wall on /collection scrolls: the whole pool, in pool order. */
export const WALL_ART: readonly string[] = COLLECTION_ART;

/**
 * The picture for a real, minted Executive. Deterministic, so a token keeps the
 * same face across reloads and devices — the chain is the source of truth for
 * everything about an Executive except which render it wears.
 */
export function artForToken(tokenId: number): string {
  const n = COLLECTION_ART.length;
  return COLLECTION_ART[(((tokenId - 1) % n) + n) % n];
}

/**
 * Fisher-Yates over a copy. Used for the home-page strip, which draws a fresh
 * handful of archetypes per visit.
 */
export function drawRandom<T>(pool: readonly T[], count: number): readonly T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
