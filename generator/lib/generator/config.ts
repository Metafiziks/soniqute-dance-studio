import { IncompatibilityRule, DependencyRule } from "./types";

export const CONFIG = {
  collectionName: "Bags Bro!",
  collectionSize: 5555,
  collectionDescription:
    "Bags Bro! — a community-driven brand where music, memes, and animation collide into an ever-expanding Bagaverse.",
  pixelArtMode: true,
  paths: {
    layers: "./layers",
    outputImages: "./output/images",
    outputCards: "./output/cards",
    outputMetadata: "./output/metadata",
  },
  card: {
    width: 750,
    height: 1050,
    bleed: 36,
    safeZone: 54,
    artAreaRatio: 0.58,
    borderRadius: 24,
  },
  nftImageSize: 2000,
  colors: {
    background: "#0a0a0a",
    cardBg: "#111111",
    borderCommon: "#6b6b6b",
    borderUncommon: "#4a9eff",
    borderRare: "#b366ff",
    borderEpic: "#ff6b35",
    borderLegendary: "#ffd700",
    textPrimary: "#f5f0e8",
    textMuted: "#888888",
    textAccent: "#ff6b35",
    statsBg: "#1a1a1a",
    divider: "#2a2a2a",
    loreLevel1: "#6b6b6b",
    loreLevel2: "#4a9eff",
    loreLevel3: "#b366ff",
    loreLevel4: "#ff6b35",
    loreLevel5: "#ffd700",
  },
  rarityTiers: [
    { name: "Common",    weight: 60, colorKey: "borderCommon" },
    { name: "Uncommon",  weight: 25, colorKey: "borderUncommon" },
    { name: "Rare",      weight: 10, colorKey: "borderRare" },
    { name: "Epic",      weight: 4,  colorKey: "borderEpic" },
    { name: "Legendary", weight: 1,  colorKey: "borderLegendary" },
  ],
  api: {
    model: "claude-sonnet-4-20250514",
    maxTokens: 150,
  },
};

export const DEFAULT_LAYER_ORDER = [
  "Background", "Wings", "Body", "Facial_Hair", "Socks", "Shoes",
  "Bottom", "Top", "Jacket", "Outfit", "Eyes", "Head",
  "Earrings", "Mouth", "Bag_Vision", "Bag",
];

export const DEFAULT_OPTIONAL_LAYERS = [
  "Wings", "Bag_Vision", "Earrings", "Facial_Hair", "Socks",
];

export const INCOMPATIBILITY_RULES: IncompatibilityRule[] = [
  {
    id: "eyes-aviator-skimask",
    ifTrait: "Aviator",
    thenExclude: ["Ski Mask"],
    enabled: true,
  },
  {
    id: "jacket-cream-rainbow-vest",
    ifTrait: "Cream Rainbow Vest",
    thenExclude: ["Black Hoodie","Blue Hoodie","Green Hoodie","Red Hoodie","White Hoodie","Yellow Hoodie","White Collar Shirt","Yellow Collar Shirt","Navy Suit"],
    enabled: true,
  },
  {
    id: "jacket-blue-rainbow-vest",
    ifTrait: "Blue Rainbow Vest",
    thenExclude: ["Black Hoodie","Blue Hoodie","Green Hoodie","Red Hoodie","White Hoodie","Yellow Hoodie","White Collar Shirt","Yellow Collar Shirt","Navy Suit"],
    enabled: true,
  },
  {
    id: "jacket-black-rainbow-vest",
    ifTrait: "Black Rainbow Vest",
    thenExclude: ["Black Hoodie","Blue Hoodie","Green Hoodie","Red Hoodie","White Hoodie","Yellow Hoodie","White Collar Shirt","Yellow Collar Shirt","Navy Suit"],
    enabled: true,
  },
  {
    id: "jacket-bulletproof-vest",
    ifTrait: "Bulletproof Vest",
    thenExclude: ["Black Hoodie","Blue Hoodie","Green Hoodie","Red Hoodie","White Hoodie","Yellow Hoodie","White Collar Shirt","Yellow Collar Shirt","Navy Suit"],
    enabled: true,
  },
  {
    id: "jacket-lumberjack-vest",
    ifTrait: "Lumberjack Vest",
    thenExclude: ["Black Hoodie","Blue Hoodie","Green Hoodie","Red Hoodie","White Hoodie","Yellow Hoodie","White Collar Shirt","Yellow Collar Shirt","Navy Suit"],
    enabled: true,
  },
  {
    id: "jacket-safari",
    ifTrait: "Safari Jacket",
    thenExclude: ["Black Hoodie","Blue Hoodie","Green Hoodie","Red Hoodie","White Hoodie","Yellow Hoodie"],
    enabled: true,
  },
];

