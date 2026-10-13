import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronDown, ChevronUp, Coins, ExternalLink, MessageCircle, RefreshCw, Share2 } from 'lucide-react';
import PixelWindow from './PixelWindow.jsx';
import { parseXPostUrl } from '../state/xUrl.js';
import {
  NEWS_CATEGORIES, SOURCE_LABELS, formatNewsTime, newsRequest, requestNewsRefresh,
  safeSourceUrl, uniqueFeedItems, useNewsAction, useNewsFeed
} from '../state/newsFeed.js';

const EMOJI = { laugh: '😂', heart: '♥', fire: '🔥', rocket: '🚀', shocked: '😮', skull: '💀' };
const categoryLabel = (category) => NEWS_CATEGORIES.find(([id]) => id === category)?.[1] || String(category || 'NEWS').replaceAll('-', ' ').toUpperCase();

function NewsTime({ value, label }) {
  return <span>{label} <time dateTime={value || undefined} title={value || 'Timestamp not supplied'}>{formatNewsTime(value)}</time></span>;
}

function NewsError({ error }) {
  return error ? <p className="status-row error" role="alert">{error.message || 'News service unavailable. Try again shortly.'}</p> : null;
}

let xWidgets;
function loadXWidgets() {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr.widgets);
  if (!xWidgets) xWidgets = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    const timer = window.setTimeout(() => reject(new Error('X embed timed out.')), 15_000);
    script.onload = () => { window.clearTimeout(timer); window.twttr?.widgets ? resolve(window.twttr.widgets) : reject(new Error('X embed unavailable.')); };
    script.onerror = () => { window.clearTimeout(timer); reject(new Error('X embed unavailable.')); };
    document.head.appendChild(script);
  }).catch((error) => { xWidgets = null; throw error; });
  return xWidgets;
}

