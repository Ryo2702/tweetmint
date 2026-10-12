// This module contains only local, fictional demo activity. It is never a
// source of X, wallet, market, or on-chain data.

export const FICTIONAL_COMMUNITY_NOTICE =
  'Community posts, reactions, tokens, and activity are not verified X or blockchain events.';

export const REACTION_TYPES = [
  'laugh',
  'heart',
  'fire',
  'rocket',
  'shocked',
  'crying',
  'skull',
  'bullish',
  'bearish',
];

export const TRENDING_FILTERS = [
  'trending',
  'newest',
  'most-reacted',
  'most-shared',
  'just-minted',
  'viral-coins',
];

export const createEmptyReactionCounts = () =>
  Object.fromEntries(REACTION_TYPES.map((type) => [type, 0]));

const characterBlueprints = [
  {
    handle: '@pixelmatt',
    displayName: 'Pixel Matt',
    palette: '#c7f464',
    hair: 'messy black',
    outfit: 'lime hoodie',
    accessory: 'square glasses',
    personality: 'dry and observant',
    interests: ['internet humor', 'office ergonomics'],
  },
  {
    handle: '@mooncat',
    displayName: 'Moon Cat',
    palette: '#b6a6ff',
    hair: 'violet bob',
    outfit: 'moon jacket',
    accessory: 'cat-ear headphones',
    personality: 'warmly speculative',
    interests: ['crypto culture', 'night markets'],
  },
  {
    handle: '@sleepydev',
    displayName: 'Sleepy Dev',
    palette: '#7ad8d2',
    hair: 'bedhead brown',
    outfit: 'oversized cardigan',
    accessory: 'coffee mug',
    personality: 'precise but tired',
    interests: ['programming', 'debugging'],
  },
  {
    handle: '@chairlord',
    displayName: 'Chair Lord',
    palette: '#ffad5c',
    hair: 'silver side part',
    outfit: 'orange vest',
    accessory: 'tiny stool pin',
    personality: 'ceremoniously mundane',
    interests: ['furniture', 'small rituals'],
  },
  {
    handle: '@internetghost',
    displayName: 'Internet Ghost',
    palette: '#e9e2d0',
    hair: 'white fringe',
    outfit: 'ghost-grey coat',
    accessory: 'pixel pager',
    personality: 'wry archivist',
    interests: ['trends', 'old web lore'],
  },
  {
    handle: '@bytebloom',
    displayName: 'Byte Bloom',
    palette: '#f58bd6',
    hair: 'pink braid',
    outfit: 'patchwork overalls',
    accessory: 'floppy-disk charm',
    personality: 'joyfully experimental',
    interests: ['creative code', 'digital gardens'],
  },
  {
    handle: '@neonmoss',
    displayName: 'Neon Moss',
    palette: '#8ee36b',
    hair: 'moss green crop',
    outfit: 'utility jumpsuit',
    accessory: 'leaf visor',
    personality: 'calm systems thinker',
    interests: ['urban ecology', 'hardware'],
  },
  {
    handle: '@snacksexecutable',
    displayName: 'snacks.exe',
    palette: '#ffc857',
    hair: 'amber curls',
    outfit: 'snack-print tee',
    accessory: 'chip clip',
    personality: 'enthusiastically snack-led',
    interests: ['food', 'games'],
  },
  {
    handle: '@renderkid',
    displayName: 'Render Kid',
    palette: '#6ba7ff',
    hair: 'blue undercut',
    outfit: 'paint-splashed smock',
    accessory: 'three-color pen',
    personality: 'visual perfectionist',
    interests: ['pixel art', 'animation'],
  },
  {
    handle: '@bugoracle',
    displayName: 'Bug Oracle',
    palette: '#d1a0ff',
    hair: 'purple bun',
    outfit: 'dark cloak',
    accessory: 'magnifying monocle',
    personality: 'cryptically helpful',
    interests: ['bugs', 'systems'],
  },
  {
    handle: '@lilacledger',
    displayName: 'Lilac Ledger',
    palette: '#c7a0d8',
    hair: 'lilac waves',
    outfit: 'neat blazer',
    accessory: 'pocket calculator',
    personality: 'careful and kind',
    interests: ['personal finance', 'spreadsheets'],
  },
  {
    handle: '@cablegoblin',
    displayName: 'Cable Goblin',
    palette: '#84b68d',
    hair: 'wild auburn',
    outfit: 'tool-belt jacket',
    accessory: 'coiled cable',
    personality: 'resourceful tinkerer',
    interests: ['repair', 'retro hardware'],
  },
  {
    handle: '@algoclaw',
    displayName: 'Algo Claw',
    palette: '#e46b6b',
    hair: 'red pompadour',
    outfit: 'crab-red sweater',
    accessory: 'claw hair clip',
    personality: 'competitive puzzle solver',
    interests: ['algorithms', 'arcades'],
  },
  {
    handle: '@starboard',
    displayName: 'Starboard',
    palette: '#f4d35e',
    hair: 'navy ponytail',
    outfit: 'sailor coat',
    accessory: 'brass compass',
    personality: 'optimistic navigator',
    interests: ['community maps', 'stargazing'],
  },
  {
    handle: '@tinysignal',
    displayName: 'Tiny Signal',
    palette: '#69d2e7',
    hair: 'cyan buzz cut',
    outfit: 'signal-blue windbreaker',
    accessory: 'antenna pin',
    personality: 'quietly incisive',
    interests: ['radio', 'privacy'],
  },
  {
    handle: '@loopgoblin',
    displayName: 'Loop Goblin',
    palette: '#ff8c69',
    hair: 'copper curls',
    outfit: 'striped sweater',
    accessory: 'loop pedal',
    personality: 'playfully repetitive',
    interests: ['music', 'memes'],
  },
  {
    handle: '@softserve',
    displayName: 'Soft Serve',
    palette: '#f4b6c2',
    hair: 'cream pompadour',
    outfit: 'pastel apron',
    accessory: 'ice-cream badge',
    personality: 'gentle host',
    interests: ['community care', 'desserts'],
  },
  {
    handle: '@keyboardkite',
    displayName: 'Keyboard Kite',
    palette: '#9cc2ff',
    hair: 'black pigtails',
    outfit: 'windbreaker',
    accessory: 'keycap necklace',
    personality: 'quick and curious',
    interests: ['mechanical keyboards', 'weather'],
  },
  {
    handle: '@patchnotes',
    displayName: 'Patch Notes',
    palette: '#a4de9b',
    hair: 'forest fade',
    outfit: 'utility shirt',
    accessory: 'checklist badge',
    personality: 'methodical optimist',
    interests: ['product design', 'game updates'],
  },
  {
    handle: '@staticmoth',
    displayName: 'Static Moth',
    palette: '#aaa1c8',
    hair: 'charcoal fringe',
    outfit: 'dusty cape',
    accessory: 'moth brooch',
    personality: 'soft-spoken collector',
    interests: ['late-night radio', 'poetry'],
  },
  {
    handle: '@glitchgarden',
    displayName: 'Glitch Garden',
    palette: '#61d095',
    hair: 'teal braids',
    outfit: 'garden overalls',
    accessory: 'pixel flower',
    personality: 'patient cultivator',
    interests: ['gardening', 'open source'],
  },
  {
    handle: '@packetpigeon',
    displayName: 'Packet Pigeon',
    palette: '#b0b8c8',
    hair: 'grey quiff',
    outfit: 'courier vest',
    accessory: 'message tube',
    personality: 'fast-talking courier',
    interests: ['networks', 'city stories'],
  },
  {
    handle: '@vaporwavevin',
    displayName: 'Vaporwave Vin',
    palette: '#ff91c8',
    hair: 'pink mullet',
    outfit: 'sunset tracksuit',
    accessory: 'tiny synth',
    personality: 'dramatically nostalgic',
    interests: ['synths', 'retro ads'],
  },
  {
    handle: '@sundaybuffer',
    displayName: 'Sunday Buffer',
    palette: '#f5d48e',
    hair: 'soft brown waves',
    outfit: 'weekend knit',
    accessory: 'tea thermos',
    personality: 'unhurried listener',
    interests: ['slow mornings', 'reading'],
  },
  {
    handle: '@orbittoast',
    displayName: 'Orbit Toast',
    palette: '#ffbd69',
    hair: 'golden crop',
    outfit: 'space bakery uniform',
    accessory: 'planet pin',
    personality: 'silly cosmic baker',
    interests: ['space', 'breakfast'],
  },
];

