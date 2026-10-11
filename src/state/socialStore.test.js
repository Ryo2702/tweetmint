import { describe, expect, it } from 'vitest';
import {
  addComment,
  createInitialSocialState,
  createPost,
  deleteComment,
  deletePost,
  editComment,
  editPost,
  getPostById,
  getTrendingPosts,
  reactionTotal,
  sharePost,
  toggleReaction,
} from './socialStore.js';

describe('fictional community seed', () => {
  it('has a clearly marked local population and enough social history', () => {
    const state = createInitialSocialState();

    expect(state.mode).toBe('local-fictional-demo');
    expect(state.isLocalOnly).toBe(true);
    expect(state.characters).toHaveLength(25);
    expect(state.characters.every((character) => character.isFictional)).toBe(true);
    expect(state.posts).toHaveLength(60);
    expect(state.comments.length).toBeGreaterThanOrEqual(100);
    expect(state.posts.every((post) => post.isFictional)).toBe(true);
  });
});

describe('local social state helpers', () => {
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
