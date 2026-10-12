import {
  FICTIONAL_COMMUNITY_NOTICE,
  REACTION_TYPES,
  TRENDING_FILTERS,
  createEmptyReactionCounts,
  createInitialSocialState,
} from '../data/community.js';

export {
  FICTIONAL_COMMUNITY_NOTICE,
  REACTION_TYPES,
  TRENDING_FILTERS,
  createInitialSocialState,
};

const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 400;
const COIN_MILESTONES = new Set([10, 25, 50, 100]);
const ANNOUNCEMENT_PRIORITY = {
  'coin-launch': 100,
  'creator-claim': 90,
  'coin-milestone': 80,
  'popular-post': 70,
  'new-post': 40,
  'new-conversation': 20,
  'shared-post': 20,
};
const EVENT_NAMES = {
  'post-created': 'post:created',
  'comment-created': 'comment:created',
  'reaction-added': 'reaction:added',
  'reaction-removed': 'reaction:removed',
  'post-shared': 'post:shared',
  'token-launch-confirmed': 'token:launch-confirmed',
  'creator-claimed': 'creator:claimed',
};

const localTimestamp = (state) =>
  new Date(Date.now() + (state.localClock || 0) * 1000).toISOString();

const knownAuthor = (state, authorId) =>
  authorId === state.currentUser?.id || state.characters.some((character) => character.id === authorId);

const isFictionalAuthor = (state, authorId) =>
  state.characters.some((character) => character.id === authorId && character.isFictional);

const validText = (value, maximumLength) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximumLength;

const nextId = (state, kind, prefix) => `${prefix}-${String(state.nextIds?.[kind] || 1).padStart(3, '0')}`;

const nextIds = (state, kind) => ({
  ...state.nextIds,
  [kind]: (state.nextIds?.[kind] || 1) + 1,
});

const getActor = (state, actorId) =>
  [...(state.characters || []), state.currentUser].find((character) => character?.id === actorId);

export const getSourcePostRecord = (state, sourcePostId) =>
  (state.sourcePosts || []).find((record) => String(record.sourcePostId) === String(sourcePostId)) || null;

export const upsertSourcePostRecord = (state, record) => {
  const sourcePostId = String(record?.sourcePostId || '');
  if (!/^[A-Za-z0-9_-]+$/.test(sourcePostId)) return state;
  const current = getSourcePostRecord(state, sourcePostId);
  const nextRecord = { ...(current || {}), ...record, sourcePostId };
  return {
    ...state,
    sourcePosts: current
      ? state.sourcePosts.map((item) => (String(item.sourcePostId) === sourcePostId ? nextRecord : item))
      : [...(state.sourcePosts || []), nextRecord],
  };
};

