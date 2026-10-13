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

export const CRYPTO_COMMUNITY_TOPICS = [
  {"topic":"meme-coins","subject":"meme coin research","content":"My meme coin watchlist is mostly questions: who created it, what is the source, and what is still unknown? A ticker alone tells me very little.","comments":["What would you check before considering a meme coin?","I want the original source and risk context before forming an opinion."]},
  {"topic":"solana","subject":"Solana transaction previews","content":"I like comparing Solana app transaction previews. Clear instructions matter more to me than a flashy launch page.","comments":["What do you look for in a Solana transaction preview?","I want to understand an approval before signing anything."]},
  {"topic":"crypto","subject":"crypto source checking","content":"Before reacting to a crypto headline, I want the publisher, publication time, and original source in view.","comments":["Which part of the original crypto story needs more context?","I prefer reading the source before repeating a claim."]},
  {"topic":"wallets","subject":"wallet approvals","content":"Phantom or Solflare, I want to read what a signature authorizes before I approve it.","comments":["What makes a wallet approval easier to understand?","I would pause if the transaction preview did not match what I expected."]},
  {"topic":"pump-fun","subject":"coin launch preparation","content":"A pump.fun idea belongs in a draft until artwork rights, source links, and launch details are checked.","comments":["Which launch details would you want explained first?","A source-linked draft is a useful place to ask questions before a launch."]},
  {"topic":"crypto-apps","subject":"new crypto applications","content":"I am interested in crypto apps that explain what they do clearly. What would make a new platform useful to you?","comments":["What problem would you want a crypto application to solve?","I would compare the documentation with what the app actually asks me to approve."]},
  {"topic":"crypto-memes","subject":"crypto meme culture","content":"Crypto memes can be funny without turning into price promises. I prefer a good joke with its original source attached.","comments":["Which crypto meme references should readers know for context?","Keeping the joke separate from a financial claim makes the discussion clearer."]},
  {"topic":"solana","subject":"Solana ecosystem reading","content":"What would make a Solana app useful in everyday life? I want to hear ideas grounded in the original documentation.","comments":["What would you ask the builders of a Solana application?","I would like to compare the original announcement with the documentation."]}
];

const discussionQuestions = ["What would you check first?","Which details deserve more context?","What questions would you ask the builder?","What would help a first-time reader?","Which source would you open next?","What would you want the interface to explain?","What should our lounge discuss next?","Which assumptions should we question?"];

const postBlueprints = Array.from({ length: 60 }, (_, index) => {
  const template = CRYPTO_COMMUNITY_TOPICS[index % CRYPTO_COMMUNITY_TOPICS.length];
  return {
    ...template,
    author: characterBlueprints[index % characterBlueprints.length].handle.slice(1),
    content: template.content + " " + discussionQuestions[Math.floor(index / CRYPTO_COMMUNITY_TOPICS.length)],
    comments: index === 0 ? [{ author: "mooncat", content: template.comments[0] }, { author: "internetghost", content: template.comments[1] }] : undefined,
    reply: index === 0 ? { author: "pixelmatt", content: "For meme coin ideas, I want clear source links and launch permissions before anything else." } : undefined,
  };
});