function XPreview({ url }) {
  const target = useRef(null);
  const [requested, setRequested] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const parsed = parseXPostUrl(url);
  useEffect(() => {
    if (!requested || !parsed.ok) return;
    let active = true;
    loadXWidgets().then((widgets) => active && target.current ? widgets.createTweet(parsed.postId, target.current, { theme: 'dark', dnt: true }) : null)
      .then((embed) => { if (active && !embed) setUnavailable(true); })
      .catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, [requested, parsed.ok, parsed.postId]);
  if (!parsed.ok) return null;
  return <div className="news-x-preview">
    {!requested && <button type="button" className="pixel-button secondary" onClick={() => setRequested(true)}>Load official X embed</button>}
    {!requested && <small>Loads content from X when requested.</small>}
    {requested && !unavailable && <div ref={target} />}
    {unavailable && <p className="muted">X could not display this post. Use Open Original Source to view the available original.</p>}
  </div>;
}

function NewsComments({ comments = [], loading, error, action }) {
  const inputId = useId();
  const [content, setContent] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    try {
      await action.mutateAsync({ action: 'comment', content: content.trim() });
      setContent('');
    } catch { /* The card displays the mutation error. */ }
  };
  return <section className="news-comments" aria-label="TweetMint comments">
    <h3>COMMENTS IN TWEETMINT</h3>
    <p className="news-community-note">Pixel characters are fictional community members. Their commentary is not source reporting.</p>
    {loading && <p className="muted" role="status">Loading comments…</p>}
    <NewsError error={error} />
    {!loading && !error && !comments.length && <p className="muted">Start the discussion.</p>}
    {comments.map((comment) => <div className="news-comment" key={comment.id}>
      <div className="news-comment-meta"><strong>{comment.actorName || 'TweetMint visitor'}</strong><span className={comment.actorType === 'fictional' ? 'news-fictional' : ''}>{comment.actorType === 'fictional' ? 'FICTIONAL CHARACTER' : 'TWEETMINT VISITOR'}</span></div>
      <p>{comment.content}</p><NewsTime label="Commented" value={comment.createdAt} />
    </div>)}
    <form className="news-comment-compose" onSubmit={submit}>
      <label htmlFor={inputId}>Your TweetMint comment</label>
      <textarea id={inputId} className="composer-textarea" maxLength={1000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Discuss the source story…" required />
      <div><small>{content.length}/1000</small><button type="submit" className="pixel-button primary" disabled={action.isPending || !content.trim()}>Post comment</button></div>
    </form>
  </section>;
}

export function NewsCard({ item: initialItem, onMakeCoin, initiallyExpanded = false, fixedExpanded = false }) {
  const [expanded, setExpanded] = useState(initiallyExpanded || fixedExpanded);
  const [shareStatus, setShareStatus] = useState('');
  const [shareError, setShareError] = useState(null);
  const action = useNewsAction(initialItem.id);
  const detail = useQuery({
    queryKey: ['news', 'item', initialItem.id],
    queryFn: ({ signal }) => newsRequest(`/${encodeURIComponent(initialItem.id)}`, { signal }),
    enabled: expanded
  });
  const item = detail.data?.item || initialItem;
  const original = safeSourceUrl(item.originalUrl || item.canonicalUrl);
  const thumbnail = safeSourceUrl(typeof item.thumbnail === 'string' ? item.thumbnail : item.thumbnail?.url);
  const engagement = item.engagement || {};
  const author = typeof item.author === 'string' ? item.author : item.author?.name || item.author?.handle;
  const react = (reaction) => action.mutate({ action: 'react', reaction });
  const share = async () => {
    if (!original) return;
    setShareError(null);
    setShareStatus('');
    try {
      if (navigator.share) await navigator.share({ title: item.headline, url: original });
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(original);
      await action.mutateAsync({ action: 'share' });
      setShareStatus(navigator.share ? 'Shared and recorded in TweetMint.' : navigator.clipboard?.writeText ? 'Source link copied. Share recorded in TweetMint.' : 'Shared inside TweetMint. Use Open Original Source for the link.');
    } catch (error) { if (error.name !== 'AbortError') setShareError(new Error('Sharing failed. Try again or open the original source.')); }
  };

  return <article className={`news-card${expanded ? ' news-card--expanded' : ''}`}>
    <div className="news-card-source"><span className={`news-source-badge news-source-badge--${item.sourceType}`}>{SOURCE_LABELS[item.sourceType] || 'SOURCE LINK'}</span><span>{categoryLabel(item.category)}</span>{item.editorialLabel && <span className="news-editorial-label">{item.editorialLabel}</span>}</div>
    <div className="news-publisher"><span className="news-publisher-icon" aria-hidden="true">{item.sourceType === 'bluesky' ? '☁' : item.sourceType === 'x' ? '𝕏' : '▤'}</span><strong>{item.sourceName || item.platform || 'Source publication'}</strong><span>{item.platform || 'Web'}</span></div>
    {author && <p className="news-author">By {author}</p>}
    <h2 className="news-headline">{fixedExpanded ? item.headline : <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{item.headline}</button>}</h2>
    <div className="news-times"><NewsTime label="Published" value={item.publishedAt} /><NewsTime label="Discovered" value={item.discoveredAt} /></div>
    {thumbnail && <figure className="news-thumbnail"><img src={thumbnail} alt="Source-provided preview" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true; }} />{item.thumbnail?.attribution && <figcaption>{item.thumbnail.attribution}</figcaption>}</figure>}
    {item.summary && <p className={`news-summary${expanded ? '' : ' news-summary--preview'}`}>{item.summary}</p>}
    {expanded && !item.summary && <p className="news-summary muted">This source does not supply a permitted summary. Read the original for context.</p>}
    {item.availability && item.availability !== 'available' && <p className="news-availability">Source status: {item.availability}. This cached record retains its original timestamps.</p>}
    <div className="news-source-actions">
      {original ? <a className="news-original-link" href={original} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} aria-hidden="true" /> Open Original Source</a> : <span className="news-availability">Original link unavailable.</span>}
      {!fixedExpanded && <button type="button" className="mini-action" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}{expanded ? 'Close preview' : 'Read preview'}</button>}
    </div>
    {expanded && <div className="news-source-inspector"><span>SOURCE IDENTITY</span><code>{original || 'Unavailable'}</code>{item.externalId && <small>Provider ID: {item.externalId}</small>}</div>}
    <footer className="news-engagement" aria-label="TweetMint engagement">
      <span className="news-engagement-label">TWEETMINT REACTIONS · COMMENTS · SHARES</span>
      <div className="news-reactions">{Object.entries(EMOJI).map(([reaction, emoji]) => <button key={reaction} type="button" className={`reaction-button${engagement.viewerReaction === reaction ? ' is-active' : ''}`} aria-label={`TweetMint ${reaction} reaction, ${engagement.reactions?.[reaction] || 0}`} aria-pressed={engagement.viewerReaction === reaction} disabled={action.isPending} onClick={() => react(reaction)}><span aria-hidden="true">{emoji}</span><small>{engagement.reactions?.[reaction] || 0}</small></button>)}</div>
      <div className="news-card-actions">
        <button className="mini-action" type="button" onClick={() => setExpanded(true)} aria-label={`Read ${engagement.comments || 0} TweetMint comments`}><MessageCircle aria-hidden="true" /> {engagement.comments || 0}</button>
        <button className="mini-action" type="button" onClick={share} disabled={action.isPending || !original}><Share2 aria-hidden="true" /> Share {engagement.shares || 0}</button>
        <button className={`mini-action${engagement.bookmarked ? ' is-active' : ''}`} type="button" onClick={() => action.mutate({ action: 'bookmark' })} disabled={action.isPending} aria-pressed={!!engagement.bookmarked}><Bookmark aria-hidden="true" /> {engagement.bookmarked ? 'Saved' : 'Save'}</button>
        <button className="pixel-button primary news-make-coin" type="button" onClick={() => onMakeCoin?.(item)} disabled={!original || !onMakeCoin}><Coins aria-hidden="true" /> MAKE IT A COIN</button>
      </div>
    </footer>
    {shareStatus && <p className="news-action-status" role="status">{shareStatus}</p>}
    <NewsError error={action.error || shareError} />
    {expanded && item.sourceType === 'x' && original && <XPreview url={original} />}
    {expanded && <NewsComments comments={detail.data?.comments} loading={detail.isPending} error={detail.error} action={action} />}
  </article>;
}