const announcementFor = (state, activity) => {
  const actor = getActor(state, activity.actorId);
  const post = activity.postId ? getPostById(state, activity.postId) : null;
  if (activity.type === 'token-launch-confirmed' || activity.type === 'creator-claimed') {
    const token = (state.tokens || []).find((item) => item.id === activity.tokenId);
    if (token) {
      return {
        type: activity.type === 'creator-claimed' ? 'creator-claim' : 'coin-launch',
        key: activity.id,
        text: activity.type === 'creator-claimed'
          ? `Creator verified for $${token.ticker}!`
          : `NEW COIN LAUNCHED: $${token.ticker} is now live on ${token.launchPlatform || 'pump.fun'}`,
        tokenId: token.id,
        sourcePostId: token.sourcePostId,
        mintAddress: token.mintAddress,
        explorerUrl: token.mintAddress ? `https://explorer.solana.com/address/${encodeURIComponent(token.mintAddress)}` : null,
        screenshotAssetId: getSourcePostRecord(state, token.sourcePostId)?.screenshotAssetId || token.screenshotAssetId || null,
        screenshotThumbUrl: getSourcePostRecord(state, token.sourcePostId)?.screenshotThumbUrl || token.screenshotThumbUrl || null,
        launchPlatform: token.launchPlatform || 'pump.fun',
      };
    }
  }
  if (!actor) return null;
  if (activity.type === 'post-created' && post) {
    return { type: 'new-post', key: activity.id, text: `${actor.handle || `@${actor.username}`} just published a new post!`, postId: post.id };
  }
  if (activity.type === 'comment-created' && post) {
    const postAuthor = getActor(state, post.authorId);
    if (post.commentCount >= 5 && postAuthor) {
      return { type: 'new-conversation', key: `conversation-${post.id}`, text: `${postAuthor.handle || `@${postAuthor.username}`} received ${post.commentCount} new replies!`, postId: post.id };
    }
    return { type: 'new-conversation', key: activity.id, text: `${actor.handle || `@${actor.username}`} started a new conversation.`, postId: post.id };
  }
  if (activity.type === 'post-shared' && post) {
    const postAuthor = getActor(state, post.authorId);
    return { type: 'shared-post', key: activity.id, text: `${actor.handle || `@${actor.username}`} shared ${postAuthor?.handle || 'a post'}!`, postId: post.id };
  }
  if (activity.type === 'reaction-added' && post && reactionTotal(post) >= 25) {
    return { type: 'popular-post', key: `popular-${post.id}`, text: `This post just reached ${reactionTotal(post)} reactions!`, postId: post.id };
  }
  return null;
};

const addAnnouncement = (state, candidate) => {
  if (!candidate || state.announcementHistory?.some((item) => item.key === candidate.key)) return state;
  const announcement = {
    ...candidate,
    id: nextId(state, 'announcement', 'announcement'),
    event: 'announcement:created',
    priority: ANNOUNCEMENT_PRIORITY[candidate.type] || 0,
  };
  const sortAnnouncements = (left, right) =>
    (right.priority || 0) - (left.priority || 0) || String(right.createdAt).localeCompare(String(left.createdAt));
  return {
    ...state,
    announcements: [announcement, ...(state.announcements || [])].sort(sortAnnouncements).slice(0, 4),
    announcementHistory: [announcement, ...(state.announcementHistory || [])].slice(0, 100),
    nextIds: nextIds(state, 'announcement'),
  };
};

const appendActivity = (state, activity) => {
  const candidate = announcementFor(state, activity);
  const activityState = {
    ...state,
    activity: [activity, ...(state.activity || [])].slice(0, 200),
    nextIds: nextIds(state, 'activity'),
  };
  return addAnnouncement(activityState, candidate && { ...candidate, createdAt: activity.createdAt });
};

const makeActivity = (state, details) => ({
  id: nextId(state, 'activity', 'local-activity'),
  createdAt: localTimestamp(state),
  source: 'local-demo',
  event: details.event || EVENT_NAMES[details.type] || details.type,
  isFictional: Boolean(details.isFictional),
  message: details.isFictional ? 'Fictional local community activity' : 'Local demo activity',
  ...details,
});

const updateReactionCounts = (reactionCounts, type, amount) => ({
  ...createEmptyReactionCounts(),
  ...reactionCounts,
  [type]: Math.max(0, (reactionCounts?.[type] || 0) + amount),
});

const getTarget = (state, targetType, targetId) => {
  const collection = targetType === 'comment' ? state.comments : targetType === 'post' ? state.posts : null;
  if (!collection) return null;
  const target = collection.find((item) => item.id === targetId);
  return target ? { collection, target } : null;
};

const replaceTarget = (state, targetType, targetId, callback) => {
  const key = targetType === 'comment' ? 'comments' : 'posts';
  return {
    ...state,
    [key]: state[key].map((item) => (item.id === targetId ? callback(item) : item)),
  };
};

export const reactionTotal = (post) =>
  Object.values(post?.reactionCounts || {}).reduce((total, count) => total + count, 0);

export const engagementScore = (post) =>
  reactionTotal(post) + (post?.commentCount || 0) * 2 + (post?.shareCount || 0) * 3;