export const DEPENDENCY_RULES: DependencyRule[] = [
  { id: "head-samurai", ifTrait: "Samurai Helmet", thenRequire: { layer: "Outfit", traits: ["Samurai"] }, enabled: true },
  { id: "head-jester", ifTrait: "Jester Hat", thenRequire: { layer: "Outfit", traits: ["Jester"] }, enabled: true },
  { id: "head-bishop", ifTrait: "Bishop Hat", thenRequire: { layer: "Outfit", traits: ["Bishop"] }, enabled: true },
  { id: "head-skimask", ifTrait: "Ski Mask", thenRequire: { layer: "Outfit", traits: ["Ninja Suit"] }, enabled: true },
  { id: "head-aladdin", ifTrait: "Aladdin Hat", thenRequire: { layer: "Outfit", traits: ["Aladdin"] }, enabled: true },
  { id: "head-thor", ifTrait: "Thor Helmet", thenRequire: { layer: "Outfit", traits: ["Thor"] }, enabled: true },
  { id: "outfit-wizard", ifTrait: "Wizard", thenRequire: { layer: "Shoes", traits: ["Wizard Boots"] }, enabled: true },
  { id: "outfit-ninja", ifTrait: "Ninja Suit", thenRequire: { layer: "Shoes", traits: ["Ninja Boots"] }, enabled: true },
  { id: "outfit-dracula", ifTrait: "Dracula", thenRequire: { layer: "Shoes", traits: ["Black Basic"] }, enabled: true },
  { id: "outfit-jester", ifTrait: "Jester", thenRequire: { layer: "Shoes", traits: ["Jester"] }, enabled: true },
  { id: "outfit-aladdin", ifTrait: "Aladdin", thenRequire: { layer: "Shoes", traits: ["Aladdin"] }, enabled: true },
  { id: "outfit-thor", ifTrait: "Thor", thenRequire: { layer: "Shoes", traits: ["Thor Boots"] }, enabled: true },
  { id: "outfit-knight", ifTrait: "Knight", thenRequire: { layer: "Shoes", traits: ["Knight Basic"] }, enabled: true },
  { id: "outfit-bishop", ifTrait: "Bishop", thenRequire: { layer: "Shoes", traits: ["White Basic"] }, enabled: true },
  { id: "outfit-samurai", ifTrait: "Samurai", thenRequire: { layer: "Shoes", traits: ["Samurai Shoes"] }, enabled: true },
  { id: "outfit-emperor", ifTrait: "Emperor", thenRequire: { layer: "Shoes", traits: ["Red Basic"] }, enabled: true },
];

