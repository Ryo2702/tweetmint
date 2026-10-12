import { AnimatePresence, motion } from 'motion/react';
import {
  Coins,
  Copy,
  Download,
  Feather,
  Flame,
  Gamepad2,
  HelpCircle,
  ExternalLink,
  Eye,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Upload,
  UserRound,
  Wallet,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PixelWindow from './components/PixelWindow.jsx';
import Avatar from './components/Avatar.jsx';
import PostCard from './components/PostCard.jsx';
import PostScreenshot from './components/PostScreenshot.jsx';
import PlazaScene from './world/PlazaScene.jsx';
import { usePlazaUi } from './state/uiStore.js';
import { useWalletStore } from './state/walletStore.js';
import { parseXPostUrl } from './state/xUrl.js';
import { WALLET_PROVIDERS, subscribeWalletDiscovery, walletDisplayName } from './services/walletService.js';
import { getExplorerUrl, networkLabel, SOLANA_NETWORK, verifySolanaMint } from './services/solanaRpc.js';
import { buildPumpFunCoinUrl, buildPumpFunLaunchDraft, buildPumpFunLaunchUrl, normalizeTicker } from './services/pumpFun.js';
import { createPostScreenshotAsset, createScreenshotFailure, createUploadedScreenshotAsset, isScreenshotReady, rasterizeScreenshotAsset } from './services/postScreenshot.js';
import {
  REACTION_TYPES,
  TRENDING_FILTERS,
  addComment,
  confirmTokenLaunch,
  createInitialSocialState,
  createPost,
  getSourcePostRecord,
  getCommentsForPost,
  getCommunityStats,
  getPostById,
  getTrendingPosts,
  reactionTotal,
  recordProfileVisit,
  runAutonomousActivity,
  sharePost,
  toggleReaction,
  upsertSourcePostRecord
} from './state/socialStore.js';

const STORAGE_KEY = 'tweetmint.local-social-state.v1';
const MINT_LOOKUP_STORAGE_KEY = 'tweetmint.local-mint-lookup.v1';
const reactionEmoji = {
  laugh: '😂', heart: '♥', fire: '🔥', rocket: '🚀', shocked: '😮', crying: '😭', skull: '💀', bullish: '🐂', bearish: '🐻'
};
const hairColors = ['#241e20', '#513725', '#d7b75c', '#533168', '#d8d2bd'];
const skinColors = ['#d69a75', '#8f593e', '#efbd8d', '#6f412f', '#c9855e'];
const plazaPositions = [
  [283, 611], [486, 472], [621, 476], [731, 372], [865, 430], [1008, 524], [1100, 333], [1175, 545], [375, 420], [533, 556],
  [669, 600], [799, 525], [918, 619], [1007, 609], [1185, 258], [350, 255], [472, 249], [660, 251], [814, 316], [926, 421],
  [218, 373], [235, 548], [381, 665], [780, 677], [1006, 158]
];

const initialState = () => {
  try {
    const seeded = createInitialSocialState();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const state = stored ? JSON.parse(stored) : seeded;
    const seededTokens = seeded.tokens.filter((token) => !(state.tokens || []).some((item) => item.id === token.id));
    const seededPosts = new Map(seeded.posts.map((post) => [post.id, post]));
    const normalized = {
      ...state,
      tokens: [...(state.tokens || []), ...seededTokens],
      posts: (state.posts || []).map((post) => {
        const seededPost = seededPosts.get(post.id);
        return post.relatedTokenId || !seededPost?.relatedTokenId
          ? post
          : { ...post, relatedTokenId: seededPost.relatedTokenId, token: seededPost.token };
      }),
      sourcePosts: Array.isArray(state.sourcePosts) ? state.sourcePosts : [],
      nextIds: { sourcePost: 1, ...(state.nextIds || {}) }
    };
    return normalized.currentUser?.displayName === 'Local Demo Visitor'
      ? { ...normalized, currentUser: { ...normalized.currentUser, handle: '@mikapixel', displayName: 'Mika Pixel' } }
      : normalized;
  } catch {
    return createInitialSocialState();
  }
};

function prettify(value = '') {
  return String(value).replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hydrateCharacter(character, index = 0) {
  if (!character) return { id: 'unknown', username: '@unknown', displayName: 'Unknown', color: '#b8ff3b', skin: '#d69a75', hair: '#241e20' };
  return {
    ...character,
    username: character.username || character.handle || '@visitor',
    color: character.color || (typeof character.palette === 'string' ? character.palette : '#b8ff3b'),
    skin: character.skinHex || skinColors[index % skinColors.length],
    hair: character.hairHex || hairColors[index % hairColors.length]
  };
}

function formatCompactDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.valueOf())) return 'now';
  const minutes = Math.max(0, Math.round((Date.now() - parsed.valueOf()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function createLocalPostPreview(source, value) {
  let username = null;
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean);
    if (segments[1]?.toLowerCase() === 'status' && segments[0].toLowerCase() !== 'i') username = segments[0];
  } catch {
    // The URL parser owns validation; this only enriches the local preview when possible.
  }
  return {
    data: {
      id: source.postId,
      text: '',
      createdAt: null,
      author: { id: null, name: null, username }
    },
    source: 'local-url'
  };
}

function shallowState(state) {
  return JSON.stringify(state);
}

function readMintLookup() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MINT_LOOKUP_STORAGE_KEY) || 'null');
    return {
      mintUrl: typeof stored?.mintUrl === 'string' ? stored.mintUrl : '',
      mintSource: stored?.mintSource?.ok && typeof stored.mintSource.postId === 'string' ? stored.mintSource : null,
      mintPreview: stored?.mintPreview && typeof stored.mintPreview === 'object' ? stored.mintPreview : null,
      screenshotAsset: stored?.screenshotAsset && typeof stored.screenshotAsset === 'object' ? stored.screenshotAsset : null,
      caption: typeof stored?.caption === 'string' ? stored.caption : typeof stored?.mintPreview?.data?.text === 'string' ? stored.mintPreview.data.text : '',
      ticker: typeof stored?.ticker === 'string' ? stored.ticker : '',
      tokenName: typeof stored?.tokenName === 'string' ? stored.tokenName : '',
      launchStatus: typeof stored?.launchStatus === 'string' ? stored.launchStatus : 'idle',
      mintAddress: typeof stored?.mintAddress === 'string' ? stored.mintAddress : '',
      launchDraft: stored?.launchDraft && typeof stored.launchDraft === 'object' ? stored.launchDraft : null
    };
  } catch {
    return { mintUrl: '', mintSource: null, mintPreview: null, screenshotAsset: null, caption: '', ticker: '', tokenName: '', launchStatus: 'idle', mintAddress: '', launchDraft: null };
  }
}

const mintStatusMessages = {
  'invalid-url': 'Enter a complete X post URL.',
  'unsupported-domain': 'Use an x.com or twitter.com post URL.',
  'missing-post-id': 'That link does not contain a numeric X post ID.',
  'capture-failed': 'The local screenshot could not be generated. Try again.'
};