const isSameDay = (value, day) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === day;
};

const isConfirmedToken = (token) => Boolean(
  token?.verifiedOnChain || token?.deployment?.confirmed || token?.confirmedAt || token?.status === 'deployed',
);

export const getCommunityStats = (state, now = new Date()) => {
  const day = new Date(now).toISOString().slice(0, 10);
  const confirmedTokens = (state.tokens || []).filter(isConfirmedToken);
  return {
    totalPosts: state.posts?.length || 0,
    postsToday: (state.posts || []).filter((post) => isSameDay(post.createdAt, day)).length,
    totalComments: state.comments?.length || 0,
    totalReactions: state.reactions?.length || 0,
    totalShares: state.shares?.length || 0,
    totalCoinsMinted: confirmedTokens.length,
    coinsMintedToday: confirmedTokens.filter((token) => isSameDay(token.confirmedAt || token.deployedAt || token.createdAt, day)).length,
  };
};

export const getPostById = (state, postId) => state.posts.find((post) => post.id === postId) || null;

export const getCommentsForPost = (state, postId) =>
  state.comments
    .filter((comment) => comment.postId === postId)
    .slice()
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

export const createPost = (state, input = {}) => {
  const authorId = input.authorId || state.currentUser?.id;
  if (!knownAuthor(state, authorId) || !validText(input.content, MAX_POST_LENGTH)) return state;

  const id = input.id || nextId(state, 'post', 'local-post');
  if (state.posts.some((post) => post.id === id)) return state;

  const isFictional = isFictionalAuthor(state, authorId);
  const post = {
    id,
    authorId,
    content: input.content.trim(),
    topic: input.topic || 'local-community',
    subject: input.subject || 'a local post',
    createdAt: input.createdAt || localTimestamp(state),
    source: 'local-demo',
    isFictional,
    isLocalOnly: true,
    identityLabel: isFictional ? 'Fictional community post' : 'Local demo post',
    media: Array.isArray(input.media) ? input.media.slice() : [],
    relatedTokenId: null,
    reactionCounts: createEmptyReactionCounts(),
    commentCount: 0,
    shareCount: 0,
  };
  const withPost = {
    ...state,
    posts: [post, ...state.posts],
    nextIds: nextIds(state, 'post'),
    localClock: (state.localClock || 0) + 1,
  };

  return appendActivity(
    withPost,
    makeActivity(state, {
      type: 'post-created',
      actorId: authorId,
      postId: post.id,
      isFictional,
    }),
  );
};

export const recordProfileVisit = (state, characterId) => {
  if (!state.characters.some((character) => character.id === characterId)) return state;
  return appendActivity(
    state,
    makeActivity(state, {
      type: 'profile-visited',
      actorId: state.currentUser?.id,
      characterId,
      isFictional: false,
    }),
  );
};

const recordCharacterActivity = (state, details) => {
  if (!state.characters.some((character) => character.id === details.actorId)) return state;
  return appendActivity(state, makeActivity(state, { ...details, isFictional: true }));
};

const randomItem = (items, random) => items[Math.floor(random() * items.length)];

const chooseCharacter = (characters, random) => {
  const total = characters.reduce((sum, character) => sum + (character.activityFrequency || 1), 0);
  let cursor = random() * total;
  return characters.find((character) => {
    cursor -= character.activityFrequency || 1;
    return cursor <= 0;
  }) || characters[0];
};

const autonomousPost = (character) => {
  const topic = character.interests?.[0] || 'the plaza';
  const personality = character.personality || 'A thought crossed my mind';
  return `${personality} · ${topic} is worth another look today.`;
};

const autonomousComment = (character, post) => {
  const topic = post.topic || post.subject || 'this idea';
  return `${character.personality || 'I like this'} — the ${topic} detail is exactly what caught my eye.`;
};

