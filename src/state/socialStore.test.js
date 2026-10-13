import { describe, expect, it } from 'vitest';
import {
  addComment,
  addNewsDiscussion,
  createInitialSocialState,
  createPost,
  confirmTokenLaunch,
  deleteComment,
  deletePost,
  editComment,
  editPost,
  getCommunityStats,
  getPostById,
  getSourcePostRecord,
  getTrendingPosts,
  reactionTotal,
  recordProfileVisit,
  refreshCommunityTopics,
  runAutonomousActivity,
  sharePost,
  toggleReaction,
  upsertSourcePostRecord,
} from './socialStore.js';

describe('fictional community seed', () => {
  it('has a clearly marked local population and enough social history', () => {
    const state = createInitialSocialState();

    expect(state.mode).toBe('local-fictional-demo');
    expect(state.isLocalOnly).toBe(true);
    expect(state.characters).toHaveLength(25);
    expect(state.characters.every((character) => character.isFictional)).toBe(true);
    expect(state.characters.every((character) => Array.isArray(character.conversationHistory))).toBe(true);
    expect(new Set(state.characters.map((character) => character.movementPattern)).size).toBeGreaterThan(1);
    expect(state.posts).toHaveLength(60);
    expect(state.comments.length).toBeGreaterThanOrEqual(100);
    expect(state.posts.every((post) => post.isFictional)).toBe(true);
    expect(state.tokens).toHaveLength(8);
    expect(state.tokens.filter((token) => token.freeDemo)).toHaveLength(3);
    expect(['fictional-post-009', 'fictional-post-033', 'fictional-post-057'].map((id) => state.posts.find((post) => post.id === id)).every((post) => post.relatedTokenId && post.commentCount > 0 && reactionTotal(post) > 0 && post.shareCount > 0)).toBe(true);
  });
});

