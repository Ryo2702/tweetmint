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

const LOCAL_DEMO_EPOCH = Date.UTC(2026, 9, 11, 0, 0, 0);
const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 400;

const localTimestamp = (state) =>
  new Date(LOCAL_DEMO_EPOCH + (state.localClock || 0) * 1000).toISOString();

const knownAuthor = (state, authorId) =>
  authorId === state.currentUser?.id || state.characters.some((character) => character.id === authorId);

const isFictionalAuthor = (state, authorId) =>
  state.characters.some((character) => character.id === authorId && character.isFictional);

const validText = (value, maximumLength) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximumLength;

const nextId = (state, kind, prefix) => `${prefix}-${String(state.nextIds[kind]).padStart(3, '0')}`;

const nextIds = (state, kind) => ({
  ...state.nextIds,
  [kind]: state.nextIds[kind] + 1,
});

const appendActivity = (state, activity) => ({
  ...state,
  activity: [activity, ...state.activity],
  nextIds: nextIds(state, 'activity'),
});

const makeActivity = (state, details) => ({
  id: nextId(state, 'activity', 'local-activity'),
  createdAt: localTimestamp(state),
  source: 'local-demo',
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