export const runAutonomousActivity = (state, random = Math.random, requestedAction = null) => {
  const characters = state.characters || [];
  if (!characters.length) return state;
  const actor = chooseCharacter(characters, random);
  const action = requestedAction && requestedAction !== 'idle'
    ? requestedAction
    : randomItem(['react', 'react', 'comment', 'reply', 'share', 'post', 'read', 'browse-trending', 'browse-coins', 'talk', 'visit'], random);

  if (action === 'post') {
    return createPost(state, {
      authorId: actor.id,
      content: autonomousPost(actor),
      topic: actor.interests?.[0] || 'community',
      subject: actor.personality || 'a plaza thought',
    });
  }

  if (action === 'react') {
    const candidates = state.posts.filter((post) => !state.reactions.some((reaction) => reaction.targetType === 'post' && reaction.targetId === post.id && reaction.actorId === actor.id));
    const post = randomItem(candidates, random);
    if (!post) return state;
    return toggleReaction(state, {
      targetType: 'post',
      targetId: post.id,
      actorId: actor.id,
      reactionType: randomItem(actor.reactionPreferences || REACTION_TYPES, random),
    });
  }

  if (action === 'comment') {
    const post = randomItem(state.posts.filter((item) => item.authorId !== actor.id), random);
    return post ? addComment(state, { postId: post.id, actorId: actor.id, content: autonomousComment(actor, post) }) : state;
  }

  if (action === 'reply') {
    const comment = randomItem(state.comments, random);
    return comment ? addComment(state, { postId: comment.postId, parentCommentId: comment.id, actorId: actor.id, content: autonomousComment(actor, getPostById(state, comment.postId) || {}) }) : state;
  }

  if (action === 'share') {
    const candidates = state.posts.filter((post) => !state.shares.some((share) => share.postId === post.id && share.actorId === actor.id));
    const post = randomItem(candidates.length ? candidates : state.posts, random);
    return post ? sharePost(state, { postId: post.id, actorId: actor.id }) : state;
  }

  if (action === 'read') {
    const post = randomItem(state.posts, random);
    return post ? recordCharacterActivity(state, { type: 'post-read', actorId: actor.id, postId: post.id }) : state;
  }

  const target = randomItem(characters, random);
  return target ? recordCharacterActivity(state, {
    type: action === 'visit' ? 'profile-visited' : action === 'talk' ? 'conversation-started' : action,
    actorId: actor.id,
    characterId: target.id,
  }) : state;
};

export const confirmTokenLaunch = (state, input = {}) => {
  const token = input.token;
  const sourcePostId = token?.sourcePostId ? String(token.sourcePostId) : '';
  if (!token?.id || !token.ticker || !token.mintAddress || (sourcePostId && !/^[A-Za-z0-9_-]+$/.test(sourcePostId)) || state.tokens.some((item) => item.id === token.id || (sourcePostId && String(item.sourcePostId) === sourcePostId))) return state;
  const confirmedAt = input.confirmedAt || new Date().toISOString();
  const sourcePost = getSourcePostRecord(state, sourcePostId);
  const sourcePosts = sourcePost
    ? state.sourcePosts.map((record) => String(record.sourcePostId) === sourcePostId
      ? {
        ...record,
        launchTimestamp: confirmedAt,
        tokenTicker: token.ticker,
        tokenMintAddress: token.mintAddress,
        launchPlatform: token.launchPlatform || 'pump.fun',
        launchStatus: 'launched',
        network: token.network || 'mainnet-beta',
        creatorWallet: token.creatorWallet || null,
        pumpFunUrl: token.pumpFunUrl || null,
      }
      : record)
    : state.sourcePosts || [];
  const nextState = {
    ...state,
    sourcePosts,
    tokens: [...state.tokens, {
      ...token,
      sourcePostId,
      status: 'deployed',
      verifiedOnChain: true,
      confirmedAt,
      launchPlatform: token.launchPlatform || 'pump.fun',
      launchStatus: 'launched',
      screenshotAssetId: token.screenshotAssetId || sourcePost?.screenshotAssetId || null,
    }],
  };
  const withLaunch = appendActivity(nextState, {
    id: nextId(state, 'activity', 'local-activity'),
    createdAt: confirmedAt,
    source: 'solana-confirmed',
    event: 'token:launch-confirmed',
    type: 'token-launch-confirmed',
    actorId: state.currentUser?.id,
    tokenId: token.id,
    isFictional: false,
  });
  const confirmedCount = withLaunch.tokens.filter(isConfirmedToken).length;
  return COIN_MILESTONES.has(confirmedCount)
    ? addAnnouncement(withLaunch, {
      type: 'coin-milestone',
      key: `coin-milestone-${confirmedCount}`,
      text: `${confirmedCount} TweetMint coins successfully launched!`,
      createdAt: confirmedAt,
    })
    : withLaunch;
};