const toCharacterId = (handle) => `fictional-${handle.slice(1)}`;

export const fictionalCharacters = characterBlueprints.map((character, index) => {
  const currentActivity = index % 3 === 0 ? 'reading' : index % 3 === 1 ? 'chatting' : 'exploring';
  return {
    id: toCharacterId(character.handle),
    ...character,
    username: character.handle.slice(1),
    color: character.palette,
    skin: ['#d99b78', '#8e5845', '#bd7957', '#f0c49a', '#a86e4d'][index % 5],
    hairColor: ['#26251f', '#482f2a', '#795548', '#d8bd86', '#3f4b2d'][index % 5],
    status: currentActivity,
    avatar: {
      palette: character.palette,
      hair: character.hair,
      outfit: character.outfit,
      accessory: character.accessory,
    },
    accountType: 'fictional-community-character',
    isFictional: true,
    identityLabel: 'Fictional community character',
    currentActivity,
    activityFrequency: 0.8 + (index % 5) * 0.15,
    reactionPreferences: REACTION_TYPES.slice(index % REACTION_TYPES.length, (index % REACTION_TYPES.length) + 3),
    conversationHistory: [],
    movementPattern: ['wander', 'linger', 'loop'][index % 3],
  };
});

const characterIdByHandle = Object.fromEntries(
  fictionalCharacters.map((character) => [character.handle.slice(1), character.id]),
);

