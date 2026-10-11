import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  Coins,
  Copy,
  Feather,
  Flame,
  Gamepad2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  TerminalSquare,
  UserRound,
  Wallet,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PixelWindow from './components/PixelWindow.jsx';
import Avatar from './components/Avatar.jsx';
import PostCard from './components/PostCard.jsx';
import PlazaScene from './world/PlazaScene.jsx';
import { usePlazaUi } from './state/uiStore.js';
import { parseXPostUrl } from './state/xUrl.js';
import {
  REACTION_TYPES,
  TRENDING_FILTERS,
  addComment,
  createInitialSocialState,
  createPost,
  getCommentsForPost,
  getPostById,
  getTrendingPosts,
  reactionTotal,
  recordProfileVisit,
  runAutonomousActivity,
  sharePost,
  toggleReaction
} from './state/socialStore.js';

const STORAGE_KEY = 'tweetmint.local-social-state.v1';
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
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const state = stored ? JSON.parse(stored) : createInitialSocialState();
    return state.currentUser?.displayName === 'Local Demo Visitor'
      ? { ...state, currentUser: { ...state.currentUser, handle: '@mikapixel', displayName: 'Mika Pixel' } }
      : state;
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

function shallowState(state) {
  return JSON.stringify(state);
}

const mintStatusMessages = {
  'invalid-url': 'Enter a complete X post URL.',
  'unsupported-domain': 'Use an x.com or twitter.com post URL.',
  'missing-post-id': 'That link does not contain a numeric X post ID.',
  unavailable: 'Post ID parsed locally, but no X API backend is configured.',
  'api-unavailable': 'Post ID parsed locally, but the X API response was unavailable.',
  'network-failure': 'Post ID parsed locally, but the X API could not be reached.',
  'deleted-post': 'The post ID is valid, but that post is deleted or unavailable.',
  private: 'The post is private or inaccessible to the configured X account.',
  'auth-failure': 'The configured X API credentials were rejected.',
  'rate-limit': 'The X API rate limit was reached. Try again later.'
};