function MemeDiscovery({ onBrowse, onOpen }) {
  const query = useQuery({ queryKey: ['news', 'meme-preview'], queryFn: ({ signal }) => newsRequest('?category=viral&limit=3', { signal }) });
  const items = query.data?.items?.slice(0, 2) || [];
  return <section className="news-meme-discovery" aria-label="Meme discovery">
    <div><strong>☻ MEME DISCOVERY</strong><button className="mini-action" type="button" onClick={onBrowse}>Browse viral →</button></div>
    {items.map((item) => <button type="button" key={item.id} onClick={() => onOpen(item.id)}><span>{item.headline}</span><small>{item.sourceName} · Published {formatNewsTime(item.publishedAt)}</small></button>)}
    {!items.length && <p>{query.isPending ? 'Checking permitted meme and internet culture sources…' : 'New meme and internet culture coverage will appear when sources publish it.'}</p>}
  </section>;
}

export default function NewsFeed({ onMakeCoin, onClose, onOpenHistory, initialCategory = 'for-you', embedded = false, connection }) {
  const [category, setCategory] = useState(initialCategory);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState('');
  const client = useQueryClient();
  const query = useNewsFeed(category);
  const refresh = useMutation({
    mutationFn: requestNewsRefresh,
    onSuccess: () => { client.invalidateQueries({ queryKey: ['news'] }); setRefreshStatus('Feed refreshed. External sources are checked centrally on their scheduled intervals.'); }
  });
  const page = query.data?.pages[0];
  const items = uniqueFeedItems(query.data?.pages);
  const stale = page?.lastUpdated && Date.now() - Date.parse(page.lastUpdated) > 30 * 60_000;
  const sources = page?.sources || [];
  const sourceErrors = sources.filter((source) => source.enabled && source.status === 'error');
  const changeCategory = (value) => { setCategory(value); setSelectedItemId(null); setRefreshStatus(''); };
  useEffect(() => { setCategory(initialCategory); }, [initialCategory]);

  return <div className={embedded ? 'news-feed-embedded' : 'floating-window news-feed-window'}>
    <PixelWindow eyebrow="REAL SOURCES · PIXEL COMMUNITY" title="NEWS & VIRAL FEED" onClose={onClose} className="news-feed-panel">
      <div className="news-feed-body">
        <nav className="news-category-nav" aria-label="News categories">{NEWS_CATEGORIES.map(([id, label]) => <button type="button" className={`filter-button${category === id ? ' is-active' : ''}`} aria-pressed={category === id} key={id} onClick={() => changeCategory(id)}>{label}</button>)}</nav>
        <NewsStats compact onFilter={changeCategory} />
        <div className="news-feed-status"><span>{page?.lastUpdated ? <NewsTime label={stale ? 'Cached · last updated' : 'Last discovery'} value={page.lastUpdated} /> : 'Waiting for the first successful source fetch.'}</span><button type="button" className="mini-action" onClick={() => refresh.mutate()} disabled={refresh.isPending}><RefreshCw aria-hidden="true" />{refresh.isPending ? 'Checking…' : 'Refresh'}</button><button type="button" className={`mini-action${category === 'bookmarks' ? ' is-active' : ''}`} aria-pressed={category === 'bookmarks'} onClick={() => changeCategory(category === 'bookmarks' ? 'for-you' : 'bookmarks')}><Bookmark aria-hidden="true" />Saved</button>{onOpenHistory && <button type="button" className="mini-action" onClick={onOpenHistory}>✦ Events</button>}</div>
        {connection === 'reconnecting' && <p className="news-cache-note" role="status">Live connection interrupted. Viewing cached feed while reconnecting.</p>}
        {(stale || sourceErrors.length > 0) && <p className="news-cache-note">{stale ? 'Showing cached stories with their original publication times. ' : ''}{sourceErrors.length > 0 ? `${sourceErrors.length} source${sourceErrors.length === 1 ? '' : 's'} temporarily unavailable. Automatic retries continue.` : ''}</p>}
        {refreshStatus && <p className="news-action-status" role="status">{refreshStatus}</p>}
        <NewsError error={refresh.error || query.error} />
        {sources.length > 0 && <details className="news-source-status"><summary>Source status · {sources.filter((source) => source.status === 'ready').length} ready</summary>{sources.map((source) => <div key={source.id || source.name}><strong>{source.name}</strong><span>{source.status === 'error' ? 'Temporarily unavailable' : source.status}</span><small>Last success: {formatNewsTime(source.lastSuccessAt)}</small></div>)}</details>}
        {category === 'for-you' && !selectedItemId && <MemeDiscovery onBrowse={() => changeCategory('viral')} onOpen={setSelectedItemId} />}
        {category === 'viral' && <p className="news-category-note">☻ MEME DISCOVERY · Source-linked memes, viral moments, and internet culture. Previews are shown only when display is permitted.</p>}
        {category === 'trump' && <p className="news-category-note">Published coverage and attributable public statements. Labels reflect available headline and category metadata; open the source for context. Opinions and claims are not verified facts.</p>}
        {category === 'meme-coins' && <p className="news-category-note">Source coverage does not establish that a token is legitimate or safe.</p>}
        {category === 'famous-people' && <p className="news-category-note">Actual public posts and published reporting. Named figures are not TweetMint community authors.</p>}
        {query.isPending && <div className="news-empty" role="status"><span aria-hidden="true">▤</span><strong>Discovering published stories…</strong><p>The backend is checking publicly accessible sources.</p></div>}
        {!query.isPending && !items.length && <div className="news-empty"><span aria-hidden="true">▤</span><strong>{category === 'bookmarks' ? 'No saved stories yet.' : query.error ? 'The news service is unavailable.' : 'No published stories here yet.'}</strong><p>{category === 'bookmarks' ? 'Save a story to revisit it here.' : 'New source discoveries will appear automatically. You can check source status or refresh the cached feed.'}</p></div>}
        {selectedItemId ? <><button type="button" className="pixel-button news-back-button" onClick={() => setSelectedItemId(null)}>← Return to feed</button><NewsDetail itemId={selectedItemId} onMakeCoin={onMakeCoin} embedded /></> : <div className="news-items">{items.map((item) => <NewsCard key={item.id} item={item} onMakeCoin={onMakeCoin} />)}</div>}
        {!selectedItemId && query.hasNextPage && <button type="button" className="pixel-button news-load-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'Load more stories'}</button>}
        {!selectedItemId && !!items.length && !query.hasNextPage && <p className="news-end-note">{query.data?.pages.length >= 5 ? 'Showing five pages. Choose a category to discover more.' : 'You have reached the available stories in this view.'}</p>}
      </div>
    </PixelWindow>
  </div>;
}

export function NewsStats({ onFilter, compact = false }) {
  const query = useQuery({ queryKey: ['news', 'stats'], queryFn: ({ signal }) => newsRequest('/stats', { signal }) });
  const stats = query.data || {};
  const entries = [
    ['Articles today', stats.articlesToday, 'latest'], ['Crypto today', stats.cryptoToday, 'crypto'],
    ['Solana today', stats.solanaToday, 'solana'], ['Viral today', stats.viralToday, 'viral'],
    ['Comments today', stats.commentsToday], ['Reactions today', stats.reactionsToday], ['Verified coins', stats.verifiedCoins]
  ];
  return <aside className={compact ? 'news-stats-compact' : 'stats-board news-stats-board'} aria-label="Database news and TweetMint statistics" title="Discovery and community activity today in UTC; verified coin launches are counted over all time.">
    {!compact && <header><span>✦ NEWS & TWEETMINT</span><span>UTC TODAY</span></header>}
    <div className={compact ? 'news-stats-inline' : 'stats-grid'}>{entries.map(([label, value, category]) => {
      const content = <><strong>{Number.isFinite(value) ? value.toLocaleString() : '—'}</strong><span>{label}</span></>;
      return category && onFilter ? <button type="button" className="stat-item" key={label} title={`Show ${categoryLabel(category)} stories`} onClick={() => onFilter(category)}>{content}</button> : <div className="stat-item" key={label}>{content}</div>;
    })}</div>
    {query.error && <p className="news-stats-unavailable">Statistics temporarily unavailable.</p>}
    {!compact && <small className="news-stats-footer">Discovery & in-app activity today (UTC) · verified coin launches counted over all time.</small>}
  </aside>;
}

function useAnnouncements() {
  return useQuery({ queryKey: ['news', 'announcements'], queryFn: ({ signal }) => newsRequest('/announcements', { signal }) });
}

const announcementText = (announcement) => announcement.title || announcement.text || announcement.content || announcement.message || 'Source update';

export function NewsAnnouncements({ onOpen, onHistory }) {
  const query = useAnnouncements();
  const announcements = query.data?.announcements || [];
  return <aside className="announcement-stack news-announcement-stack" aria-label="Source event announcements">
    <header><span>✦ SOURCE EVENTS</span>{onHistory && <button type="button" onClick={onHistory}>history</button>}</header>
    {announcements.slice(0, 3).map((announcement) => <button type="button" key={announcement.id} className="announcement-card" onClick={() => onOpen?.(announcement.itemId)} disabled={!announcement.itemId}><span className="announcement-icon" aria-hidden="true">✦</span><span><strong>{String(announcement.type || 'NEWS UPDATE').replaceAll('-', ' ').toUpperCase()}</strong>{announcementText(announcement)}<time dateTime={announcement.createdAt}>{formatNewsTime(announcement.createdAt)}</time></span></button>)}
    {!announcements.length && <p className="news-announcement-empty">{query.isPending ? 'Checking source events…' : query.error ? 'Source events temporarily unavailable.' : 'Announcements appear when qualifying published events arrive.'}</p>}
  </aside>;
}

export function NewsHistory({ onOpen, onClose }) {
  const query = useAnnouncements();
  return <div className="floating-window announcements-window"><PixelWindow eyebrow="ACTUAL SOURCE EVENTS" title="ANNOUNCEMENT HISTORY" onClose={onClose}><div className="window-body"><NewsError error={query.error} />{query.data?.announcements?.map((announcement) => <button type="button" className="announcement-history-item" key={announcement.id} onClick={() => onOpen?.(announcement.itemId)} disabled={!announcement.itemId}><span>{announcementText(announcement)}</span><time dateTime={announcement.createdAt}>{formatNewsTime(announcement.createdAt)}</time></button>)}{!query.data?.announcements?.length && <p className="muted">{query.isPending ? 'Loading announcements…' : 'No qualifying source events recorded yet.'}</p>}</div></PixelWindow></div>;
}

export function NewsDetail({ itemId, onMakeCoin, onClose, embedded = false }) {
  const query = useQuery({ queryKey: ['news', 'item', itemId], queryFn: ({ signal }) => newsRequest(`/${encodeURIComponent(itemId)}`, { signal }), enabled: !!itemId });
  const content = <><NewsError error={query.error} />{query.isPending && <p className="muted" role="status">Loading original source record…</p>}{query.data?.item && <NewsCard key={itemId} item={query.data.item} onMakeCoin={onMakeCoin} fixedExpanded />}</>;
  return embedded ? <div className="news-inline-detail">{content}</div> : <div className="floating-window detail-window news-detail-window"><PixelWindow eyebrow="PRESERVED SOURCE IDENTITY" title="STORY & TWEETMINT DISCUSSION" onClose={onClose}><div className="window-body">{content}</div></PixelWindow></div>;
}