const postBlueprints = [
  {
    author: 'pixelmatt',
    topic: 'internet-humor',
    subject: 'an expensive chair',
    content: "I spent $900 on a chair and somehow I'm still uncomfortable.",
    comments: [
      { author: 'mooncat', content: 'Does the chair come with a wallet?' },
      { author: 'internetghost', content: 'Luxury seating has entered its villain era.' },
    ],
    reply: { author: 'pixelmatt', content: 'No, the chair is my entire portfolio.' },
    token: 'fictional-token-chair',
  },
  {
    author: 'mooncat',
    topic: 'crypto-culture',
    subject: 'a paper moon chart',
    content: 'My most reliable market indicator is whether the plaza cat chooses the warm keyboard.',
  },
  {
    author: 'sleepydev',
    topic: 'programming',
    subject: 'a one-line fix',
    content: 'The bug was fixed by deleting the clever part. I need to lie down for eight hours.',
  },
  {
    author: 'chairlord',
    topic: 'everyday',
    subject: 'a spare chair',
    content: 'A spare chair is just a throne waiting for a visitor with a dramatic entrance.',
  },
  {
    author: 'internetghost',
    topic: 'social',
    subject: 'an old forum signature',
    content: 'Found an old forum signature that said “brb becoming legendary.” It was from 2007. Respect.',
  },
  {
    author: 'bytebloom',
    topic: 'creative-code',
    subject: 'a pixel flower',
    content: 'I made a pixel flower that only blooms when you stop hovering over it.',
  },
  {
    author: 'neonmoss',
    topic: 'hardware',
    subject: 'a repaired lamp',
    content: 'Repaired a desk lamp with one screw, two kind words, and an alarming amount of tape.',
  },
  {
    author: 'snacksexecutable',
    topic: 'food',
    subject: 'midnight noodles',
    content: 'Midnight noodles are not a meal. They are a software update for the soul.',
  },
  {
    author: 'renderkid',
    topic: 'pixel-art',
    subject: 'a four-pixel shadow',
    content: 'A four-pixel shadow can either make a room cozy or make it look like a tax office.',
  },
  {
    author: 'bugoracle',
    topic: 'programming',
    subject: 'a haunted cache',
    content: 'The cache is haunted, but only on Tuesdays. I have named the ghost “stale data.”',
  },
  {
    author: 'lilacledger',
    topic: 'finance-memes',
    subject: 'a budget spreadsheet',
    content: 'My budget spreadsheet has a tab called “small treats” and it is becoming sentient.',
  },
  {
    author: 'cablegoblin',
    topic: 'hardware',
    subject: 'a mystery adapter',
    content: 'I found an adapter in the drawer. It fits nothing I own, which means it is extremely important.',
  },
  {
    author: 'algoclaw',
    topic: 'gaming',
    subject: 'an arcade leaderboard',
    content: 'The arcade leaderboard is just a public record of who can panic most efficiently.',
  },
  {
    author: 'starboard',
    topic: 'social',
    subject: 'a plaza map',
    content: 'Added a “lost in thought” marker to the plaza map. It points at every bench.',
  },
  {
    author: 'tinysignal',
    topic: 'tech',
    subject: 'a quiet notification',
    content: 'Every notification should have to introduce itself before interrupting me.',
  },
  {
    author: 'loopgoblin',
    topic: 'music',
    subject: 'a three-second loop',
    content: 'I made a three-second loop that sounds like a toaster achieving enlightenment.',
  },
  {
    author: 'softserve',
    topic: 'community',
    subject: 'the lounge kettle',
    content: 'The lounge kettle has heard more excellent ideas than most meeting rooms.',
  },
  {
    author: 'keyboardkite',
    topic: 'tech',
    subject: 'a clicky keyboard',
    content: 'My keyboard is so clicky that nearby pigeons are filing noise complaints.',
  },
  {
    author: 'patchnotes',
    topic: 'work',
    subject: 'a tiny release note',
    content: 'Patch note: moved the button two pixels. Morale has increased by twelve percent.',
  },
  {
    author: 'staticmoth',
    topic: 'internet-humor',
    subject: 'a loading spinner',
    content: 'A loading spinner is a tiny clock telling you that it has secrets.',
  },
  {
    author: 'glitchgarden',
    topic: 'creative-code',
    subject: 'a bug-shaped flower',
    content: 'Today’s garden status: the bug-shaped flowers are thriving. The actual bugs are also thriving.',
  },
  {
    author: 'packetpigeon',
    topic: 'networks',
    subject: 'a delayed message',
    content: 'A delayed message is just a letter taking the scenic route through the internet.',
  },
  {
    author: 'vaporwavevin',
    topic: 'music',
    subject: 'a mall synth',
    content: 'I want a synth preset called “mall fountain at 4:57 PM.”',
  },
  {
    author: 'sundaybuffer',
    topic: 'everyday',
    subject: 'a slow morning',
    content: 'A slow morning is not unproductive. It is buffering at a humane bitrate.',
  },
  {
    author: 'orbittoast',
    topic: 'food',
    subject: 'cosmic toast',
    content: 'Toast is proof that bread can have a second act.',
  },
  {
    author: 'pixelmatt',
    topic: 'work',
    subject: 'a calendar invite',
    content: 'My calendar asked if a meeting could have been an email. It has become self-aware.',
  },
  {
    author: 'mooncat',
    topic: 'crypto-culture',
    subject: 'a tiny coin garden',
    content: 'The coin garden is for tickers only. Please water responsibly.',
    token: 'fictional-token-moss',
  },
  {
    author: 'sleepydev',
    topic: 'programming',
    subject: 'a deployment checklist',
    content: 'New deployment checklist item: ask the code politely to keep working.',
  },
  {
    author: 'chairlord',
    topic: 'internet-humor',
    subject: 'an office stool',
    content: 'The office stool has seen things. Mostly crumbs, but still.',
  },
  {
    author: 'internetghost',
    topic: 'social',
    subject: 'a bookmark folder',
    content: 'My bookmarks folder called “read later” is now a historical archive.',
  },
  {
    author: 'bytebloom',
    topic: 'pixel-art',
    subject: 'a blinking cursor',
    content: 'A blinking cursor is the smallest possible pep talk.',
  },
  {
    author: 'neonmoss',
    topic: 'hardware',
    subject: 'a sunny server rack',
    content: 'Put a tiny plant next to the server rack. It is now the most emotionally available machine here.',
  },
  {
    author: 'snacksexecutable',
    topic: 'gaming',
    subject: 'a vending machine boss',
    content: 'The vending machine ate my coin and unlocked its final boss form.',
  },
  {
    author: 'renderkid',
    topic: 'creative-code',
    subject: 'a tiny animation',
    content: 'The secret to a lively animation is one frame where everything briefly looks embarrassed.',
  },
  {
    author: 'bugoracle',
    topic: 'programming',
    subject: 'an error message',
    content: 'The error message says “unexpected token.” I agree, it was not invited.',
  },
  {
    author: 'lilacledger',
    topic: 'finance-memes',
    subject: 'a reward points balance',
    content: 'My reward points are worth approximately one tote bag and a moral lesson.',
  },
  {
    author: 'cablegoblin',
    topic: 'retro-tech',
    subject: 'a floppy disk',
    content: 'Found a floppy disk labeled “important.” The suspense is immaculate.',
  },
  {
    author: 'algoclaw',
    topic: 'gaming',
    subject: 'a tutorial level',
    content: 'The tutorial level said “press any key.” I chose escape. It respected my boundaries.',
  },
  {
    author: 'starboard',
    topic: 'community',
    subject: 'a public bench',
    content: 'Reserved the sunny bench for anyone who needs to stare at one thought until it behaves.',
  },
  {
    author: 'tinysignal',
    topic: 'privacy',
    subject: 'a friendly settings page',
    content: 'A friendly settings page is one that does not hide the “no thanks” button in a hedge maze.',
  },
  {
    author: 'loopgoblin',
    topic: 'music',
    subject: 'a keyboard rhythm',
    content: 'Someone typing nearby accidentally made the best drum loop of the afternoon.',
  },
  {
    author: 'softserve',
    topic: 'community',
    subject: 'the snack shelf',
    content: 'The snack shelf is not empty. It is between snacks.',
  },
  {
    author: 'keyboardkite',
    topic: 'tech',
    subject: 'a lost keycap',
    content: 'A keycap rolled under my desk. It is now in a better place, probably a dust civilization.',
  },
  {
    author: 'patchnotes',
    topic: 'work',
    subject: 'a bug report',
    content: 'Good bug reports are tiny detective novels with fewer trench coats.',
  },
  {
    author: 'staticmoth',
    topic: 'internet-humor',
    subject: 'an offline mode',
    content: 'Offline mode is just the internet taking a contemplative walk.',
  },
  {
    author: 'glitchgarden',
    topic: 'open-source',
    subject: 'a helpful pull request',
    content: 'A helpful pull request feels like finding a perfectly labeled seed packet.',
  },
  {
    author: 'packetpigeon',
    topic: 'networks',
    subject: 'a router blink',
    content: 'The router blinked three times at me. I blinked back. We have an understanding now.',
  },
  {
    author: 'vaporwavevin',
    topic: 'retro-tech',
    subject: 'a beige computer',
    content: 'Beige computers were brave enough to look like household appliances.',
  },
  {
    author: 'sundaybuffer',
    topic: 'everyday',
    subject: 'a rainy window',
    content: 'Rain on the window is the original focus playlist.',
  },
  {
    author: 'orbittoast',
    topic: 'space',
    subject: 'a lunar breakfast',
    content: 'If we ever live on the moon, breakfast will still be the most important launch window.',
  },
  {
    author: 'pixelmatt',
    topic: 'internet-humor',
    subject: 'a customer support bot',
    content: 'Customer support bot asked how it could help. I said “emotionally.” It transferred me immediately.',
  },
  {
    author: 'mooncat',
    topic: 'crypto-culture',
    subject: 'a ticker doodle',
    content: 'Doodled a ticker on a napkin. The napkin has no liquidity and excellent vibes.',
    token: 'fictional-token-moon',
  },
  {
    author: 'sleepydev',
    topic: 'programming',
    subject: 'a test suite',
    content: 'The test suite passed after I stopped watching it. It craves privacy.',
  },
  {
    author: 'chairlord',
    topic: 'everyday',
    subject: 'a waiting room chair',
    content: 'Every waiting room chair has a different opinion about posture.',
  },
  {
    author: 'internetghost',
    topic: 'social',
    subject: 'a trending phrase',
    content: 'A trending phrase is a tiny parade that forgot where it was going.',
  },
  {
    author: 'bytebloom',
    topic: 'creative-code',
    subject: 'a tiny website',
    content: 'Built a tiny website that compliments your cursor once per visit.',
  },
  {
    author: 'neonmoss',
    topic: 'hardware',
    subject: 'a recycled keyboard',
    content: 'Reused old keycaps as garden labels. The basil is now technically a command line.',
  },
  {
    author: 'snacksexecutable',
    topic: 'food',
    subject: 'a ceremonial cookie',
    content: 'I made a ceremonial cookie for surviving the afternoon. It was deliciously official.',
  },
  {
    author: 'renderkid',
    topic: 'pixel-art',
    subject: 'a two-color sunset',
    content: 'A two-color sunset is still a sunset if you believe in the dithering.',
  },
  {
    author: 'bugoracle',
    topic: 'programming',
    subject: 'a missing semicolon',
    content: 'The missing semicolon was not the problem, but it enjoyed the attention.',
  },
];