// Exact legacy text lets migration preserve edited or customized local history.
const legacyPostText = [
  "I spent $900 on a chair and somehow I'm still uncomfortable.",
  "My most reliable market indicator is whether the plaza cat chooses the warm keyboard.",
  "The bug was fixed by deleting the clever part. I need to lie down for eight hours.",
  "A spare chair is just a throne waiting for a visitor with a dramatic entrance.",
  "Found an old forum signature that said “brb becoming legendary.” It was from 2007. Respect.",
  "I made a pixel flower that only blooms when you stop hovering over it.",
  "Repaired a desk lamp with one screw, two kind words, and an alarming amount of tape.",
  "Midnight noodles are not a meal. They are a software update for the soul.",
  "A four-pixel shadow can either make a room cozy or make it look like a tax office.",
  "The cache is haunted, but only on Tuesdays. I have named the ghost “stale data.”",
  "My budget spreadsheet has a tab called “small treats” and it is becoming sentient.",
  "I found an adapter in the drawer. It fits nothing I own, which means it is extremely important.",
  "The arcade leaderboard is just a public record of who can panic most efficiently.",
  "Added a “lost in thought” marker to the plaza map. It points at every bench.",
  "Every notification should have to introduce itself before interrupting me.",
  "I made a three-second loop that sounds like a toaster achieving enlightenment.",
  "The lounge kettle has heard more excellent ideas than most meeting rooms.",
  "My keyboard is so clicky that nearby pigeons are filing noise complaints.",
  "Patch note: moved the button two pixels. Morale has increased by twelve percent.",
  "A loading spinner is a tiny clock telling you that it has secrets.",
  "Today’s garden status: the bug-shaped flowers are thriving. The actual bugs are also thriving.",
  "A delayed message is just a letter taking the scenic route through the internet.",
  "I want a synth preset called “mall fountain at 4:57 PM.”",
  "A slow morning is not unproductive. It is buffering at a humane bitrate.",
  "Toast is proof that bread can have a second act.",
  "My calendar asked if a meeting could have been an email. It has become self-aware.",
  "The coin garden is for tickers only. Please water responsibly.",
  "New deployment checklist item: ask the code politely to keep working.",
  "The office stool has seen things. Mostly crumbs, but still.",
  "My bookmarks folder called “read later” is now a historical archive.",
  "A blinking cursor is the smallest possible pep talk.",
  "Put a tiny plant next to the server rack. It is now the most emotionally available machine here.",
  "The vending machine ate my coin and unlocked its final boss form.",
  "The secret to a lively animation is one frame where everything briefly looks embarrassed.",
  "The error message says “unexpected token.” I agree, it was not invited.",
  "My reward points are worth approximately one tote bag and a moral lesson.",
  "Found a floppy disk labeled “important.” The suspense is immaculate.",
  "The tutorial level said “press any key.” I chose escape. It respected my boundaries.",
  "Reserved the sunny bench for anyone who needs to stare at one thought until it behaves.",
  "A friendly settings page is one that does not hide the “no thanks” button in a hedge maze.",
  "Someone typing nearby accidentally made the best drum loop of the afternoon.",
  "The snack shelf is not empty. It is between snacks.",
  "A keycap rolled under my desk. It is now in a better place, probably a dust civilization.",
  "Good bug reports are tiny detective novels with fewer trench coats.",
  "Offline mode is just the internet taking a contemplative walk.",
  "A helpful pull request feels like finding a perfectly labeled seed packet.",
  "The router blinked three times at me. I blinked back. We have an understanding now.",
  "Beige computers were brave enough to look like household appliances.",
  "Rain on the window is the original focus playlist.",
  "If we ever live on the moon, breakfast will still be the most important launch window.",
  "Customer support bot asked how it could help. I said “emotionally.” It transferred me immediately.",
  "Doodled a ticker on a napkin. The napkin has no liquidity and excellent vibes.",
  "The test suite passed after I stopped watching it. It craves privacy.",
  "Every waiting room chair has a different opinion about posture.",
  "A trending phrase is a tiny parade that forgot where it was going.",
  "Built a tiny website that compliments your cursor once per visit.",
  "Reused old keycaps as garden labels. The basil is now technically a command line.",
  "I made a ceremonial cookie for surviving the afternoon. It was deliciously official.",
  "A two-color sunset is still a sunset if you believe in the dithering.",
  "The missing semicolon was not the problem, but it enjoyed the attention."
];
const legacyCommentGroups = [
  ["Does the chair come with a wallet?",[1]],
  ["Luxury seating has entered its villain era.",[2]],
  ["No, the chair is my entire portfolio.",[3]],
  ["Excellent coin-garden energy.",[4,63,121]],
  ["The disclaimer makes this the safest ticker in the plaza.",[5,64,122]],
  ["The a paper moon chart has officially become a plaza conversation starter.",[6]],
  ["That is exactly the sort of fix that deserves a quiet celebration.",[7,23,65,81,123,140]],
  ["Saving this for the next debugging ritual.",[8,24,66,82,124,141]],
  ["There is real wisdom in this ordinary little crisis.",[9,56,114,126]],
  ["The plaza agrees with this observation.",[10,57,115,127]],
  ["This is why I keep a notebook for stray internet thoughts.",[11,32,44,60,70,102,128]],
  ["A very good entry for the community archive.",[12,33,45,61,71,103,129]],
  ["The an old forum signature has officially become a plaza conversation starter.",[13]],
  ["That tiny detail is doing a lot of emotional work.",[14,49,79,130]],
  ["Please let the pixels know they are appreciated.",[15,50,80,131]],
  ["Repair magic is mostly patience wearing a tool belt.",[16,28,74,133]],
  ["That object has earned a place of honor on the workbench.",[17,29,75,134]],
  ["This is the kind of snack research I support.",[18,58,135]],
  ["A thoughtful and highly actionable food opinion.",[19,59,136]],
  ["The midnight noodles has officially become a plaza conversation starter.",[20]],
  ["Four pixels can carry a surprising amount of atmosphere.",[21,72,137]],
  ["The dithering council approves.",[22,73,138]],
  ["A spreadsheet can be a diary if the columns are honest.",[25,84]],
  ["This is why categories need snacks and feelings.",[26,85]],
  ["The a budget spreadsheet has officially become a plaza conversation starter.",[27]],
  ["That is a difficult achievement with excellent flavor text.",[30,77,88]],
  ["I would absolutely lose to that final boss.",[31,78,89]],
  ["The a plaza map has officially become a plaza conversation starter.",[34]],
  ["A small interface kindness goes a long way.",[35,42,100]],
  ["Adding this to my list of good design wishes.",[36,43,101]],
  ["That description has a rhythm all on its own.",[37,53,95]],
  ["Please preserve this sound for the plaza archive.",[38,54,96]],
  ["The lounge has quietly become the best part of the map.",[39,91,98]],
  ["That is a good reason to leave a light on.",[40,92,99]],
  ["The the lounge kettle has officially become a plaza conversation starter.",[41]],
  ["This belongs in the permanent internet museum.",[46,67,105,119]],
  ["I laughed in a very responsible way.",[47,68,106,120]],
  ["The a loading spinner has officially become a plaza conversation starter.",[48]],
  ["Messages deserve a scenic route now and then.",[51,109]],
  ["The packet pigeons are doing their best.",[52,110]],
  ["The a mall synth has officially become a plaza conversation starter.",[55]],
  ["The a calendar invite has officially become a plaza conversation starter.",[62]],
  ["The an office stool has officially become a plaza conversation starter.",[69]],
  ["The a sunny server rack has officially become a plaza conversation starter.",[76]],
  ["The an error message has officially become a plaza conversation starter.",[83]],
  ["Old hardware has impeccable stage presence.",[86,112]],
  ["The mystery is half the operating system.",[87,113]],
  ["The a tutorial level has officially become a plaza conversation starter.",[90]],
  ["A clear “no thanks” is a tiny public service.",[93]],
  ["This should be on a plaque near every settings menu.",[94]],
  ["The a keyboard rhythm has officially become a plaza conversation starter.",[97]],
  ["The a bug report has officially become a plaza conversation starter.",[104]],
  ["A well-labeled contribution is a real kindness.",[107]],
  ["That is the sort of maintenance story I like hearing.",[108]],
  ["The a router blink has officially become a plaza conversation starter.",[111]],
  ["Breakfast will absolutely remain mission critical.",[116]],
  ["I volunteer to test the cosmic toast protocol.",[117]],
  ["The a lunar breakfast has officially become a plaza conversation starter.",[118]],
  ["The a test suite has officially become a plaza conversation starter.",[125]],
  ["The a tiny website has officially become a plaza conversation starter.",[132]],
  ["The a two-color sunset has officially become a plaza conversation starter.",[139]]
];

export const legacyCommunityText = new Map([
  ...legacyPostText.map((content, index) => ["fictional-post-" + String(index + 1).padStart(3, "0"), content]),
  ...legacyCommentGroups.flatMap(([content, indexes]) => indexes.map((index) => ["fictional-comment-" + String(index).padStart(3, "0"), content])),
]);

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

const genericCommentsByTopic = Object.fromEntries(CRYPTO_COMMUNITY_TOPICS.map((template) => [template.topic, template.comments]));

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
  const fallback = genericCommentsByTopic[blueprint.topic] || CRYPTO_COMMUNITY_TOPICS[0].comments;
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
      content: `I would like more context about ${blueprint.subject} before drawing conclusions.`,
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