export default function App() {
  const [social, setSocial] = useState(initialState);
  const [composerText, setComposerText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [filter, setFilter] = useState('trending');
  const [mintLookup] = useState(readMintLookup);
  const [mintUrl, setMintUrl] = useState(mintLookup.mintUrl);
  const [mintStatus, setMintStatus] = useState(mintLookup.mintPreview || mintLookup.screenshotAsset ? 'ready' : 'idle');
  const [mintSource, setMintSource] = useState(mintLookup.mintSource);
  const [mintPreview, setMintPreview] = useState(mintLookup.mintPreview);
  const [mintScreenshot, setMintScreenshot] = useState(mintLookup.screenshotAsset);
  const [mintCaption, setMintCaption] = useState(mintLookup.caption);
  const [mintTicker, setMintTicker] = useState(mintLookup.ticker);
  const [mintTokenName, setMintTokenName] = useState(mintLookup.tokenName);
  const [launchStatus, setLaunchStatus] = useState(mintLookup.launchStatus);
  const [mintAddress, setMintAddress] = useState(mintLookup.mintAddress);
  const [launchDraft, setLaunchDraft] = useState(mintLookup.launchDraft);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [autonomyPaused, setAutonomyPaused] = useState(false);
  const { panel, selectedPostId, selectedCharacterId, openPanel, closePanel } = usePlazaUi();
  const walletState = useWalletStore();
  const wallet = walletState.address ? { provider: walletDisplayName(walletState.selectedProvider), address: walletState.address } : null;

  useEffect(() => {
    const onDiscovery = () => {
      const store = useWalletStore.getState();
      store.discover();
      if (store.status === 'disconnected') store.restore();
    };
    const unsubscribe = subscribeWalletDiscovery(onDiscovery);
    return unsubscribe;
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, shallowState(social)); } catch { /* local persistence is best-effort only */ }
  }, [social]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MINT_LOOKUP_STORAGE_KEY, shallowState({
        mintUrl,
        mintSource,
        mintPreview,
        screenshotAsset: mintScreenshot,
        caption: mintCaption,
        ticker: mintTicker,
        tokenName: mintTokenName,
        launchStatus,
        mintAddress,
        launchDraft
      }));
    } catch { /* lookup persistence is best-effort only */ }
  }, [mintUrl, mintSource, mintPreview, mintScreenshot, mintCaption, mintTicker, mintTokenName, launchStatus, mintAddress, launchDraft]);

  useEffect(() => {
    if (autonomyPaused) return undefined;
    let stopped = false;
    const timers = new Set();
    const schedule = (action, minimum, maximum) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (stopped) return;
        setSocial((state) => runAutonomousActivity(state, Math.random, action));
        schedule(action, minimum, maximum);
      }, minimum + Math.random() * (maximum - minimum));
      timers.add(timer);
    };
    schedule('react', 2_000, 7_000);
    schedule('comment', 4_000, 10_000);
    schedule('share', 5_000, 12_000);
    schedule('post', 10_000, 25_000);
    schedule('visit', 3_000, 9_000);
    schedule('idle', 4_000, 10_000);
    return () => {
      stopped = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [autonomyPaused]);

  const characters = useMemo(
    () => social.characters.map((character, index) => hydrateCharacter(character, index)),
    [social.characters]
  );
  const currentUser = useMemo(() => hydrateCharacter(social.currentUser, characters.length), [social.currentUser, characters.length]);
  const characterById = useMemo(() => new Map([...characters, currentUser].map((character) => [character.id, character])), [characters, currentUser]);
  const selectedPost = selectedPostId ? getPostById(social, selectedPostId) : null;
  const selectedToken = selectedTokenId ? social.tokens.find((token) => token.id === selectedTokenId) || null : null;
  const selectedTokenSource = selectedToken ? getSourcePostRecord(social, selectedToken.sourcePostId) : null;
  const selectedTokenPost = selectedToken ? getPostById(social, selectedToken.sourcePostId) : null;
  const selectedCharacter = selectedCharacterId ? characterById.get(selectedCharacterId) : null;
  const visiblePosts = useMemo(() => getTrendingPosts(social, filter).slice(0, 12), [social, filter]);
  const communityStats = useMemo(() => getCommunityStats(social), [social]);
  const sceneCharacters = useMemo(() => characters.map((character, index) => {
    const point = plazaPositions[index % plazaPositions.length];
    return { ...character, x: point[0], y: point[1] };
  }), [characters]);

  const notify = (message, kind = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3400);
  };

  const actorFor = (id) => characterById.get(id) || currentUser;
  const postForDisplay = (post) => {
    const viewerReaction = social.reactions.find(
      (reaction) => reaction.targetType === 'post' && reaction.targetId === post.id && reaction.actorId === currentUser.id
    )?.reactionType;
    return { ...post, viewerReaction };
  };

  const showPost = (post) => openPanel('detail', { selectedPostId: post.id });
  const showCharacter = (character) => {
    setSocial((state) => recordProfileVisit(state, character.id));
    openPanel('profile', { selectedCharacterId: character.id });
  };

  const openZone = (zone) => {
    const panelForZone = { terminal: 'composer', feed: 'feed', trending: 'trending', mint: 'mint', trading: 'tokens', archive: 'archive', lounge: 'community', wallet: 'wallet' };
    openPanel(panelForZone[zone] || 'feed');
  };

  const submitPost = () => {
    const content = composerText.trim();
    if (!content) return notify('Write something before publishing.', 'error');
    if (content.length > 500) return notify('Posts are capped at 500 characters.', 'error');
    setSocial((state) => createPost(state, { content }));
    setComposerText('');
    notify('Post published to the plaza.');
    closePanel();
  };

  const reactTo = (post, reactionType) => {
    setSocial((state) => toggleReaction(state, { targetType: 'post', targetId: post.id, reactionType }));
    notify(`${reactionEmoji[reactionType]} reaction saved.`);
  };

  const reactToComment = (comment, reactionType) => {
    setSocial((state) => toggleReaction(state, { targetType: 'comment', targetId: comment.id, reactionType }));
  };

  const share = async (post, mode = 'repost') => {
    if (mode === 'link') {
      const link = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
      try { await navigator.clipboard.writeText(link); notify('Post link copied.'); } catch { notify('Copy failed in this browser.', 'error'); }
      return;
    }
    setSocial((state) => sharePost(state, { postId: post.id }));
    notify('Repost saved.');
  };

  const submitComment = () => {
    if (!selectedPost) return;
    if (!commentText.trim()) return notify('Write a comment first.', 'error');
    setSocial((state) => addComment(state, {
      postId: selectedPost.id,
      parentCommentId: replyingTo?.id || null,
      content: commentText
    }));
    setCommentText('');
    setReplyingTo(null);
    notify('Comment added to this thread.');
  };

  const updateMintUrl = (value) => {
    setMintUrl(value);
    setMintStatus('idle');
    setMintSource(null);
    setMintPreview(null);
    setMintScreenshot(null);
    setMintCaption('');
    setMintTicker('');
    setMintTokenName('');
    setLaunchStatus('idle');
    setMintAddress('');
    setLaunchDraft(null);
  };

  const updateMintCaption = (value) => {
    setMintCaption(value);
    const nextPreview = mintPreview ? { ...mintPreview, data: { ...(mintPreview.data || {}), text: value } } : null;
    const nextScreenshot = mintScreenshot ? { ...mintScreenshot, sourcePostText: value } : null;
    setMintPreview(nextPreview);
    setMintScreenshot(nextScreenshot);
    if (mintSource && nextScreenshot) {
      setSocial((state) => upsertSourcePostRecord(state, {
        ...nextScreenshot,
        sourcePostId: mintSource.postId,
        sourcePostUrl: mintSource.canonicalUrl || null,
        preview: nextPreview
      }));
    }
  };

  const uploadMintImage = (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) return notify('Choose an image file.', 'error');
    const source = mintSource?.sourceType === 'local-upload'
      ? mintSource
      : { ok: true, postId: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, canonicalUrl: null, sourceType: 'local-upload' };
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = String(reader.result || '');
      if (!imageUrl) return notify('The image could not be read.', 'error');
      const preview = { data: { id: source.postId, text: mintCaption, createdAt: null, author: null }, source: 'local-upload' };
      const screenshot = createUploadedScreenshotAsset({ source, imageUrl, caption: mintCaption, mimeType: file.type });
      setMintUrl('');
      setMintSource(source);
      setMintPreview(preview);
      setMintScreenshot(screenshot);
      setMintStatus('ready');
      setLaunchDraft(null);
      setMintAddress('');
      setLaunchStatus('screenshot ready');
      setSocial((state) => upsertSourcePostRecord(state, {
        ...screenshot,
        sourcePostId: source.postId,
        sourcePostUrl: null,
        sourceType: 'local-upload',
        preview,
        launchStatus: 'screenshot ready',
        tokenTicker: ''
      }));
      notify('Image uploaded and ready for a caption.');
    };
    reader.onerror = () => notify('The image could not be read.', 'error');
    reader.readAsDataURL(file);
  };

  const checkMintUrl = async (value = mintUrl) => {
    const inputUrl = value;
    const parsed = parseXPostUrl(inputUrl);
    if (!parsed.ok) {
      setMintStatus(parsed.reason);
      setMintSource(null);
      setMintPreview(null);
      setMintScreenshot(null);
      setLaunchStatus('idle');
      return;
    }

    setMintUrl(parsed.canonicalUrl);
    setMintSource(parsed);
    setLaunchDraft(null);
    setMintAddress('');
    setMintStatus('loading');
    setLaunchStatus('preparing');

    const existingRecord = getSourcePostRecord(social, parsed.postId);
    const localPreview = existingRecord?.preview || createLocalPostPreview(parsed, inputUrl);
    setMintPreview(localPreview);
    setMintScreenshot(isScreenshotReady(existingRecord) ? existingRecord : null);
    if (isScreenshotReady(existingRecord)) {
      setMintStatus('ready');
      setLaunchStatus(existingRecord.launchStatus || 'screenshot ready');
      return;
    }

    try {
      const screenshot = await rasterizeScreenshotAsset(createPostScreenshotAsset({ source: parsed, preview: localPreview }));
      setMintScreenshot(screenshot);
      setMintStatus('ready');
      setLaunchStatus(existingRecord?.launchStatus || 'screenshot ready');
      setSocial((state) => upsertSourcePostRecord(state, {
        ...screenshot,
        sourcePostUrl: parsed.canonicalUrl,
        launchStatus: existingRecord?.launchStatus || 'screenshot ready',
        preview: localPreview,
        launchTimestamp: existingRecord?.launchTimestamp || null,
        tokenTicker: existingRecord?.tokenTicker || ''
      }));
    } catch (error) {
      const failure = createScreenshotFailure(parsed, 'failed', error.message || mintStatusMessages['capture-failed']);
      setMintScreenshot(failure);
      setMintStatus('capture-failed');
      setLaunchStatus('failed');
      setSocial((state) => upsertSourcePostRecord(state, {
        ...failure,
        sourcePostUrl: parsed.canonicalUrl,
        launchStatus: 'failed',
        preview: localPreview
      }));
    }
  };

  const recaptureScreenshot = async () => {
    if (!mintSource) return;
    if (mintSource.sourceType === 'local-upload') return notify('Choose another image to replace this upload.');
    if (!mintPreview) return checkMintUrl();
    try {
      const screenshot = await rasterizeScreenshotAsset(createPostScreenshotAsset({ source: mintSource, preview: mintPreview }));
      setMintScreenshot(screenshot);
      setMintStatus('ready');
      setLaunchStatus('screenshot ready');
      setSocial((state) => upsertSourcePostRecord(state, {
        ...screenshot,
        sourcePostUrl: mintSource.canonicalUrl,
        launchStatus: 'screenshot ready',
        preview: mintPreview
      }));
      notify('The preserved screenshot was captured again.');
    } catch (error) {
      setMintStatus('capture-failed');
      setLaunchStatus('failed');
      notify(error.message || 'Screenshot capture failed.', 'error');
    }
  };

  const viewScreenshot = (asset = mintScreenshot) => {
    if (!isScreenshotReady(asset)) return notify('There is no saved screenshot to view yet.', 'error');
    window.open(asset.screenshotUrl, '_blank', 'noopener,noreferrer');
  };

  const openToken = (tokenId) => {
    if (!tokenId) return;
    setSelectedTokenId(tokenId);
    openPanel('token-detail');
  };

  const shareCoin = async (token) => {
    if (!token) return;
    const link = `${window.location.origin}${window.location.pathname}#coin-${token.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `$${token.ticker} on TweetMint`, text: 'One screenshot. One source post. One coin.', url: link });
      else await navigator.clipboard.writeText(link);
      notify(navigator.share ? 'Coin share sheet opened.' : 'Coin link copied.');
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Coin share failed in this browser.', 'error');
    }
  };

  const prepareLaunch = () => {
    const ticker = normalizeTicker(mintTicker);
    if (!mintSource || !isScreenshotReady(mintScreenshot)) {
      setLaunchStatus('failed');
      return notify('Capture the source screenshot before preparing a launch.', 'error');
    }
    if (!/^[A-Z0-9]{2,10}$/.test(ticker)) {
      return notify('Ticker must be 2–10 letters or numbers.', 'error');
    }
    setMintTicker(ticker);
    setLaunchStatus('checking canonical record');
    const existing = social.tokens.find((token) => String(token.sourcePostId) === mintSource.postId || (mintSource.canonicalUrl && token.sourcePostUrl === mintSource.canonicalUrl));
    if (existing) {
      setLaunchStatus(existing.verifiedOnChain ? 'launched' : 'pending confirmation');
      openToken(existing.id);
      return;
    }
    if (!walletState.address) {
      setLaunchStatus('awaiting wallet');
      setSocial((state) => upsertSourcePostRecord(state, {
        ...mintScreenshot,
        sourcePostId: mintSource.postId,
        sourcePostUrl: mintSource.canonicalUrl,
        tokenTicker: ticker,
        launchStatus: 'awaiting wallet',
        launchPlatform: 'pump.fun',
        preview: mintPreview
      }));
      notify('Connect Phantom or Solflare before opening the pump.fun launch.', 'error');
      openPanel('wallet');
      return;
    }
    const draft = buildPumpFunLaunchDraft({
      source: mintSource,
      screenshot: mintScreenshot,
      ticker,
      name: mintTokenName || `${ticker} Coin`,
      walletAddress: walletState.address,
      network: walletState.network || SOLANA_NETWORK
    });
    setLaunchDraft(draft);
    setLaunchStatus('preparing');
    setSocial((state) => upsertSourcePostRecord(state, {
      ...mintScreenshot,
      sourcePostUrl: mintSource.canonicalUrl,
      sourcePostId: mintSource.postId,
      tokenTicker: ticker,
      launchStatus: 'preparing',
      launchPlatform: 'pump.fun',
      preview: mintPreview
    }));
  };

  const openPumpFunLaunch = () => {
    if (!launchDraft) return prepareLaunch();
    setLaunchStatus('submitting to pump.fun');
    window.open(buildPumpFunLaunchUrl(), '_blank', 'noopener,noreferrer');
    setLaunchStatus('pending confirmation');
    setSocial((state) => upsertSourcePostRecord(state, {
      ...mintScreenshot,
      sourcePostId: mintSource.postId,
      sourcePostUrl: mintSource.canonicalUrl,
      tokenTicker: launchDraft.ticker,
      launchStatus: 'pending confirmation',
      launchPlatform: 'pump.fun',
      creatorWallet: walletState.address,
      launchDraft,
      preview: mintPreview
    }));
    notify('Pump.fun opened. Approve the launch there, then paste the returned mint to verify it.');
  };

  const verifyLaunch = async () => {
    if (!launchDraft || !mintAddress.trim()) return notify('Paste the mint address returned by pump.fun.', 'error');
    setLaunchStatus('pending confirmation');
    try {
      const verification = await verifySolanaMint(mintAddress, { network: walletState.network || SOLANA_NETWORK });
      if (!verification.confirmed) throw new Error('That address is not a confirmed SPL mint on the selected Solana network.');
      const confirmedAt = new Date().toISOString();
      const token = {
        id: `tweetmint-coin-${mintSource.postId}`,
        name: launchDraft.name,
        ticker: launchDraft.ticker,
        sourcePostId: mintSource.postId,
        sourcePostUrl: mintSource.canonicalUrl,
        mintAddress: verification.mintAddress,
        creatorWallet: launchDraft.creatorWallet,
        launchPlatform: 'pump.fun',
        launchStatus: 'launched',
        launchTimestamp: confirmedAt,
        network: walletState.network || SOLANA_NETWORK,
        pumpFunUrl: buildPumpFunCoinUrl(verification.mintAddress),
        explorerUrl: getExplorerUrl(verification.mintAddress, walletState.network || SOLANA_NETWORK),
        screenshotAssetId: mintScreenshot.screenshotAssetId
      };
      setSocial((state) => confirmTokenLaunch(state, { token, confirmedAt }));
      setLaunchStatus('launched');
      setMintAddress(verification.mintAddress);
      notify(`$${token.ticker} verified on Solana and saved as the canonical coin.`);
      openToken(token.id);
    } catch (error) {
      setLaunchStatus('failed');
      setSocial((state) => upsertSourcePostRecord(state, {
        ...mintScreenshot,
        sourcePostId: mintSource.postId,
        sourcePostUrl: mintSource.canonicalUrl,
        tokenTicker: launchDraft.ticker,
        launchStatus: 'failed',
        launchPlatform: 'pump.fun',
        creatorWallet: launchDraft.creatorWallet,
        launchDraft,
        preview: mintPreview
      }));
      notify(error.message || 'Solana mint verification failed.', 'error');
    }
  };

  const connectWallet = async (provider) => {
    const connection = await walletState.connect(provider);
    if (connection) {
      if (launchStatus === 'awaiting wallet') setLaunchStatus('preparing');
      notify(`${connection.name} connected. Your Solana account is ready.`);
    }
    else if (useWalletStore.getState().connectionError) notify(useWalletStore.getState().connectionError, 'error');
  };

  const disconnectWallet = async () => {
    const disconnected = await walletState.disconnect();
    notify(disconnected ? 'Wallet disconnected from this browser.' : 'Wallet disconnect failed.', disconnected ? 'success' : 'error');
  };

  const copyWalletAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      notify('Full wallet address copied.');
    } catch {
      notify('Copy failed in this browser.', 'error');
    }
  };

  const copyText = async (value, message = 'Copied.') => {
    try {
      await navigator.clipboard.writeText(String(value));
      notify(message);
    } catch {
      notify('Copy failed in this browser.', 'error');
    }
  };

  const resetLocalWorld = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(MINT_LOOKUP_STORAGE_KEY);
    } catch { /* reset still works in memory */ }
    setSocial(createInitialSocialState());
    setMintUrl('');
    setMintStatus('idle');
    setMintSource(null);
    setMintPreview(null);
    setMintScreenshot(null);
    setMintCaption('');
    setMintTicker('');
    setMintTokenName('');
    setLaunchStatus('idle');
    setMintAddress('');
    setLaunchDraft(null);
    setSelectedTokenId(null);
    notify('The plaza has been reset.');
  };

  const nav = [
    ['world', 'World', Gamepad2], ['feed', 'Feed', MessageCircle], ['trending', 'Trending', Flame], ['mint', 'Launch', Plus], ['tokens', 'Tokens', Coins], ['how', 'How it works', HelpCircle], ['profile', 'Profile', UserRound]
  ];
  const mobileNav = [
    ['world', 'World', Gamepad2], ['feed', 'Feed', MessageCircle], ['composer', 'Post', Feather], ['mint', 'Launch', Plus], ['tokens', 'Tokens', Coins], ['archive', 'Archive', Eye]
  ];
  const duplicateToken = mintSource && social.tokens.find((token) => String(token.sourcePostId) === mintSource.postId || (mintSource.canonicalUrl && token.sourcePostUrl === mintSource.canonicalUrl));
  const mintRecord = mintSource ? getSourcePostRecord(social, mintSource.postId) : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => closePanel()} aria-label="TweetMint world home">
          <span className="brand-mark" aria-hidden="true" />
          <span>TWEET<strong>MINT</strong></span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([id, label]) => <button className={`nav-button ${panel === id ? 'is-active' : ''}`} type="button" key={id} onClick={() => openPanel(id === 'world' ? null : id)}>{label}</button>)}
        </nav>
        <span className="topbar-spacer" />
        {wallet ? (
          <button className="top-action" type="button" onClick={() => openPanel('wallet')}><span className="wallet-connected-dot" aria-hidden="true" /> <Wallet size={14} /> {wallet.provider} {wallet.address.slice(0, 4)}…{wallet.address.slice(-4)}</button>
        ) : (
          <button className="top-action" type="button" onClick={() => openPanel('wallet')}><Wallet size={14} /> Connect wallet</button>
        )}
      </header>

      <section className="world-page">
        <section className="plaza-stage" aria-label="TweetMint Social Plaza">
          <PlazaScene characters={sceneCharacters} activity={social.activity} paused={autonomyPaused} walletConnected={Boolean(walletState.address)} onZoneSelect={openZone} onCharacterSelect={showCharacter} />

          <div className="world-banner" aria-hidden="true">
            <p>THE SOCIAL PLAZA</p>
            <h1>EVERY POST IS A <span>COIN.</span></h1>
          </div>

          <StatsBoard stats={communityStats} paused={autonomyPaused} onTogglePause={() => setAutonomyPaused((value) => !value)} />
          <AnnouncementStack announcements={social.announcements || []} sourcePosts={social.sourcePosts || []} onOpen={showPost} onToken={openToken} onHistory={() => openPanel('announcements')} />

          <aside className="activity-board" aria-label="Recent community activity">
            <header><span>✦ PLAZA PULSE</span><span>COMMUNITY</span></header>
            <div className="activity-list">
              {social.activity.slice(0, 4).map((activity) => {
                const actor = actorFor(activity.actorId);
                const post = activity.postId ? getPostById(social, activity.postId) : null;
                const visited = activity.characterId ? characterById.get(activity.characterId) : null;
                const activityText = activity.type === 'browse-trending' ? 'browsed Trending Wall' : activity.type === 'browse-coins' ? 'browsed Coin Garden' : activity.type === 'conversation-started' && visited ? `talked with ${visited.displayName}` : visited ? `visited ${visited.displayName}` : prettify(activity.type);
                return <div className="activity-item" key={activity.id}><span className="activity-dot" /><button type="button" onClick={() => post && showPost(post)}><strong>{actor.displayName}</strong> {reactionEmoji[activity.reactionType] || ''} {activityText}{post ? ` · “${post.content.slice(0, 28)}…”` : ''}</button></div>;
              })}
            </div>
          </aside>

          <nav className="quick-dock" aria-label="World locations">
            <button className="dock-button" type="button" onClick={() => openZone('terminal')}><Feather /> Post</button>
            <button className="dock-button" type="button" onClick={() => openZone('feed')}><MessageCircle /> Feed board</button>
            <button className="dock-button" type="button" onClick={() => openZone('trending')}><Flame /> Trending</button>
            <button className="dock-button" type="button" onClick={() => openZone('mint')}><TerminalSquare /> Mint station</button>
            <button className="dock-button" type="button" onClick={() => openZone('trading')}><Coins /> Coin garden</button>
            <button className="dock-button" type="button" onClick={() => openZone('archive')}><Eye /> Post archive</button>
            <button className="dock-button" type="button" onClick={() => openZone('wallet')}><Wallet /> Wallet station</button>
          </nav>

          <AnimatePresence>
            {panel && panel !== 'world' && (
              <motion.div className="window-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {panel === 'composer' && <ComposerWindow text={composerText} setText={setComposerText} onPublish={submitPost} onClose={closePanel} />}
                {(panel === 'feed' || panel === 'trending' || panel === 'community') && <FeedWindow posts={visiblePosts} filter={filter} setFilter={setFilter} panel={panel} getAuthor={actorFor} sourcePosts={social.sourcePosts || []} tokens={social.tokens} onOpen={showPost} onOpenToken={openToken} onReact={reactTo} onShare={share} onClose={closePanel} />}
                {panel === 'detail' && selectedPost && <DetailWindow post={postForDisplay(selectedPost)} getAuthor={actorFor} social={social} currentUser={currentUser} commentText={commentText} setCommentText={setCommentText} replyingTo={replyingTo} setReplyingTo={setReplyingTo} onComment={submitComment} onReact={reactTo} onReactComment={reactToComment} onShare={share} onClose={closePanel} />}
                {panel === 'profile' && selectedCharacter && <ProfileWindow character={selectedCharacter} posts={social.posts} getAuthor={actorFor} onOpen={showPost} onClose={closePanel} />}
                {panel === 'mint' && <MintWindow status={mintStatus} statusMessage={mintStatusMessages[mintStatus]} launchStatus={launchStatus} source={mintSource} sourceRecord={mintRecord} preview={mintPreview} screenshot={mintScreenshot} caption={mintCaption} onCaptionChange={updateMintCaption} onUploadImage={uploadMintImage} ticker={mintTicker} setTicker={setMintTicker} tokenName={mintTokenName} setTokenName={setMintTokenName} mintAddress={mintAddress} setMintAddress={setMintAddress} launchDraft={launchDraft} duplicate={duplicateToken} onClear={() => updateMintUrl('')} onCheck={checkMintUrl} onRecapture={recaptureScreenshot} onViewScreenshot={viewScreenshot} onContinue={prepareLaunch} onOpenPumpFun={openPumpFunLaunch} onVerifyLaunch={verifyLaunch} onViewExisting={openToken} onClose={closePanel} onHowItWorks={() => openPanel('how')} wallet={wallet} network={walletState.network || SOLANA_NETWORK} />}
                {panel === 'tokens' && <TokensWindow tokens={social.tokens} posts={social.posts} sourcePosts={social.sourcePosts || []} onOpen={showPost} onOpenToken={openToken} onClose={closePanel} />}
                {panel === 'token-detail' && selectedToken && <TokenDetailWindow token={selectedToken} source={selectedTokenSource} post={selectedTokenPost ? postForDisplay(selectedTokenPost) : null} getAuthor={actorFor} onOpenPost={showPost} onReact={reactTo} onSharePost={share} onViewScreenshot={() => viewScreenshot(selectedTokenSource)} onShare={shareCoin} onCopy={copyText} onClose={closePanel} />}
                {panel === 'announcements' && <AnnouncementsWindow announcements={social.announcementHistory || []} sourcePosts={social.sourcePosts || []} onOpen={showPost} onToken={openToken} onClose={closePanel} />}
                {panel === 'archive' && <ArchiveWindow sourcePosts={social.sourcePosts || []} tokens={social.tokens} onOpenToken={openToken} onClose={closePanel} />}
                {panel === 'how' && <HowItWorksWindow onLaunch={() => openPanel('mint')} onClose={closePanel} />}
                {panel === 'wallet' && <WalletWindow wallet={wallet} walletState={walletState} onConnect={connectWallet} onDisconnect={disconnectWallet} onRefresh={() => walletState.refreshBalance()} onCopy={copyWalletAddress} onClose={closePanel} />}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNav.map(([id, label, Icon]) => <button type="button" key={id} className={panel === id ? 'is-active' : ''} onClick={() => openPanel(id === 'world' ? null : id)}><Icon /><span>{label}</span></button>)}
      </nav>

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => <div className={`toast ${toast.kind === 'error' ? 'error' : ''}`} key={toast.id}>{toast.kind === 'error' ? <XCircle /> : <Sparkles />}<span>{toast.message}</span></div>)}
      </div>

      <button type="button" className="reset-local-world" onClick={resetLocalWorld} aria-label="Reset plaza"><RefreshCw size={12} /> reset</button>
    </main>
  );
}

function StatsBoard({ stats, paused, onTogglePause }) {
  const entries = [
    ['TOTAL POSTS', stats.totalPosts],
    ['POSTS TODAY', stats.postsToday],
    ['TOTAL COMMENTS', stats.totalComments],
    ['TOTAL REACTIONS', stats.totalReactions],
    ['TOTAL SHARES', stats.totalShares],
    ['TOTAL COINS MINTED', stats.totalCoinsMinted],
    ['COINS MINTED TODAY', stats.coinsMintedToday],
  ];
  return <aside className="stats-board" aria-label="Live community statistics"><header><span>✦ PLAZA STATS</span><span>SOLANA</span><button className="stats-pause" type="button" onClick={onTogglePause}>{paused ? 'play' : 'pause'}</button></header><div className="stats-grid">{entries.map(([label, value]) => <div className="stat-item" key={`${label}-${value}`}><strong>{value}</strong><span>{label}</span></div>)}</div></aside>;
}

function AnnouncementStack({ announcements, sourcePosts, onOpen, onToken, onHistory }) {
  if (!announcements.length) return null;
  return <aside className="announcement-stack" aria-label="Live announcements"><header><span>✦ LIVE EVENTS</span><button type="button" onClick={onHistory}>history</button></header>{announcements.slice(0, 3).map((announcement) => { const source = sourcePosts.find((item) => String(item.sourcePostId) === String(announcement.sourcePostId)); return <button className="announcement-card" type="button" key={announcement.id} onClick={() => announcement.postId ? onOpen({ id: announcement.postId }) : announcement.tokenId && onToken(announcement.tokenId)}>{source && <PostScreenshot asset={source} variant="thumb" alt="Original post thumbnail" />}<span className="announcement-icon">✦</span><span>{announcement.text}</span></button>; })}</aside>;
}

function AnnouncementsWindow({ announcements, sourcePosts, onOpen, onToken, onClose }) {
  return <div className="floating-window announcements-window"><PixelWindow eyebrow="EVENT LOG" title="Announcement history" onClose={onClose}><div className="window-body compact">{announcements.slice(0, 30).map((announcement) => { const source = sourcePosts.find((item) => String(item.sourcePostId) === String(announcement.sourcePostId)); return <button className="announcement-history-item" type="button" key={announcement.id} onClick={() => announcement.postId ? onOpen({ id: announcement.postId }) : announcement.tokenId && onToken(announcement.tokenId)}>{source && <PostScreenshot asset={source} variant="thumb" alt="Original post thumbnail" />}<span>{announcement.text}</span><time>{formatCompactDate(announcement.createdAt)}</time></button>; })}</div></PixelWindow></div>;
}

function ComposerWindow({ text, setText, onPublish, onClose }) {
  return <div className="floating-window composer-window"><PixelWindow eyebrow="POST TERMINAL" title="Compose for the plaza" onClose={onClose}><div className="window-body"><p className="panel-note"><TerminalSquare />Posting is open to everyone. A wallet is only needed when you choose a pump.fun launch.</p><textarea className="composer-textarea" value={text} maxLength="500" placeholder="What is happening in the plaza?" onChange={(event) => setText(event.target.value)} /><div className="composer-footer"><span className="counter">{text.length}/500</span><button className="pixel-button primary" type="button" onClick={onPublish}><Send /> Publish post</button></div></div></PixelWindow></div>;
}

function FeedWindow({ posts, filter, setFilter, panel, getAuthor, sourcePosts, tokens, onOpen, onOpenToken, onReact, onShare, onClose }) {
  const title = panel === 'community' ? 'Social Lounge' : panel === 'trending' ? 'Trending Wall' : 'Community Feed';
  const preserved = sourcePosts.filter((record) => record.screenshotStatus === 'ready').slice(0, 4);
  return <div className="floating-window feed-window"><PixelWindow eyebrow={panel === 'trending' ? 'TRENDING WALL' : 'COMMUNITY FEED BOARD'} title={title} onClose={onClose}><div className="window-body compact"><div className="feed-toolbar">{TRENDING_FILTERS.map((item) => <button key={item} type="button" className={`filter-button ${filter === item ? 'is-active' : ''}`} onClick={() => setFilter(item)}>{prettify(item)}</button>)}</div>{preserved.length > 0 && <section className="preserved-feed" aria-label="Recently minted preserved posts"><header><span>✦ PRESERVED POST WALL</span><small>SCREENSHOT → COIN</small></header>{preserved.map((record) => { const token = tokens.find((item) => String(item.sourcePostId) === String(record.sourcePostId)); return <button className="preserved-feed-card" type="button" key={record.screenshotAssetId} onClick={() => token ? onOpenToken(token.id) : undefined}><PostScreenshot asset={record} variant="thumb" alt="Preserved source post thumbnail" /><span><strong>{token ? `$${token.ticker}` : 'SOURCE POST'}</strong><small>{record.sourceAuthorUsername ? `@${record.sourceAuthorUsername}` : 'Author unavailable'} · {record.launchStatus || 'captured'}</small></span></button>; })}</section>}{posts.map((post) => <PostCard key={post.id} post={post} author={getAuthor(post.authorId)} onOpen={onOpen} onReact={onReact} onShare={onShare} />)}</div></PixelWindow></div>;
}

function DetailWindow({ post, getAuthor, social, currentUser, commentText, setCommentText, replyingTo, setReplyingTo, onComment, onReact, onReactComment, onShare, onClose }) {
  const author = getAuthor(post.authorId);
  const comments = getCommentsForPost(social, post.id);
  const topLevel = comments.filter((comment) => !comment.parentCommentId);
  const repliesFor = (parentId) => comments.filter((comment) => comment.parentCommentId === parentId);
  return <div className="floating-window detail-window"><PixelWindow eyebrow="POST THREAD" title="Live in this browser" onClose={onClose}><div className="post-detail-content"><PostCard post={post} author={author} onOpen={() => {}} onReact={onReact} onShare={onShare} /><div className="reaction-picker" aria-label="More reactions">{REACTION_TYPES.map((type) => <button key={type} className={`reaction-button ${post.viewerReaction === type ? 'is-active' : ''}`} type="button" onClick={() => onReact(post, type)} aria-label={`React ${type}`}>{reactionEmoji[type]}</button>)}</div><div className="reaction-counts">{Object.entries(post.reactionCounts).filter(([, count]) => count).map(([type, count]) => <span className="count-chip" key={type}>{reactionEmoji[type]} {count}</span>)}</div><div className="comments-heading"><span>{post.commentCount} COMMENTS</span><span>{reactionTotal(post)} REACTIONS</span></div>{topLevel.map((comment) => <CommentThread key={comment.id} comment={comment} replies={repliesFor(comment.id)} getAuthor={getAuthor} currentUser={currentUser} social={social} onReply={setReplyingTo} onReact={onReactComment} />)}<div className="comment-compose">{replyingTo && <button className="filter-button" type="button" onClick={() => setReplyingTo(null)}>Replying · cancel</button>}<input className="field-input" value={commentText} maxLength="400" placeholder={replyingTo ? `Reply to ${getAuthor(replyingTo.authorId).displayName}` : 'Add a local comment'} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onComment(); } }} /><button className="pixel-button primary" type="button" onClick={onComment}><Send /></button></div></div></PixelWindow></div>;
}

function CommentThread({ comment, replies, getAuthor, currentUser, social, onReply, onReact }) {
  const author = getAuthor(comment.authorId);
  const viewerReaction = social.reactions.find((reaction) => reaction.targetType === 'comment' && reaction.targetId === comment.id && reaction.actorId === currentUser.id)?.reactionType;
  return <div className="comment-thread"><article className="comment"><Avatar character={author} size={25} /><div className="comment-body"><div className="comment-meta"><strong>{author.displayName}</strong><span>{author.username}</span><span>{formatCompactDate(comment.createdAt)}</span></div><p className="comment-text">{comment.content}</p><div className="post-actions"><button className={`mini-action ${viewerReaction === 'laugh' ? 'is-active' : ''}`} type="button" onClick={() => onReact(comment, 'laugh')}>😂 {comment.reactionCounts.laugh || ''}</button><button className="mini-action" type="button" onClick={() => onReply(comment)}>↳ Reply</button></div></div></article>{replies.map((reply) => <article className="comment reply" key={reply.id}><Avatar character={getAuthor(reply.authorId)} size={22} /><div className="comment-body"><div className="comment-meta"><strong>{getAuthor(reply.authorId).displayName}</strong><span>{formatCompactDate(reply.createdAt)}</span></div><p className="comment-text">{reply.content}</p></div></article>)}</div>;
}

function ProfileWindow({ character, posts, onOpen, onClose }) {
  const authored = posts.filter((post) => post.authorId === character.id);
  return <div className="floating-window profile-window"><PixelWindow eyebrow="PLAZA MEMBER" title="Profile station" onClose={onClose}><div className="profile-hero"><Avatar character={character} size={52} /><div><h2 className="profile-name">{character.displayName}</h2><div className="profile-handle">{character.username}</div><p className="profile-bio">{character.isFictional ? `${character.personality}. Into ${(character.interests || []).join(', ')}.` : 'Posts are kept in this browser until a server is configured.'}</p></div></div><div className="profile-stats"><div className="profile-stat"><strong>{authored.length}</strong><span>posts</span></div><div className="profile-stat"><strong>{character.isFictional ? 'MEMBER' : 'VISITOR'}</strong><span>identity</span></div><div className="profile-stat"><strong>—</strong><span>followers</span></div></div><div className="window-body compact">{authored.slice(0, 4).map((post) => <button key={post.id} className="mini-action" type="button" onClick={() => onOpen(post)}>Open: {post.content.slice(0, 42)}…</button>)}</div></PixelWindow></div>;
}

function MintWindow({ status, statusMessage, launchStatus, source, sourceRecord, preview, screenshot, caption, onCaptionChange, onUploadImage, ticker, setTicker, tokenName, setTokenName, mintAddress, setMintAddress, launchDraft, duplicate, onClear, onCheck, onRecapture, onViewScreenshot, onContinue, onOpenPumpFun, onVerifyLaunch, onViewExisting, onClose, onHowItWorks, wallet, network }) {
  const previewData = preview?.data || preview;
  const author = previewData?.author?.username || previewData?.author?.name || previewData?.username || previewData?.authorName || screenshot?.sourceAuthorUsername;
  const content = previewData?.text || previewData?.content || screenshot?.sourcePostText;
  const parsed = Boolean(source?.postId);
  const captureReady = isScreenshotReady(screenshot);
  const hasError = ['invalid-url', 'unsupported-domain', 'missing-post-id', 'capture-failed'].includes(status);
  const existingTicker = duplicate?.ticker || sourceRecord?.tokenTicker;
  const launchSteps = [
    ['screenshot ready', '1 · Screenshot asset'],
    ['checking canonical record', '2 · Canonical post check'],
    ['awaiting wallet', '3 · Wallet approval'],
    ['submitting to pump.fun', '4 · Pump.fun launch'],
    ['pending confirmation', '5 · Solana confirmation'],
    ['launched', '6 · Coin page live']
  ];
  return <div className="floating-window mint-window"><PixelWindow eyebrow="MINT STATION · PUMP.FUN" title="Preserved post launch control" onClose={onClose}><div className="mint-panel"><div className="mint-machine-art"><div className="mint-machine-screen">{captureReady ? 'SCREENSHOT READY' : 'POST ARCHIVE'}<small>{captureReady ? 'PREPARE THE COIN' : 'CAPTURE THE SOURCE POST'}</small></div></div><p className="panel-note"><TerminalSquare />TweetMint saves the source post as an image first. The screenshot stays attached to the canonical coin; pump.fun approval happens in your connected wallet.</p><div className="mint-help-row"><button className="pixel-button secondary" type="button" onClick={onHowItWorks}><HelpCircle /> How it works</button><span>One screenshot. One source post. One coin.</span></div><div className="mint-input-grid"><label className="field-label" htmlFor="post-image">POST IMAGE<span className="upload-control"><Upload /> {captureReady ? 'Replace image' : 'Upload image'}<input className="upload-input" id="post-image" type="file" accept="image/*" onChange={(event) => onUploadImage(event.target.files?.[0])} /></span></label><label className="field-label" htmlFor="post-caption">CAPTION<textarea className="field-input caption-input" id="post-caption" value={caption} maxLength="500" placeholder="Write a caption for the post…" onChange={(event) => onCaptionChange(event.target.value)} /></label></div>{status === 'loading' && <div className="status-row"><RefreshCw />Parsing the source ID and saving the screenshot locally…</div>}{hasError && <div className={`status-row ${['invalid-url', 'unsupported-domain', 'missing-post-id'].includes(status) ? 'error' : 'warning'}`}><XCircle />{statusMessage || 'Local screenshot capture failed.'}</div>}{parsed && <section className="mint-preview-card" aria-label="Preserved X post preview"><div className="mint-screenshot-hero"><PostScreenshot asset={screenshot} alt="Preserved screenshot of the original X post" onRetry={source?.sourceType === 'local-upload' ? undefined : onRecapture} /></div><div className="mint-source-details"><p className="muted">PRESERVED POST IMAGE</p><h2>{author ? `@${String(author).replace(/^@/, '')}` : 'Author unavailable'}</h2>{content ? <p className="mint-post-text">{content}</p> : <p className="mint-post-text muted">Add a caption to label this uploaded image.</p>}<dl className="source-meta"><div><dt>CAPTURE STATUS</dt><dd className={captureReady ? 'meta-ready' : ''}>{captureReady ? 'SAVED IMAGE ASSET' : screenshot?.screenshotStatus || 'WAITING'}</dd></div><div><dt>ELIGIBILITY</dt><dd>{captureReady ? 'ELIGIBLE TO LAUNCH' : 'WAITING FOR CAPTURE'}</dd></div><div><dt>EXISTING COIN CHECK</dt><dd>{duplicate ? 'THIS POST IS ALREADY A COIN' : 'NO CANONICAL COIN FOUND'}</dd></div></dl>{previewData?.createdAt && <time className="muted">POSTED · {formatCompactDate(previewData.createdAt)}</time>}<div className="screenshot-actions"><button className="pixel-button" type="button" onClick={() => onViewScreenshot(screenshot)} disabled={!captureReady}><Eye /> View Full Screenshot</button>{captureReady && <a className="pixel-button" href={screenshot.screenshotUrl} download={`tweetmint-${source.postId}.${screenshot.screenshotFormat || 'png'}`}><Download /> Save Image</a>}{source?.sourceType !== 'local-upload' && <button className="pixel-button" type="button" onClick={onRecapture} disabled={!parsed}><RefreshCw /> Re-capture</button>}<button className="pixel-button" type="button" onClick={onClear}>Cancel</button></div></div></section>}{duplicate && <section className="duplicate-coin-card"><p className="duplicate-title">THIS POST IS ALREADY A COIN</p><PostScreenshot asset={screenshot || sourceRecord} variant="thumb" alt="Existing coin source screenshot" /><div><strong>${existingTicker || 'COIN'}</strong><span>Launch platform · {duplicate.launchPlatform || 'pump.fun'}</span><span>Mint · {duplicate.mintAddress ? `${duplicate.mintAddress.slice(0, 8)}…${duplicate.mintAddress.slice(-6)}` : 'confirmation pending'}</span><button className="pixel-button primary" type="button" onClick={() => onViewExisting(duplicate.id)}>View Existing Coin</button></div></section>}{captureReady && !duplicate && <section className="launch-form"><p className="muted">STEP 3 · CHOOSE A TICKER</p><div className="form-grid"><label className="field-label" htmlFor="token-ticker">TOKEN TICKER<input className="field-input" id="token-ticker" value={ticker} maxLength="10" placeholder="CHAIR" onChange={(event) => setTicker(normalizeTicker(event.target.value))} /></label><label className="field-label" htmlFor="token-name">TOKEN NAME<input className="field-input" id="token-name" value={tokenName} maxLength="32" placeholder="Chair Coin" onChange={(event) => setTokenName(event.target.value)} /></label></div><div className="launch-facts"><span>PLATFORM · <strong>pump.fun</strong></span><span>NETWORK · <strong>{networkLabel(network)}</strong></span><span>WALLET · <strong>{wallet ? `${wallet.provider} ${wallet.address.slice(0, 5)}…${wallet.address.slice(-4)}` : 'NOT CONNECTED'}</strong></span><span>COST · <strong>Shown by pump.fun before approval</strong></span></div>{launchStatus !== 'idle' && <div className="launch-status"><span>LAUNCH STATUS</span><strong>{launchStatus.toUpperCase()}</strong></div>}{!launchDraft ? <button className="pixel-button primary" type="button" onClick={onContinue}><Coins /> Continue to Launch</button> : <><div className="launch-draft"><strong>LAUNCH DATA PREPARED</strong><span>Image, caption, {launchDraft.ticker}, and creator wallet are ready for pump.fun.</span></div><div className="window-actions"><button className="pixel-button primary" type="button" onClick={onOpenPumpFun}><ExternalLink /> Open pump.fun Launch</button><a className="pixel-button" href={screenshot.screenshotUrl} download={`tweetmint-${source.postId}.${screenshot.screenshotFormat || 'png'}`}><Download /> Download Screenshot</a></div><label className="field-label" htmlFor="mint-address">MINT RETURNED BY PUMP.FUN<input className="field-input" id="mint-address" value={mintAddress} placeholder="Paste the Solana mint address" onChange={(event) => setMintAddress(event.target.value)} /></label><button className="pixel-button warning" type="button" onClick={onVerifyLaunch}><ShieldCheck /> Verify Launch on Solana</button></>}</section>}{hasError && <button className="pixel-button" type="button" onClick={onCheck}><RefreshCw /> Retry capture</button>}<div className="steps">{launchSteps.map(([step, label]) => <div className={`step ${launchStatus === step || (step === 'screenshot ready' && captureReady) ? 'active' : ''}`} key={step}>{label}</div>)}</div></div></PixelWindow></div>;
}

function TokensWindow({ tokens, posts, sourcePosts, onOpen, onOpenToken, onClose }) {
  return <div className="floating-window tokens-window"><PixelWindow eyebrow="COIN GARDEN" title="Coin discovery" onClose={onClose}><p className="panel-note"><Coins />Every confirmed coin keeps its source screenshot. Unconfirmed seeded concepts remain clearly marked.</p><div className="token-list">{tokens.map((token) => { const post = posts.find((item) => item.id === token.sourcePostId); const source = sourcePosts.find((item) => String(item.sourcePostId) === String(token.sourcePostId)); const confirmed = Boolean(token.verifiedOnChain && token.mintAddress); return <div className="token-entry" key={token.id}><button type="button" className="token-row" onClick={() => onOpenToken(token.id)}>{source && <PostScreenshot asset={source} variant="thumb" alt="Source post thumbnail" />}<span className="token-symbol">${token.ticker.slice(0, 3)}</span><span className="token-info"><strong>{token.name}</strong><span>{source ? `Source post ${source.sourcePostId} · ${source.sourceAuthorUsername ? `@${source.sourceAuthorUsername}` : 'author unavailable'}` : `Original post · ${post?.content?.slice(0, 40) || 'source record unavailable'}`}</span></span><span className="token-state">{token.freeDemo ? 'FREE DEMO' : confirmed ? 'DEPLOYED' : 'NOT DEPLOYED'}<small>{token.freeDemo ? 'no wallet required' : confirmed ? `${token.mintAddress.slice(0, 6)}…${token.mintAddress.slice(-4)}` : 'market data unavailable'}</small></span></button>{confirmed && <div className="token-links"><button className="token-explorer-link" type="button" onClick={() => onOpenToken(token.id)}>View Coin</button>{token.pumpFunUrl && <a className="token-explorer-link" href={token.pumpFunUrl} target="_blank" rel="noreferrer">View on pump.fun</a>}</div>}</div>; })}</div></PixelWindow></div>;
}

function TokenDetailWindow({ token, source, post, getAuthor, onOpenPost, onReact, onSharePost, onViewScreenshot, onShare, onCopy, onClose }) {
  const confirmed = Boolean(token.verifiedOnChain && token.mintAddress);
  const asset = source || token;
  const copy = (value, label) => onCopy?.(value, label);
  return <div className="floating-window token-detail-window"><PixelWindow eyebrow={`COIN PAGE · ${token.launchPlatform || 'TWEETMINT'}`} title={`$${token.ticker} · ${token.name}`} onClose={onClose}><div className="token-detail"><div className="token-detail-source"><PostScreenshot asset={asset} alt="Preserved original source post screenshot" />{post && <section className="token-source-post" aria-label="Source post and community activity"><p className="muted">SOURCE POST · REACTIONS · COMMENTS · SHARES</p><PostCard post={post} author={getAuthor(post.authorId)} onOpen={onOpenPost} onReact={onReact} onShare={onSharePost} /></section>}<div className="source-meta"><div><span>SOURCE AUTHOR</span><strong>{source?.sourceAuthorUsername ? `@${source.sourceAuthorUsername}` : post ? `@${getAuthor(post.authorId).username}` : 'Unavailable'}</strong></div><div><span>SOURCE POST ID</span><strong>{source?.sourcePostId || token.sourcePostId || 'Unavailable'}</strong></div><div><span>SOURCE POST TIMESTAMP</span><strong>{source?.sourcePostTimestamp || post?.createdAt || 'Unavailable'}</strong></div><div><span>CAPTURE TIMESTAMP</span><strong>{source?.screenshotCreatedAt || 'Unavailable'}</strong></div><button className="pixel-button" type="button" onClick={() => onViewScreenshot(asset)} disabled={!isScreenshotReady(asset)}><Eye /> View Source Screenshot</button></div></div><div className="token-detail-info"><div className="token-origin-connector"><span>POST SCREENSHOT</span><b>→</b><span>COIN</span></div><div className="token-page-status">{confirmed ? 'LAUNCHED' : token.freeDemo ? 'FREE DEMO · LOCAL ONLY' : 'CONCEPT · NOT DEPLOYED'}</div><h2>{token.name}</h2><div className="token-page-ticker">${token.ticker}</div><dl className="source-meta token-page-meta"><div><dt>LAUNCH PLATFORM</dt><dd>{token.launchPlatform || 'TweetMint local concept'}</dd></div><div><dt>LAUNCH STATUS</dt><dd>{token.launchStatus || token.status || 'not deployed'}</dd></div><div><dt>COST</dt><dd>{token.freeDemo ? 'FREE LOCAL DEMO' : confirmed ? 'Pump.fun costs shown before approval' : 'Not available until confirmed'}</dd></div><div><dt>MINT / CONTRACT</dt><dd>{token.mintAddress ? <button className="copy-value" type="button" onClick={() => copy(token.mintAddress, 'Mint address copied.')}>{token.mintAddress}</button> : 'Not available until confirmed'}</dd></div><div><dt>CREATOR WALLET</dt><dd>{token.creatorWallet || 'Not available'}</dd></div><div><dt>LAUNCH TIMESTAMP</dt><dd>{token.launchTimestamp || token.confirmedAt || 'Not launched'}</dd></div><div><dt>NETWORK</dt><dd>{token.network || 'Solana'}</dd></div></dl><div className="window-actions token-page-actions">{token.pumpFunUrl && <a className="pixel-button primary" href={token.pumpFunUrl} target="_blank" rel="noreferrer"><ExternalLink /> View on pump.fun</a>}{token.mintAddress && <a className="pixel-button" href={token.explorerUrl || `https://explorer.solana.com/address/${encodeURIComponent(token.mintAddress)}`} target="_blank" rel="noreferrer"><ExternalLink /> Solscan / Explorer</a>}{token.mintAddress && <button className="pixel-button" type="button" onClick={() => copy(token.mintAddress, 'Mint address copied.')}><Copy /> Copy Mint Address</button>}{token.sourcePostId && <button className="pixel-button" type="button" onClick={() => copy(token.sourcePostId, 'Source post ID copied.')}><Copy /> Copy Source Post ID</button>}<button className="pixel-button" type="button" onClick={() => onShare(token)}><Send /> Share Coin</button></div>{source?.sourcePostUrl && <a className="wallet-link source-link" href={source.sourcePostUrl} target="_blank" rel="noreferrer">View original X post</a>}</div></div></PixelWindow></div>;
}