const seedDate = (offset) =>
  new Date(Date.UTC(2026, 9, 10, 18, 0, 0) - offset * 17 * 60 * 1000).toISOString();

const makePostId = (index) => `fictional-post-${String(index + 1).padStart(3, '0')}`;

export const fictionalPosts = postBlueprints.map((post, index) => ({
  id: makePostId(index),
  authorId: characterIdByHandle[post.author],
  content: post.content,
  topic: post.topic,
  subject: post.subject,
  createdAt: seedDate(index),
  source: 'fictional-community',
  isFictional: true,
  identityLabel: 'Fictional community post',
  media: [],
  relatedTokenId: post.token || null,
  reactionCounts: createEmptyReactionCounts(),
  commentCount: 0,
  shareCount: 0,
}));

const genericCommentsByTopic = {
  programming: ['That is exactly the sort of fix that deserves a quiet celebration.', 'Saving this for the next debugging ritual.'],
  'crypto-culture': ['Excellent coin-garden energy.', 'The disclaimer makes this the safest ticker in the plaza.'],
  'internet-humor': ['This belongs in the permanent internet museum.', 'I laughed in a very responsible way.'],
  everyday: ['There is real wisdom in this ordinary little crisis.', 'The plaza agrees with this observation.'],
  social: ['This is why I keep a notebook for stray internet thoughts.', 'A very good entry for the community archive.'],
  'creative-code': ['That tiny detail is doing a lot of emotional work.', 'Please let the pixels know they are appreciated.'],
  hardware: ['Repair magic is mostly patience wearing a tool belt.', 'That object has earned a place of honor on the workbench.'],
  food: ['This is the kind of snack research I support.', 'A thoughtful and highly actionable food opinion.'],
  'pixel-art': ['Four pixels can carry a surprising amount of atmosphere.', 'The dithering council approves.'],
  'finance-memes': ['A spreadsheet can be a diary if the columns are honest.', 'This is why categories need snacks and feelings.'],
  gaming: ['That is a difficult achievement with excellent flavor text.', 'I would absolutely lose to that final boss.'],
  tech: ['A small interface kindness goes a long way.', 'Adding this to my list of good design wishes.'],
  music: ['That description has a rhythm all on its own.', 'Please preserve this sound for the plaza archive.'],
  community: ['The lounge has quietly become the best part of the map.', 'That is a good reason to leave a light on.'],
  networks: ['Messages deserve a scenic route now and then.', 'The packet pigeons are doing their best.'],
  'retro-tech': ['Old hardware has impeccable stage presence.', 'The mystery is half the operating system.'],
  privacy: ['A clear “no thanks” is a tiny public service.', 'This should be on a plaque near every settings menu.'],
  'open-source': ['A well-labeled contribution is a real kindness.', 'That is the sort of maintenance story I like hearing.'],
  space: ['Breakfast will absolutely remain mission critical.', 'I volunteer to test the cosmic toast protocol.'],
};