export default function App() {
  const [social, setSocial] = useState(initialState);
  const [composerText, setComposerText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [filter, setFilter] = useState('trending');
  const [wallet, setWallet] = useState(null);
  const [mintUrl, setMintUrl] = useState('');
  const [mintStatus, setMintStatus] = useState('idle');
  const [mintSource, setMintSource] = useState(null);
  const [mintPreview, setMintPreview] = useState(null);
  const [toasts, setToasts] = useState([]);
  const { panel, selectedPostId, selectedCharacterId, openPanel, closePanel } = usePlazaUi();

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, shallowState(social)); } catch { /* local persistence is best-effort only */ }
  }, [social]);

  useEffect(() => {
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
    schedule('react', 5_000, 20_000);
    schedule('comment', 12_000, 35_000);
    schedule('share', 20_000, 60_000);
    schedule('post', 30_000, 90_000);
    schedule('visit', 7_000, 24_000);
    return () => {
      stopped = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const characters = useMemo(
    () => social.characters.map((character, index) => hydrateCharacter(character, index)),
    [social.characters]
  );
  const currentUser = useMemo(() => hydrateCharacter(social.currentUser, characters.length), [social.currentUser, characters.length]);
  const characterById = useMemo(() => new Map([...characters, currentUser].map((character) => [character.id, character])), [characters, currentUser]);
  const selectedPost = selectedPostId ? getPostById(social, selectedPostId) : null;
  const selectedCharacter = selectedCharacterId ? characterById.get(selectedCharacterId) : null;
  const visiblePosts = useMemo(() => getTrendingPosts(social, filter).slice(0, 12), [social, filter]);
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
    const panelForZone = { terminal: 'composer', feed: 'feed', trending: 'trending', mint: 'mint', trading: 'tokens', lounge: 'community' };
    openPanel(panelForZone[zone] || 'feed');
  };

  const submitPost = () => {
    const content = composerText.trim();
    if (!content) return notify('Write something before publishing.', 'error');
    if (content.length > 500) return notify('Posts are capped at 500 characters.', 'error');
    setSocial((state) => createPost(state, { content }));
    setComposerText('');
    notify('Local post published to this browser’s plaza.');
    closePanel();
  };

  const reactTo = (post, reactionType) => {
    setSocial((state) => toggleReaction(state, { targetType: 'post', targetId: post.id, reactionType }));
    notify(`${reactionEmoji[reactionType]} reaction saved locally.`);
  };

  const reactToComment = (comment, reactionType) => {
    setSocial((state) => toggleReaction(state, { targetType: 'comment', targetId: comment.id, reactionType }));
  };

  const share = async (post, mode = 'repost') => {
    if (mode === 'link') {
      const link = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
      try { await navigator.clipboard.writeText(link); notify('Local post link copied.'); } catch { notify('Copy failed in this browser.', 'error'); }
      return;
    }
    setSocial((state) => sharePost(state, { postId: post.id }));
    notify('Repost saved locally.');
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
    notify('Local comment added to this thread.');
  };

  const updateMintUrl = (value) => {
    setMintUrl(value);
    setMintStatus('idle');
    setMintSource(null);
    setMintPreview(null);
  };

  const pasteMintUrl = async () => {
    try {
      updateMintUrl(await navigator.clipboard.readText());
    } catch {
      notify('Clipboard access was not available.', 'error');
    }
  };

  const checkMintUrl = async () => {
    const parsed = parseXPostUrl(mintUrl);
    if (!parsed.ok) {
      setMintStatus(parsed.reason);
      setMintSource(null);
      setMintPreview(null);
      return;
    }

    setMintUrl(parsed.canonicalUrl);
    setMintSource(parsed);
    setMintPreview(null);
    setMintStatus('loading');

    const apiBase = import.meta.env.VITE_X_API_URL;
    if (!apiBase) {
      setMintStatus('unavailable');
      return;
    }

    try {
      const endpoint = `${apiBase.replace(/\/$/, '')}/posts/${encodeURIComponent(parsed.postId)}`;
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        setMintStatus(response.status === 401 ? 'auth-failure' : response.status === 403 ? 'private' : response.status === 404 ? 'deleted-post' : response.status === 429 ? 'rate-limit' : 'api-unavailable');
        return;
      }
      setMintPreview(await response.json());
      setMintStatus('ready');
    } catch {
      setMintStatus('network-failure');
    }
  };

  const connectWallet = async (provider) => {
    const candidate = provider === 'Phantom' ? window.phantom?.solana : window.solflare;
    if (!candidate?.connect) {
      notify(`${provider} was not detected. Install its official browser extension, then try again.`, 'error');
      return;
    }
    try {
      const response = await candidate.connect();
      const address = (response?.publicKey || candidate.publicKey)?.toString();
      if (!address) throw new Error('No public address returned');
      setWallet({ provider, address });
      closePanel();
      notify(`${provider} connected. Balance remains unavailable until an RPC is configured.`);
    } catch (error) {
      notify(`${provider} connection was not approved.`, 'error');
    }
  };

  const resetLocalWorld = () => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* reset still works in memory */ }
    setSocial(createInitialSocialState());
    notify('The plaza has been reset.');
  };

  const nav = [
    ['world', 'World', Gamepad2], ['feed', 'Feed', MessageCircle], ['trending', 'Trending', Flame], ['mint', 'Launch', Plus], ['tokens', 'Tokens', Coins], ['profile', 'Profile', UserRound]
  ];
  const mobileNav = [
    ['world', 'World', Gamepad2], ['feed', 'Feed', MessageCircle], ['composer', 'Post', Feather], ['mint', 'Launch', Plus], ['tokens', 'Tokens', Coins]
  ];
  const duplicateToken = mintSource && social.tokens.some((token) => token.sourcePostId === mintSource.postId || token.sourcePostUrl === mintSource.canonicalUrl);

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
          <button className="top-action" type="button" onClick={() => openPanel('wallet')}><Wallet size={14} /> {wallet.address.slice(0, 4)}…{wallet.address.slice(-4)}</button>
        ) : (
          <button className="top-action" type="button" onClick={() => openPanel('wallet')}><Wallet size={14} /> Connect wallet</button>
        )}
      </header>

      <section className="world-page">
        <section className="plaza-stage" aria-label="TweetMint Social Plaza">
          <PlazaScene characters={sceneCharacters} onZoneSelect={openZone} onCharacterSelect={showCharacter} />

          <div className="world-banner" aria-hidden="true">
            <p>THE SOCIAL PLAZA</p>
            <h1>EVERY POST IS A <span>COIN.</span></h1>
          </div>

          <aside className="activity-board" aria-label="Recent community activity">
            <header><span>✦ PLAZA PULSE</span><span>LOCAL</span></header>
            <div className="activity-list">
              {social.activity.slice(0, 4).map((activity) => {
                const actor = actorFor(activity.actorId);
                const post = activity.postId ? getPostById(social, activity.postId) : null;
                const visited = activity.characterId ? characterById.get(activity.characterId) : null;
                const activityText = visited ? `visited ${visited.displayName}` : prettify(activity.type);
                return <div className="activity-item" key={activity.id}><span className="activity-dot" /><button type="button" onClick={() => post && showPost(post)}><strong>{actor.displayName}</strong> {activityText}{post ? ` · “${post.content.slice(0, 28)}…”` : ''}</button></div>;
              })}
            </div>
          </aside>

          <nav className="quick-dock" aria-label="World locations">
            <button className="dock-button" type="button" onClick={() => openZone('terminal')}><Feather /> Post</button>
            <button className="dock-button" type="button" onClick={() => openZone('feed')}><MessageCircle /> Feed board</button>
            <button className="dock-button" type="button" onClick={() => openZone('trending')}><Flame /> Trending</button>
            <button className="dock-button" type="button" onClick={() => openZone('mint')}><TerminalSquare /> Mint station</button>
            <button className="dock-button" type="button" onClick={() => openZone('trading')}><Coins /> Coin garden</button>
          </nav>

          <AnimatePresence>
            {panel && panel !== 'world' && (
              <motion.div className="window-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {panel === 'composer' && <ComposerWindow text={composerText} setText={setComposerText} onPublish={submitPost} onClose={closePanel} />}
                {(panel === 'feed' || panel === 'trending' || panel === 'community') && <FeedWindow posts={visiblePosts} filter={filter} setFilter={setFilter} panel={panel} getAuthor={actorFor} onOpen={showPost} onReact={reactTo} onShare={share} onClose={closePanel} />}
                {panel === 'detail' && selectedPost && <DetailWindow post={postForDisplay(selectedPost)} getAuthor={actorFor} social={social} currentUser={currentUser} commentText={commentText} setCommentText={setCommentText} replyingTo={replyingTo} setReplyingTo={setReplyingTo} onComment={submitComment} onReact={reactTo} onReactComment={reactToComment} onShare={share} onClose={closePanel} />}
                {panel === 'profile' && selectedCharacter && <ProfileWindow character={selectedCharacter} posts={social.posts} getAuthor={actorFor} onOpen={showPost} onClose={closePanel} />}
                {panel === 'mint' && <MintWindow value={mintUrl} onChange={updateMintUrl} status={mintStatus} statusMessage={mintStatusMessages[mintStatus]} source={mintSource} preview={mintPreview} duplicate={duplicateToken} onPaste={pasteMintUrl} onClear={() => updateMintUrl('')} onCheck={checkMintUrl} onClose={closePanel} />}
                {panel === 'tokens' && <TokensWindow tokens={social.tokens} posts={social.posts} onOpen={showPost} onClose={closePanel} />}
                {panel === 'wallet' && <WalletWindow wallet={wallet} onConnect={connectWallet} onDisconnect={() => { setWallet(null); notify('Wallet disconnected from this browser.'); }} onClose={closePanel} />}
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

function ComposerWindow({ text, setText, onPublish, onClose }) {
  return <div className="floating-window composer-window"><PixelWindow eyebrow="POST TERMINAL" title="Compose for the plaza" onClose={onClose}><div className="window-body"><p className="panel-note"><TerminalSquare />This creates a browser-local post only. It is not published to X or a shared service.</p><textarea className="composer-textarea" value={text} maxLength="500" placeholder="What is happening in the plaza?" onChange={(event) => setText(event.target.value)} /><div className="composer-footer"><span className="counter">{text.length}/500</span><button className="pixel-button primary" type="button" onClick={onPublish}><Send /> Publish local post</button></div></div></PixelWindow></div>;
}

function FeedWindow({ posts, filter, setFilter, panel, getAuthor, onOpen, onReact, onShare, onClose }) {
  const title = panel === 'community' ? 'Social Lounge' : panel === 'trending' ? 'Trending Wall' : 'Community Feed';
  return <div className="floating-window feed-window"><PixelWindow eyebrow={panel === 'trending' ? 'TRENDING WALL' : 'COMMUNITY FEED BOARD'} title={title} onClose={onClose}><div className="window-body compact"><div className="feed-toolbar">{TRENDING_FILTERS.map((item) => <button key={item} type="button" className={`filter-button ${filter === item ? 'is-active' : ''}`} onClick={() => setFilter(item)}>{prettify(item)}</button>)}</div>{posts.map((post) => <PostCard key={post.id} post={post} author={getAuthor(post.authorId)} onOpen={onOpen} onReact={onReact} onShare={onShare} />)}</div></PixelWindow></div>;
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
  return <div className="floating-window profile-window"><PixelWindow eyebrow="PLAZA MEMBER" title="Profile station" onClose={onClose}><div className="profile-hero"><Avatar character={character} size={52} /><div><h2 className="profile-name">{character.displayName}</h2><div className="profile-handle">{character.username}</div><p className="profile-bio">{character.isFictional ? `${character.personality}. Into ${(character.interests || []).join(', ')}.` : 'Posts are kept in this browser until a server is configured.'}</p></div></div><div className="profile-stats"><div className="profile-stat"><strong>{authored.length}</strong><span>posts</span></div><div className="profile-stat"><strong>{character.isFictional ? 'NPC' : 'LOCAL'}</strong><span>identity</span></div><div className="profile-stat"><strong>—</strong><span>followers</span></div></div><div className="window-body compact">{authored.slice(0, 4).map((post) => <button key={post.id} className="mini-action" type="button" onClick={() => onOpen(post)}>Open: {post.content.slice(0, 42)}…</button>)}</div></PixelWindow></div>;
}

function MintWindow({ value, onChange, status, statusMessage, source, preview, duplicate, onPaste, onClear, onCheck, onClose }) {
  const previewData = preview?.data || preview;
  const author = previewData?.author?.username || previewData?.author?.name || previewData?.username || previewData?.authorName;
  const content = previewData?.text || previewData?.content;
  const parsed = Boolean(source?.postId);
  return <div className="floating-window mint-window"><PixelWindow eyebrow="MINT STATION" title="Canonical launch control" onClose={onClose}><div className="mint-panel"><div className="mint-machine-art"><div className="mint-machine-screen">MINT OFFLINE<small>CONFIGURE SERVER TO ARM</small></div></div><p className="panel-note"><TerminalSquare />X post IDs are parsed locally first. Retrieval, canonical checks, job processing, RPC confirmation, and reply publishing require configured server credentials.</p><label className="muted" htmlFor="x-url">Source X post URL</label><div className="form-row mint-url-row"><input className="field-input" id="x-url" value={value} placeholder="https://x.com/name/status/…" aria-invalid={Boolean(statusMessage && !parsed)} onChange={(event) => onChange(event.target.value)} /><button className="pixel-button" type="button" onClick={onPaste}><Copy /> Paste</button><button className="pixel-button" type="button" onClick={onClear} disabled={!value}><XCircle /> Clear</button><button className="pixel-button warning" type="button" onClick={onCheck} disabled={status === 'loading'}><Search /> {status === 'loading' ? 'Checking…' : 'Check'}</button></div>{status === 'loading' && <div className="status-row"><RefreshCw />Retrieving the post from the configured X API…</div>}{parsed && <div className="status-row success"><Bell />Source ID <code>{source.postId}</code> parsed locally. <a className="wallet-link" href={source.canonicalUrl} target="_blank" rel="noreferrer">View original post</a></div>}{statusMessage && !['loading', 'ready'].includes(status) && <div className={`status-row ${['invalid-url', 'unsupported-domain', 'missing-post-id'].includes(status) ? 'error' : 'warning'}`}><XCircle />{statusMessage}</div>}{duplicate && <div className="status-row warning"><Bell />A canonical TweetMint token is already associated with this source post.</div>}{preview && <article className="post-preview"><p className="muted">X POST PREVIEW</p>{author && <strong>{author}</strong>}{content && <p>{content}</p>}{previewData?.createdAt && <time>{formatCompactDate(previewData.createdAt)}</time>}</article>}{['deleted-post', 'private', 'rate-limit', 'auth-failure', 'network-failure', 'api-unavailable', 'unavailable'].includes(status) && <button className="pixel-button" type="button" onClick={onCheck}><RefreshCw /> Retry lookup</button>}<div className="steps"><div className={`step ${parsed ? 'active' : ''}`}>1 · Local URL parsing</div><div className={`step ${status === 'loading' || status === 'ready' ? 'active' : ''}`}>2 · Authorized X content lookup</div><div className="step blocked">3 · Canonical token constraint</div><div className="step blocked">4 · Confirmed Solana deployment</div></div><button className="pixel-button" type="button" disabled title="Requires configured server-side integrations"><Coins /> Launch unavailable</button></div></PixelWindow></div>;
}

function TokensWindow({ tokens, posts, onOpen, onClose }) {
  return <div className="floating-window tokens-window"><PixelWindow eyebrow="COIN GARDEN" title="Token concepts" onClose={onClose}><p className="panel-note"><Coins />These token concepts are not minted, tradeable, priced, or connected to a wallet.</p><div className="token-list">{tokens.map((token) => { const post = posts.find((item) => item.id === token.sourcePostId); return <button type="button" className="token-row" key={token.id} onClick={() => post && onOpen(post)}><span className="token-symbol">${token.ticker.slice(0, 3)}</span><span className="token-info"><strong>{token.name}</strong><span>Original post · {post?.content.slice(0, 40)}</span></span><span className="token-state">NOT DEPLOYED<small>market data unavailable</small></span></button>; })}</div></PixelWindow></div>;
}

function WalletWindow({ wallet, onConnect, onDisconnect, onClose }) {
  if (wallet) return <div className="floating-window profile-window"><PixelWindow eyebrow="WALLET" title={wallet.provider} onClose={onClose}><div className="window-body"><p className="panel-note"><Wallet />Connected through this browser. No private key, seed phrase, balance, or transaction is requested or displayed.</p><p className="muted">PUBLIC ADDRESS</p><a className="wallet-address wallet-link" href={`https://explorer.solana.com/address/${encodeURIComponent(wallet.address)}`} target="_blank" rel="noreferrer">{wallet.address}</a><p className="muted">SOL BALANCE · UNAVAILABLE (NO RPC CONFIGURED)</p><div className="window-actions"><button className="pixel-button" type="button" onClick={() => navigator.clipboard?.writeText(wallet.address)}> <Copy /> Copy address</button><button className="pixel-button warning" type="button" onClick={onDisconnect}>Disconnect</button></div></div></PixelWindow></div>;
  return <div className="floating-window profile-window"><PixelWindow eyebrow="WALLET SELECT" title="Connect your wallet" onClose={onClose}><div className="wallet-grid"><button className="wallet-choice" type="button" onClick={() => onConnect('Phantom')}><span className="wallet-icon">P</span>Phantom</button><button className="wallet-choice" type="button" onClick={() => onConnect('Solflare')}><span className="wallet-icon">S</span>Solflare</button></div><p className="wallet-footnote">Only Phantom and Solflare are offered. Connection is requested through the provider extension; this browser does not initiate trades or sign transactions. <a className="wallet-link" href="https://solana.com" target="_blank" rel="noreferrer">Solana</a> · <a className="wallet-link" href="https://solflare.com" target="_blank" rel="noreferrer">Solflare</a></p></PixelWindow></div>;
}