export const editPost = (state, input = {}) => {
  const { postId, actorId = state.currentUser?.id } = input;
  const post = getPostById(state, postId);
  if (!post || post.authorId !== actorId || !validText(input.content, MAX_POST_LENGTH)) return state;

  const isFictional = isFictionalAuthor(state, actorId);
  const withPost = {
    ...state,
    posts: state.posts.map((item) =>
      item.id === postId
        ? { ...item, content: input.content.trim(), editedAt: input.editedAt || localTimestamp(state) }
        : item,
    ),
    localClock: (state.localClock || 0) + 1,
  };
  return appendActivity(
    withPost,
    makeActivity(state, {
      type: 'post-edited',
      actorId,
      postId,
      isFictional,
    }),
  );
};

export const deletePost = (state, input = {}) => {
  const { postId, actorId = state.currentUser?.id } = input;
  const post = getPostById(state, postId);
  if (!post || post.authorId !== actorId) return state;

  const removedCommentIds = new Set(
    state.comments.filter((comment) => comment.postId === postId).map((comment) => comment.id),
  );
  const removedShareIds = new Set(
    state.shares.filter((share) => share.postId === postId).map((share) => share.id),
  );
  const isFictional = isFictionalAuthor(state, actorId);
  const withDeletedPost = {
    ...state,
    posts: state.posts.filter((item) => item.id !== postId),
    comments: state.comments.filter((comment) => comment.postId !== postId),
    reactions: state.reactions.filter(
      (reaction) =>
        !(
          (reaction.targetType === 'post' && reaction.targetId === postId) ||
          (reaction.targetType === 'comment' && removedCommentIds.has(reaction.targetId))
        ),
    ),
    shares: state.shares.filter((share) => share.postId !== postId),
    activity: state.activity.filter(
      (event) =>
        event.postId !== postId &&
        !removedCommentIds.has(event.commentId) &&
        !removedShareIds.has(event.shareId) &&
        !(event.targetType === 'comment' && removedCommentIds.has(event.targetId)),
    ),
    localClock: (state.localClock || 0) + 1,
  };
  return appendActivity(
    withDeletedPost,
    makeActivity(state, {
      type: 'post-deleted',
      actorId,
      postId,
      isFictional,
    }),
  );
};