const commentAuthorFor = (postIndex, offset) =>
  fictionalCharacters[(postIndex * 5 + offset + 1) % fictionalCharacters.length].id;

const createdComment = ({ id, postId, authorId, content, createdAt, parentCommentId = null }) => ({
  id,
  postId,
  authorId,
  parentCommentId,
  content,
  createdAt,
  source: 'fictional-community',
  isFictional: true,
  identityLabel: 'Fictional community comment',
  reactionCounts: createEmptyReactionCounts(),
});

const seededComments = [];

fictionalPosts.forEach((post, postIndex) => {
  const blueprint = postBlueprints[postIndex];
  const fallback = genericCommentsByTopic[blueprint.topic] || genericCommentsByTopic.social;
  const comments = blueprint.comments || [
    { authorId: commentAuthorFor(postIndex, 0), content: fallback[0] },
    { authorId: commentAuthorFor(postIndex, 1), content: fallback[1] },
  ];

  const topLevel = comments.map((comment, commentIndex) => {
    const created = createdComment({
      id: `fictional-comment-${String(seededComments.length + 1).padStart(3, '0')}`,
      postId: post.id,
      authorId: comment.author ? characterIdByHandle[comment.author] : comment.authorId,
      content: comment.content,
      createdAt: seedDate(postIndex) + '',
    });
    seededComments.push(created);
    return created;
  });

  if (blueprint.reply || postIndex % 3 === 1) {
    const reply = blueprint.reply || {
      authorId: commentAuthorFor(postIndex, 2),
      content: `The ${blueprint.subject} has officially become a plaza conversation starter.`,
    };
    seededComments.push(
      createdComment({
        id: `fictional-comment-${String(seededComments.length + 1).padStart(3, '0')}`,
        postId: post.id,
        authorId: reply.author ? characterIdByHandle[reply.author] : reply.authorId,
        parentCommentId: topLevel[0].id,
        content: reply.content,
        createdAt: seedDate(postIndex) + '',
      }),
    );
  }
});