export const LORE_TRAITS = [
  {
    code: "BBS", name: "Bagsplaining Score",
    description: "Fluency in describing all phenomena through the lens of procuring bags.",
    levels: [
      { level: 1, label: "Pre-Lingual",        text: "Cannot explain anything in bag terms. Concerning." },
      { level: 2, label: "Dabbling",            text: "Occasionally relates life events back to bags. Accidentally." },
      { level: 3, label: "Conversational",      text: "Real bags don't die, they just multiply. Uses it naturally." },
      { level: 4, label: "Fluent",              text: "All philosophy, science, and relationships filtered through Bagonomics." },
      { level: 5, label: "Bagsplainer Supreme", text: "Every question answered in bags. Every time. No exceptions." },
    ],
  },
  {
    code: "BMG", name: "Bag Magic Index",
    description: "Degree to which supernatural forces have been invoked in pursuit of bags.",
    levels: [
      { level: 1, label: "Clean Hands",          text: "No spells. No incantations. Just vibes and Bagonomics." },
      { level: 2, label: "Curious Practitioner", text: "Googled bag magic once. Closed the tab." },
      { level: 3, label: "Amateur Conjurer",     text: "Lit a candle. Whispered the contract address." },
      { level: 4, label: "Dark Arts Certified",  text: "Working in secrecy. Charms deployed." },
      { level: 5, label: "Bag Sorcerer",         text: "Summoned large quantities. Unsuspecting victims confirmed." },
    ],
  },
  {
    code: "BBK", name: "Bag Blocking Resistance",
    description: "Ability to withstand slander, gaslighting, and intimidation from bag blockers.",
    levels: [
      { level: 1, label: "Unshielded",      text: "One negative tweet and the bag wobbles." },
      { level: 2, label: "Mild Resistance", text: "Knows bag blocking exists. Still reads the replies." },
      { level: 3, label: "Grounded",        text: "Bag blockers identified. Scrolling past them." },
      { level: 4, label: "Fortified",       text: "Slander absorbed. BLICKEYS untouched." },
      { level: 5, label: "Unblokkable",     text: "Mind ya bagness, activated. Bag blockers fear this card." },
    ],
  },
  {
    code: "BSG", name: "Bagsbrophysics Grade",
    description: "Understanding of the laws governing the Bagaverse.",
    levels: [
      { level: 1, label: "Pre-Big Bag Theory",    text: "Doesn't know the Bagaverse originated from anything." },
      { level: 2, label: "Surface Cosmology",     text: "Knows the Big Bag Theory. Can't explain it." },
      { level: 3, label: "Applied Bagonomics",    text: "Tracks production, distribution, and acquisition of bags." },
      { level: 4, label: "Bagonometry Certified", text: "Can calculate bag trajectories across the Bagaverse." },
      { level: 5, label: "Bagsbrophysicist",      text: "Understands bag holes, baganovas, and all bag-like phenomena." },
    ],
  },
  {
    code: "LBC", name: "Lollybagging Coefficient",
    description: "How nonchalantly one pursues bags. No urgency. No hustle. Just vibes.",
    levels: [
      { level: 1, label: "Full Send",           text: "Zero lollybagging. Up before the BM. Bag or bust." },
      { level: 2, label: "Mostly Locked In",    text: "Occasional frolicking. Gets back on track." },
      { level: 3, label: "Casual Begen",        text: "Pursuing bags in a carefree manner. No rush." },
      { level: 4, label: "Chronic Lollybagger", text: "Friends have warned them. Missed three bags this week." },
      { level: 5, label: "Terminal Lollybag",   text: "Already missed it. Unbothered. Somehow still baggish." },
    ],
  },
  {
    code: "BMA", name: "Bag Morning Average",
    description: "Consistency of the BM. Every morning is a great opportunity to get to another bag.",
    levels: [
      { level: 1, label: "Sleeps In",         text: "Misses the bag. Every time." },
      { level: 2, label: "Groggy Begen",      text: "Up, but lollybagging before noon." },
      { level: 3, label: "Reliable",          text: "BM on schedule. Baby Bag in hand." },
      { level: 4, label: "Pre-Dawn Operator", text: "First one to the bag. Every morning." },
      { level: 5, label: "Eternal BM",        text: "The bag doesn't sleep, and neither do they. B.A.G.S." },
    ],
  },
];

export const LORE_LEVEL_THRESHOLDS = [
  { maxScore: 20,  level: 1 },
  { maxScore: 40,  level: 2 },
  { maxScore: 60,  level: 3 },
  { maxScore: 80,  level: 4 },
  { maxScore: 100, level: 5 },
];