export const toggleReaction = (state, input = {}) => {
  const { targetType = 'post', targetId, actorId = state.currentUser?.id, reactionType } = input;
  if (!REACTION_TYPES.includes(reactionType) || !knownAuthor(state, actorId)) return state;

  const targetResult = getTarget(state, targetType, targetId);
  if (!targetResult) return state;

  const existing = state.reactions.find(
    (reaction) =>
      reaction.targetType === targetType && reaction.targetId === targetId && reaction.actorId === actorId,
  );
  const isFictional = isFictionalAuthor(state, actorId);

  if (existing?.reactionType === reactionType) {
    const withTarget = replaceTarget(state, targetType, targetId, (target) => ({
      ...target,
      reactionCounts: updateReactionCounts(target.reactionCounts, reactionType, -1),
    }));
    const withReactionRemoved = {
      ...withTarget,
      reactions: state.reactions.filter((reaction) => reaction.id !== existing.id),
      localClock: (state.localClock || 0) + 1,
    };
    return appendActivity(
      withReactionRemoved,
      makeActivity(state, {
        type: 'reaction-removed',
        actorId,
        targetType,
        targetId,
        reactionType,
        isFictional,
      }),
    );
  }

  const withTarget = replaceTarget(state, targetType, targetId, (target) => {
    const withoutPrevious = existing
      ? updateReactionCounts(target.reactionCounts, existing.reactionType, -1)
      : target.reactionCounts;
    return {
      ...target,
      reactionCounts: updateReactionCounts(withoutPrevious, reactionType, 1),
    };
  });
  const reaction = {
    id: existing?.id || nextId(state, 'reaction', 'local-reaction'),
    targetType,
    targetId,
    actorId,
    reactionType,
    createdAt: localTimestamp(state),
    source: 'local-demo',
    isFictional,
    isLocalOnly: true,
  };
  const withReaction = {
    ...withTarget,
    reactions: existing
      ? state.reactions.map((item) => (item.id === existing.id ? reaction : item))
      : [...state.reactions, reaction],
    nextIds: existing ? state.nextIds : nextIds(state, 'reaction'),
    localClock: (state.localClock || 0) + 1,
  };
  return appendActivity(
    withReaction,
    makeActivity(state, {
      type: existing ? 'reaction-changed' : 'reaction-added',
      actorId,
      targetType,
      targetId,
      reactionType,
      isFictional,
    }),
  );
};

export const addComment = (state, input = {}) => {
  const { postId, parentCommentId = null, actorId = input.authorId || state.currentUser?.id } = input;
  if (!knownAuthor(state, actorId) || !validText(input.content, MAX_COMMENT_LENGTH)) return state;

  const post = getPostById(state, postId);
  const parent = parentCommentId
    ? state.comments.find((comment) => comment.id === parentCommentId)
    : null;
  if (!post || (parentCommentId && (!parent || parent.postId !== postId))) return state;

  const id = input.id || nextId(state, 'comment', 'local-comment');
  if (state.comments.some((comment) => comment.id === id)) return state;

  const isFictional = isFictionalAuthor(state, actorId);
  const comment = {
    id,
    postId,
    authorId: actorId,
    parentCommentId,
    content: input.content.trim(),
    createdAt: input.createdAt || localTimestamp(state),
    source: 'local-demo',
    isFictional,
    isLocalOnly: true,
    identityLabel: isFictional ? 'Fictional community comment' : 'Local demo comment',
    reactionCounts: createEmptyReactionCounts(),
  };
  const withComment = {
    ...state,
    comments: [...state.comments, comment],
    posts: state.posts.map((item) =>
      item.id === postId ? { ...item, commentCount: item.commentCount + 1 } : item,
    ),
    nextIds: nextIds(state, 'comment'),
    localClock: (state.localClock || 0) + 1,
  };
  return appendActivity(
    withComment,
    makeActivity(state, {
      type: 'comment-created',
      actorId,
      postId,
      commentId: comment.id,
      parentCommentId,
      isFictional,
    }),
  );
};

export const editComment = (state, input = {}) => {
  const { commentId, actorId = state.currentUser?.id } = input;
  const comment = state.comments.find((item) => item.id === commentId);
  if (!comment || comment.authorId !== actorId || !validText(input.content, MAX_COMMENT_LENGTH)) {
    return state;
  }

  const isFictional = isFictionalAuthor(state, actorId);
  const withComment = {
    ...state,
    comments: state.comments.map((item) =>
      item.id === commentId
        ? { ...item, content: input.content.trim(), editedAt: input.editedAt || localTimestamp(state) }
        : item,
    ),
    localClock: (state.localClock || 0) + 1,
  };
  return appendActivity(
    withComment,
    makeActivity(state, {
      type: 'comment-edited',
      actorId,
      postId: comment.postId,
      commentId,
      isFictional,
    }),
  );
};