export const fictionalComments = seededComments;

const reactionCycle = ['laugh', 'heart', 'fire', 'rocket', 'shocked', 'crying', 'skull', 'bullish', 'bearish'];
const seededReactions = [];

fictionalPosts.forEach((post, postIndex) => {
  const reactionTotal = 2 + (postIndex % 4);
  for (let reactionIndex = 0; reactionIndex < reactionTotal; reactionIndex += 1) {
    let actor = fictionalCharacters[(postIndex * 3 + reactionIndex + 1) % fictionalCharacters.length].id;
    if (actor === post.authorId) {
      actor = fictionalCharacters[(postIndex * 3 + reactionIndex + 2) % fictionalCharacters.length].id;
    }
    const reactionType = reactionCycle[(postIndex + reactionIndex) % reactionCycle.length];
    post.reactionCounts[reactionType] += 1;
    seededReactions.push({
      id: `fictional-reaction-${String(seededReactions.length + 1).padStart(3, '0')}`,
      targetType: 'post',
      targetId: post.id,
      actorId: actor,
      reactionType,
      createdAt: seedDate(postIndex),
      source: 'fictional-community',
      isFictional: true,
    });
  }
});

export const fictionalReactions = seededReactions;

const seededShares = [];
fictionalPosts.forEach((post, postIndex) => {
  if (postIndex % 4 !== 0) return;
  const actorId = fictionalCharacters[(postIndex * 7 + 3) % fictionalCharacters.length].id;
  post.shareCount += 1;
  seededShares.push({
    id: `fictional-share-${String(seededShares.length + 1).padStart(3, '0')}`,
    postId: post.id,
    actorId,
    type: 'repost',
    createdAt: seedDate(postIndex),
    source: 'fictional-community',
    isFictional: true,
  });
});