describe('local social state helpers', () => {
  it('refreshes unchanged old fictional topics while preserving visitor and edited history', () => {
    const initial = createInitialSocialState();
    const visitorState = createPost(initial, { content: 'Keep my visitor post.' });
    const state = {
      ...visitorState,
      posts: visitorState.posts.map((post) => post.id === 'fictional-post-001' ? { ...post, content: "I spent $900 on a chair and somehow I'm still uncomfortable." } : post.id === 'fictional-post-002' ? { ...post, content: 'My edited discussion.', editedAt: '2026-10-13T00:00:00Z' } : post),
      comments: visitorState.comments.map((comment) => comment.id === 'fictional-comment-001' ? { ...comment, content: 'Does the chair come with a wallet?' } : comment),
    };
    const next = refreshCommunityTopics(state);
    expect(next.posts.find((post) => post.id === 'fictional-post-001').content).toContain('meme coin');
    expect(next.comments.find((comment) => comment.id === 'fictional-comment-001').content).toContain('meme coin');
    expect(next.posts.find((post) => post.id === 'fictional-post-002').content).toBe('My edited discussion.');
    expect(next.posts[0].content).toBe('Keep my visitor post.');
    expect(next.reactions).toBe(state.reactions);
    expect(next.shares).toBe(state.shares);
    expect(next.tokens).toBe(state.tokens);
  });

  it('links fictional discussion to actual source identity once and comments without new claims', () => {
    const initial = createInitialSocialState();
    const item = { id: 'real-source-1', headline: 'The publisher-supplied headline', sourceName: 'Example publisher', originalUrl: 'https://example.com/story', category: 'solana', categories: ['crypto', 'solana'] };
    const discussed = addNewsDiscussion(initial, item);
    expect(discussed.posts[0]).toMatchObject({ sourceFeedItemId: item.id, sourceUrl: item.originalUrl, sourcePublisher: item.sourceName, isFictional: true, topic: 'solana' });
    expect(discussed.posts[0].content).toContain(item.headline);
    expect(addNewsDiscussion(discussed, item)).toBe(discussed);
    expect(addNewsDiscussion(initial, { ...item, originalUrl: 'javascript:alert(1)' })).toBe(initial);
    let calls = 0;
    const commented = runAutonomousActivity(discussed, () => calls++ === 0 ? 0.05 : 0, 'comment');
    expect(commented.comments.at(-1).postId).toBe(discussed.posts[0].id);
    expect(commented.comments.at(-1).content).toContain(item.sourceName);
    expect(commented.comments.at(-1).content).toContain('original solana coverage');
  });

  it('uses real crypto discoveries for autonomous posts and crypto topics while sources are empty', () => {
    const initial = createInitialSocialState();
    const crypto = { id: 'crypto-story', headline: 'An actual supplied story', sourceName: 'Publisher', originalUrl: 'https://example.com/crypto', category: 'crypto', categories: ['crypto'] };
    const general = { ...crypto, id: 'general-story', category: 'technology', categories: ['technology'] };
    expect(runAutonomousActivity(initial, () => 0, 'post', [general, crypto]).posts[0].sourceFeedItemId).toBe(crypto.id);
    const fallback = runAutonomousActivity(initial, () => 0, 'post', []);
    expect(fallback.posts[0].topic).toBe('meme-coins');
    expect(fallback.posts[0].sourceUrl).toBeUndefined();
  });

  it('derives persisted community statistics without counting unconfirmed coins', () => {
    const state = createInitialSocialState();
    const stats = getCommunityStats({
      ...state,
      tokens: [...state.tokens, { id: 'confirmed', verifiedOnChain: true, confirmedAt: '2026-10-12T04:00:00.000Z' }],
      posts: [...state.posts, { id: 'today', createdAt: '2026-10-12T05:00:00.000Z' }],
    }, new Date('2026-10-12T12:00:00.000Z'));

    expect(stats.postsToday).toBe(1);
    expect(stats.totalCoinsMinted).toBe(1);
    expect(stats.coinsMintedToday).toBe(1);
  });

  it('only records a coin announcement for a confirmed Solana launch', () => {
    const state = createInitialSocialState();
    const next = confirmTokenLaunch(state, {
      token: { id: 'solana-chair', ticker: 'CHAIR', mintAddress: 'MintAddress123' },
      confirmedAt: '2026-10-12T04:00:00.000Z',
    });

    expect(next.tokens.at(-1)).toMatchObject({ verifiedOnChain: true, status: 'deployed' });
    expect(next.announcements[0]).toMatchObject({ type: 'coin-launch', tokenId: 'solana-chair' });
  });

  it('keeps one canonical coin for a source post and retains its screenshot record', () => {
    const sourcePostId = '123456789';
    const source = {
      sourcePostId,
      sourcePostUrl: `https://x.com/mika/status/${sourcePostId}`,
      screenshotAssetId: `x-post-${sourcePostId}-screenshot`,
      screenshotStatus: 'ready',
      screenshotThumbUrl: 'data:image/svg+xml,thumb'
    };
    const withSource = upsertSourcePostRecord(createInitialSocialState(), source);
    const launched = confirmTokenLaunch(withSource, {
      token: { id: 'coin-one', ticker: 'ONE', mintAddress: 'MintOne', sourcePostId, launchPlatform: 'pump.fun' },
      confirmedAt: '2026-10-12T04:00:00.000Z'
    });
    const repeated = confirmTokenLaunch(launched, {
      token: { id: 'coin-two', ticker: 'TWO', mintAddress: 'MintTwo', sourcePostId, launchPlatform: 'pump.fun' },
      confirmedAt: '2026-10-12T04:00:00.000Z'
    });

    expect(launched.tokens.filter((token) => token.sourcePostId === sourcePostId)).toHaveLength(1);
    expect(getSourcePostRecord(launched, sourcePostId)).toMatchObject({ tokenTicker: 'ONE', tokenMintAddress: 'MintOne', launchStatus: 'launched', screenshotAssetId: source.screenshotAssetId });
    expect(repeated).toBe(launched);
  });

  it('accepts a local image upload as one canonical source', () => {
    const sourcePostId = 'upload-1';
    const withSource = upsertSourcePostRecord(createInitialSocialState(), {
      sourcePostId,
      sourceType: 'local-upload',
      screenshotStatus: 'ready',
      sourcePostText: 'Uploaded caption'
    });
    const launched = confirmTokenLaunch(withSource, {
      token: { id: 'uploaded-coin', ticker: 'UPLD', mintAddress: 'MintUploaded', sourcePostId },
      confirmedAt: '2026-10-12T04:00:00.000Z'
    });

    expect(launched.tokens.filter((token) => token.sourcePostId === sourcePostId)).toHaveLength(1);
    expect(getSourcePostRecord(launched, sourcePostId)).toMatchObject({ sourceType: 'local-upload', launchStatus: 'launched' });
  });

  it('queues a milestone only when the verified coin total reaches it', () => {
    let state = createInitialSocialState();
    for (let index = 0; index < 10; index += 1) {
      state = confirmTokenLaunch(state, {
        token: { id: `solana-${index}`, ticker: `C${index}`, mintAddress: `Mint${index}` },
        confirmedAt: '2026-10-12T04:00:00.000Z',
      });
    }

    expect(getCommunityStats(state, new Date('2026-10-12T12:00:00.000Z')).totalCoinsMinted).toBe(10);
    expect(state.announcementHistory.some((item) => item.type === 'coin-milestone' && item.key === 'coin-milestone-10')).toBe(true);
  });

  it('persists autonomous character posts and announces them', () => {
    const state = createInitialSocialState();
    const next = runAutonomousActivity(state, () => 0, 'post');

    expect(next.posts).toHaveLength(state.posts.length + 1);
    expect(next.posts[0].isFictional).toBe(true);
    expect(next.announcements[0]).toMatchObject({ type: 'new-post', postId: next.posts[0].id });
  });

  it('keeps reactions, comments, and shares moving for autonomous characters', () => {
    const state = createInitialSocialState();
    const reacted = runAutonomousActivity(state, () => 0, 'react');
    const commented = runAutonomousActivity(reacted, () => 0, 'comment');
    const shared = runAutonomousActivity(commented, () => 0, 'share');

    expect(reacted.reactions.length).toBeGreaterThan(state.reactions.length);
    expect(commented.comments.length).toBeGreaterThan(reacted.comments.length);
    expect(shared.shares.length).toBeGreaterThan(commented.shares.length);
  });

  it('announces a conversation milestone from the post owner', () => {
    const state = createInitialSocialState();
    const post = state.posts[0];
    const first = addComment(state, { postId: post.id, content: 'A fifth reply.' });
    const next = addComment(first, { postId: post.id, content: 'One more thought.' });

    expect(next.announcements.some((item) => item.key === `conversation-${post.id}`)).toBe(true);
    expect(next.announcements.find((item) => item.key === `conversation-${post.id}`).text).toContain('received');
  });

  it('records profile visits for plaza members', () => {
    const state = createInitialSocialState();
    const characterId = state.characters[0].id;
    const next = recordProfileVisit(state, characterId);

    expect(next.activity[0]).toMatchObject({
      type: 'profile-visited',
      actorId: state.currentUser.id,
      characterId,
    });
  });

  it('creates a local post without mutating the prior state', () => {
    const state = createInitialSocialState();
    const next = createPost(state, { content: 'A visitor wrote this in the local demo.' });

    expect(next).not.toBe(state);
    expect(state.posts).toHaveLength(60);
    expect(next.posts).toHaveLength(61);
    expect(next.posts[0]).toMatchObject({
      authorId: state.currentUser.id,
      isLocalOnly: true,
      isFictional: false,
      content: 'A visitor wrote this in the local demo.',
    });
  });

  it('adds, changes, then removes a reaction from the same actor', () => {
    const state = createInitialSocialState();
    const postId = state.posts[0].id;
    const original = getPostById(state, postId);
    const withHeart = toggleReaction(state, { postId, targetId: postId, reactionType: 'heart' });
    const withRocket = toggleReaction(withHeart, { postId, targetId: postId, reactionType: 'rocket' });
    const withoutReaction = toggleReaction(withRocket, {
      postId,
      targetId: postId,
      reactionType: 'rocket',
    });

    expect(getPostById(withHeart, postId).reactionCounts.heart).toBe(original.reactionCounts.heart + 1);
    expect(getPostById(withRocket, postId).reactionCounts.heart).toBe(original.reactionCounts.heart);
    expect(getPostById(withRocket, postId).reactionCounts.rocket).toBe(original.reactionCounts.rocket + 1);
    expect(getPostById(withoutReaction, postId).reactionCounts).toEqual(original.reactionCounts);
  });

  it('creates nested replies and keeps post comment totals in sync', () => {
    const state = createInitialSocialState();
    const postId = state.posts[0].id;
    const withComment = addComment(state, { postId, content: 'First local reply.' });
    const parent = withComment.comments.at(-1);
    const withReply = addComment(withComment, {
      postId,
      parentCommentId: parent.id,
      content: 'A nested local reply.',
    });

    expect(withReply.comments.at(-1)).toMatchObject({ postId, parentCommentId: parent.id });
    expect(getPostById(withReply, postId).commentCount).toBe(
      getPostById(state, postId).commentCount + 2,
    );
  });

  it('stores a repost once and does not inflate its count', () => {
    const state = createInitialSocialState();
    const postId = state.posts[1].id;
    const first = sharePost(state, { postId });
    const repeated = sharePost(first, { postId });

    expect(first.shares).toHaveLength(state.shares.length + 1);
    expect(repeated).toBe(first);
    expect(getPostById(first, postId).shareCount).toBe(getPostById(state, postId).shareCount + 1);
  });

  it('only lets an author edit or delete their own local post and cleans attached records', () => {
    const state = createInitialSocialState();
    const withPost = createPost(state, { content: 'This post will be removed.' });
    const postId = withPost.posts[0].id;
    const withComment = addComment(withPost, { postId, content: 'Attached comment.' });
    const withReaction = toggleReaction(withComment, { targetId: postId, reactionType: 'fire' });
    const withShare = sharePost(withReaction, { postId });
    const deniedEdit = editPost(withShare, {
      postId,
      actorId: 'fictional-pixelmatt',
      content: 'Not allowed.',
    });
    const edited = editPost(withShare, { postId, content: 'The author can edit this.' });
    const deleted = deletePost(edited, { postId });

    expect(deniedEdit).toBe(withShare);
    expect(getPostById(edited, postId).content).toBe('The author can edit this.');
    expect(getPostById(deleted, postId)).toBeNull();
    expect(deleted.comments.some((comment) => comment.postId === postId)).toBe(false);
    expect(deleted.reactions.some((reaction) => reaction.targetId === postId)).toBe(false);
    expect(deleted.shares.some((share) => share.postId === postId)).toBe(false);
    expect(deleted.activity[0]).toMatchObject({ type: 'post-deleted', postId });
  });

  it('protects another author’s comment and reparents replies when its author deletes it', () => {
    const state = createInitialSocialState();
    const postId = state.posts[0].id;
    const withParent = addComment(state, { postId, content: 'Local parent comment.' });
    const parent = withParent.comments.at(-1);
    const withChild = addComment(withParent, {
      postId,
      actorId: 'fictional-mooncat',
      parentCommentId: parent.id,
      content: 'Fictional child reply stays visible.',
    });
    const child = withChild.comments.at(-1);
    const deniedEdit = editComment(withChild, {
      commentId: child.id,
      content: 'The visitor must not edit this.',
    });
    const deletedParent = deleteComment(withChild, { commentId: parent.id });

    expect(deniedEdit).toBe(withChild);
    expect(deletedParent.comments.some((comment) => comment.id === parent.id)).toBe(false);
    expect(deletedParent.comments.find((comment) => comment.id === child.id).parentCommentId).toBeNull();
    expect(getPostById(deletedParent, postId).commentCount).toBe(
      getPostById(withChild, postId).commentCount - 1,
    );
  });

  it('returns distinct, correctly scoped trending filters using recorded local engagement', () => {
    const state = createInitialSocialState();
    const mostReacted = getTrendingPosts(state, 'most-reacted');
    const newest = getTrendingPosts(state, 'newest');
    const viralCoins = getTrendingPosts(state, 'viral-coins');

    expect(reactionTotal(mostReacted[0])).toBeGreaterThanOrEqual(reactionTotal(mostReacted[1]));
    expect(newest[0].createdAt >= newest[1].createdAt).toBe(true);
    expect(viralCoins.length).toBeGreaterThan(0);
    expect(viralCoins.every((post) => post.relatedTokenId)).toBe(true);
  });
});