export const deleteComment = (state, input = {}) => {
  const { commentId, actorId = state.currentUser?.id } = input;
  const comment = state.comments.find((item) => item.id === commentId);
  if (!comment || comment.authorId !== actorId) return state;

  const post = getPostById(state, comment.postId);
  if (!post) return state;

  const isFictional = isFictionalAuthor(state, actorId);
  const withDeletedComment = {
    ...state,
    comments: state.comments
      .filter((item) => item.id !== commentId)
      .map((item) =>
        item.parentCommentId === commentId
          ? { ...item, parentCommentId: comment.parentCommentId }
          : item,
      ),
    reactions: state.reactions.filter(
      (reaction) => !(reaction.targetType === 'comment' && reaction.targetId === commentId),
    ),
    posts: state.posts.map((item) =>
      item.id === comment.postId ? { ...item, commentCount: Math.max(0, item.commentCount - 1) } : item,
    ),
    activity: state.activity.filter(
      (event) => event.commentId !== commentId && !(event.targetType === 'comment' && event.targetId === commentId),
    ),
    localClock: (state.localClock || 0) + 1,
  };
  return appendActivity(
    withDeletedComment,
    makeActivity(state, {
      type: 'comment-deleted',
      actorId,
      postId: comment.postId,
      commentId,
      isFictional,
    }),
  );
};

export const sharePost = (state, input = {}) => {
  const { postId, actorId = state.currentUser?.id, type = 'repost' } = input;
  if (!knownAuthor(state, actorId) || !['repost', 'quote'].includes(type)) return state;
  if (!getPostById(state, postId)) return state;
  if (state.shares.some((share) => share.postId === postId && share.actorId === actorId && share.type === type)) {
    return state;
  }

  const isFictional = isFictionalAuthor(state, actorId);
  const share = {
    id: input.id || nextId(state, 'share', 'local-share'),
    postId,
    actorId,
    type,
    commentary: typeof input.commentary === 'string' ? input.commentary.trim().slice(0, MAX_POST_LENGTH) : '',
    createdAt: input.createdAt || localTimestamp(state),
    source: 'local-demo',
    isFictional,
    isLocalOnly: true,
  };
  if (state.shares.some((item) => item.id === share.id)) return state;

  const withShare = {
    ...state,
    shares: [...state.shares, share],
    posts: state.posts.map((post) =>
      post.id === postId ? { ...post, shareCount: post.shareCount + 1 } : post,
    ),
    nextIds: nextIds(state, 'share'),
    localClock: (state.localClock || 0) + 1,
  };
  return appendActivity(
    withShare,
    makeActivity(state, {
      type: 'post-shared',
      actorId,
      postId,
      shareId: share.id,
      isFictional,
    }),
  );
};

const filterAliases = {
  mostReacted: 'most-reacted',
  mostShared: 'most-shared',
  justMinted: 'just-minted',
  viralCoins: 'viral-coins',
};

export const getTrendingPosts = (state, requestedFilter = 'trending') => {
  const filter = filterAliases[requestedFilter] || requestedFilter;
  const posts = state.posts.slice();
  const hasToken = (post) => Boolean(post.relatedTokenId);
  const newestFirst = (left, right) => right.createdAt.localeCompare(left.createdAt);
  const mostReacted = (left, right) => reactionTotal(right) - reactionTotal(left) || newestFirst(left, right);
  const mostShared = (left, right) => right.shareCount - left.shareCount || newestFirst(left, right);
  const trending = (left, right) => engagementScore(right) - engagementScore(left) || newestFirst(left, right);

  if (filter === 'newest') return posts.sort(newestFirst);
  if (filter === 'most-reacted') return posts.sort(mostReacted);
  if (filter === 'most-shared') return posts.sort(mostShared);
  if (filter === 'just-minted') return posts.filter(hasToken).sort(newestFirst);
  if (filter === 'viral-coins') return posts.filter(hasToken).sort(trending);
  return posts.sort(trending);
};

export const filterTrendingPosts = getTrendingPosts;