export const fictionalShares = seededShares;

fictionalComments.forEach((comment) => {
  const post = fictionalPosts.find((item) => item.id === comment.postId);
  if (post) post.commentCount += 1;
});

export const fictionalTokens = [
  {
    id: 'fictional-token-chair',
    name: 'Chair Coin Concept',
    ticker: 'CHAIR',
    sourcePostId: 'fictional-post-001',
    status: 'fictional-concept',
    verifiedOnChain: false,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
  {
    id: 'fictional-token-moss',
    name: 'Moss Coin Concept',
    ticker: 'MOSS',
    sourcePostId: 'fictional-post-027',
    status: 'fictional-concept',
    verifiedOnChain: false,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
  {
    id: 'fictional-token-moon',
    name: 'Moon Napkin Concept',
    ticker: 'NAPKIN',
    sourcePostId: 'fictional-post-052',
    status: 'fictional-concept',
    verifiedOnChain: false,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
  {
    id: 'fictional-token-toast',
    name: 'Orbit Toast Concept',
    ticker: 'TOAST',
    sourcePostId: 'fictional-post-050',
    status: 'fictional-concept',
    verifiedOnChain: false,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
  {
    id: 'fictional-token-loop',
    name: 'Loop Coin Concept',
    ticker: 'LOOP',
    sourcePostId: 'fictional-post-016',
    status: 'fictional-concept',
    verifiedOnChain: false,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
  {
    id: 'fictional-token-frame',
    name: 'Frame Coin Concept',
    ticker: 'FRAME',
    sourcePostId: 'fictional-post-009',
    status: 'fictional-concept',
    verifiedOnChain: false,
    freeDemo: true,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
  {
    id: 'fictional-token-glow',
    name: 'Glow Coin Concept',
    ticker: 'GLOW',
    sourcePostId: 'fictional-post-033',
    status: 'fictional-concept',
    verifiedOnChain: false,
    freeDemo: true,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
  {
    id: 'fictional-token-byte',
    name: 'Byte Coin Concept',
    ticker: 'BYTE',
    sourcePostId: 'fictional-post-057',
    status: 'fictional-concept',
    verifiedOnChain: false,
    freeDemo: true,
    marketDataStatus: 'unavailable',
    disclaimer: 'Fictional local concept. Not deployed, tradeable, or a representation of blockchain activity.',
  },
];

fictionalTokens.forEach((token) => {
  const post = fictionalPosts.find((item) => item.id === token.sourcePostId);
  if (post && !post.relatedTokenId) post.relatedTokenId = token.id;
});

fictionalPosts.forEach((post) => {
  post.token = fictionalTokens.find((token) => token.id === post.relatedTokenId) || null;
});

export const fictionalActivity = fictionalPosts.slice(0, 24).map((post, index) => ({
  id: `fictional-activity-${String(index + 1).padStart(3, '0')}`,
  type: index % 4 === 0 ? 'post-shared' : index % 3 === 0 ? 'comment-created' : 'post-created',
  actorId: index % 4 === 0 ? fictionalShares.find((share) => share.postId === post.id)?.actorId || post.authorId : post.authorId,
  postId: post.id,
  createdAt: post.createdAt,
  source: 'fictional-community',
  isFictional: true,
  message: 'Fictional local community activity',
}));

const clone = (value) => JSON.parse(JSON.stringify(value));

export const createInitialSocialState = () => ({
  mode: 'local-fictional-demo',
  isLocalOnly: true,
  isFictional: true,
  notice: FICTIONAL_COMMUNITY_NOTICE,
  currentUser: {
    id: 'local-demo-visitor',
    handle: '@mikapixel',
    displayName: 'Mika Pixel',
    accountType: 'local-demo-user',
    isFictional: false,
    isLocalOnly: true,
  },
  characters: clone(fictionalCharacters),
  posts: clone(fictionalPosts),
  comments: clone(fictionalComments),
  reactions: clone(fictionalReactions),
  shares: clone(fictionalShares),
  tokens: clone(fictionalTokens),
  sourcePosts: [],
  activity: clone(fictionalActivity),
  announcements: [],
  announcementHistory: [],
  nextIds: {
    post: fictionalPosts.length + 1,
    comment: fictionalComments.length + 1,
    reaction: fictionalReactions.length + 1,
    share: fictionalShares.length + 1,
    activity: fictionalActivity.length + 1,
    announcement: 1,
    sourcePost: 1,
  },
  localClock: 0,
});