function ArchiveWindow({ sourcePosts, tokens, onOpenToken, onClose }) {
  const records = sourcePosts.filter((record) => record.screenshotStatus === 'ready');
  return <div className="floating-window archive-window"><PixelWindow eyebrow="POST ARCHIVE BOARD" title="Preserved source wall" onClose={onClose}><p className="panel-note"><Eye />Saved screenshots stay attached to their source post and open the canonical coin page after launch.</p>{records.length ? <div className="archive-grid">{records.map((record) => { const token = tokens.find((item) => String(item.sourcePostId) === String(record.sourcePostId)); return <button className="archive-card" type="button" key={record.screenshotAssetId || record.sourcePostId} onClick={() => token && onOpenToken(token.id)}><PostScreenshot asset={record} variant="thumb" alt={`Preserved post ${record.sourcePostId}`} /><span><strong>{token ? `$${token.ticker}` : 'SOURCE CAPTURE'}</strong><small>POST {record.sourcePostId}</small><small>{token ? 'OPEN COIN PAGE' : 'AWAITING COIN'}</small></span></button>; })}</div> : <div className="empty-state">No preserved screenshots yet. Open the Mint Station to capture the first source post.</div>}</PixelWindow></div>;
}

function HowItWorksWindow({ onLaunch, onClose }) {
  const sample = useMemo(() => createPostScreenshotAsset({ source: { postId: '1234567890123456789', canonicalUrl: 'https://x.com/tweetmint/status/1234567890123456789' }, preview: { data: { id: '1234567890123456789', text: 'A tiny thought can become a whole coin.', createdAt: '2026-10-12T00:00:00.000Z', author: { id: 'sample-author', name: 'TweetMint Sample', username: 'tweetmint' } } } }), []);
  const steps = [
    ['STEP 1 — FIND A POST', 'User sees a sample X post.'],
    ['STEP 2 — CAPTURE THE POST', 'TweetMint turns the post into a preserved screenshot/photo asset.'],
    ['STEP 3 — CHOOSE A TICKER', 'User defines the token ticker.'],
    ['STEP 4 — LAUNCH ON PUMP.FUN', 'TweetMint prepares the coin launch for wallet approval.'],
    ['STEP 5 — THE POST BECOMES A COIN', 'The screenshot remains tied to the coin forever inside TweetMint.']
  ];
  return <div className="floating-window how-window"><PixelWindow eyebrow="HOW IT WORKS" title="From post to preserved coin" onClose={onClose}><div className="how-content"><div className="how-hero"><PostScreenshot asset={sample} alt="Sample X post preserved as a screenshot" /><div><p>TweetMint preserves the original post as an image, then connects it to a Solana coin launch.</p><p>Every coin keeps its original post identity.</p><p>One screenshot. One source post. One coin.</p></div></div><div className="how-steps">{steps.map(([title, text], index) => <article className="how-step" key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><p>{text}</p></div></article>)}</div><button className="pixel-button primary" type="button" onClick={onLaunch}><Coins /> Open Launch Station</button></div></PixelWindow></div>;
}

function WalletWindow({ wallet, walletState, onConnect, onDisconnect, onRefresh, onCopy, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (wallet) {
    const balance = walletState.balanceStatus === 'loading'
      ? 'FETCHING…'
      : walletState.balanceStatus === 'ready' && Number.isFinite(walletState.solBalance)
        ? `${walletState.solBalance.toFixed(4)} SOL`
        : 'UNAVAILABLE';
    return <div className="wallet-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="floating-window wallet-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><PixelWindow eyebrow="WALLET ACCOUNT" title={wallet.provider} onClose={onClose}><div className="window-body"><p className="panel-note"><Wallet />Connected through the official browser extension. TweetMint never requests private keys, seed phrases, or automatic signatures.</p><div className="wallet-account-status"><span className="wallet-connected-dot" aria-hidden="true" /> CONNECTION · CONNECTED</div><p className="muted">NETWORK · {networkLabel(walletState.network)}</p><p className="muted">PUBLIC ADDRESS</p><a className="wallet-address-full wallet-link" href={getExplorerUrl(wallet.address, walletState.network)} target="_blank" rel="noreferrer">{wallet.address}</a><a className="token-explorer-link" href={getExplorerUrl(wallet.address, walletState.network)} target="_blank" rel="noreferrer">View on Solana Explorer</a><div className="wallet-balance"><span>SOL BALANCE</span><strong>{balance}</strong></div>{walletState.balanceError && <p className="wallet-error">{walletState.balanceError}</p>}<div className="wallet-tokens"><p className="muted">SPL TOKENS</p>{walletState.splTokenStatus === 'loading' ? <span className="wallet-empty">Reading verified holdings…</span> : walletState.splTokenStatus === 'error' ? <span className="wallet-empty">{walletState.splTokenError}</span> : walletState.splTokens.length ? walletState.splTokens.slice(0, 8).map((token) => <div className="wallet-token-row" key={`${token.mint}-${token.amount}`}><span>{token.mint.slice(0, 6)}…{token.mint.slice(-4)}</span><strong>{token.uiAmount}</strong></div>) : <span className="wallet-empty">No verified token holdings returned.</span>}</div><div className="window-actions"><button className="pixel-button" type="button" onClick={() => onCopy(wallet.address)}><Copy /> Copy address</button><button className="pixel-button" type="button" onClick={onRefresh} disabled={walletState.balanceStatus === 'loading'}><RefreshCw /> Refresh balance</button><button className="pixel-button warning" type="button" onClick={onDisconnect} disabled={walletState.disconnecting}>{walletState.disconnecting ? 'Disconnecting…' : 'Disconnect'}</button></div></div></PixelWindow></div></div>;
  }

  const options = walletState.walletOptions.length ? walletState.walletOptions : WALLET_PROVIDERS.map((provider) => ({ ...provider, installed: false }));
  const mobileBrowser = typeof navigator !== 'undefined' && /android|iphone|ipad|mobile/i.test(navigator.userAgent);
  return <div className="wallet-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="floating-window wallet-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><PixelWindow eyebrow="WALLET STATION" title="CONNECT YOUR WALLET" onClose={onClose}><div className="wallet-modal-body"><p className="wallet-modal-subtitle">Connect to the Solana world.</p>{mobileBrowser && <p className="wallet-footnote wallet-mobile-note">Browser extensions connect on supported desktop browsers. Install or open TweetMint on desktop to continue.</p>}<div className="wallet-grid">{options.map((option) => { const connecting = walletState.status === 'connecting' && walletState.selectedProvider === option.id; const icon = typeof option.icon === 'string' ? option.icon : null; return <div className="wallet-option" key={option.id}><button className="wallet-choice" type="button" onClick={() => onConnect(option.id)} disabled={!option.installed || walletState.status === 'connecting'} aria-label={`Connect ${option.name}`}><span className="wallet-icon">{icon ? <img src={icon} alt="" /> : option.name[0]}</span><span>{option.name.toUpperCase()}</span><small className={option.installed ? 'wallet-installed' : ''}>{connecting ? 'CONNECTING…' : option.installed ? 'AVAILABLE' : 'NOT INSTALLED'}</small></button>{!option.installed && <a className="wallet-install-link" href={option.installUrl} target="_blank" rel="noreferrer">Install {option.name}</a>}</div>; })}</div>{walletState.status === 'error' && walletState.connectionError && <p className="wallet-error" role="alert">{walletState.connectionError}</p>}<p className="wallet-footnote">Only Phantom and Solflare are offered. Authorization happens in the selected official extension; no transaction is signed during connection. <a className="wallet-link" href="https://solana.com" target="_blank" rel="noreferrer">Solana</a> · <a className="wallet-link" href="https://phantom.com/download" target="_blank" rel="noreferrer">Phantom</a> · <a className="wallet-link" href="https://solflare.com/" target="_blank" rel="noreferrer">Solflare</a></p></div></PixelWindow></div></div>;
}
