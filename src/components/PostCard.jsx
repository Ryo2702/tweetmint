import { MessageCircle, Repeat2, Send, Sparkles } from 'lucide-react';
import Avatar from './Avatar.jsx';

const REACTION_EMOJI = {
  laugh: '😂',
  heart: '♥',
  fire: '🔥',
  rocket: '🚀',
  shocked: '😮',
  crying: '😭',
  skull: '💀',
  bullish: '🐂',
  bearish: '🐻'
};

function countFor(counts, type) {
  const value = counts?.[type];
  return Number.isFinite(value) ? value : 0;
}

function relativeTime(value) {
  if (!value) return '';
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
  return String(value);
}

export function PostCard({
  post = {},
  author = post.author || {},
  reactionCounts = post.reactionCounts || post.reactions || {},
  reactionActions = ['laugh', 'heart', 'fire', 'rocket'],
  onOpen,
  onReact,
  onShare,
  dense = false
}) {
  const content = post.content || post.text || '';
  const commentCount = post.commentCount ?? post.commentsCount ?? (Array.isArray(post.comments) ? post.comments.length : 0);
  const shareCount = post.shareCount ?? post.sharesCount ?? post.reposts ?? 0;
  const token = post.token || post.tokenTicker;
  const time = relativeTime(post.createdAt || post.timestamp || post.time);
  const open = () => onOpen?.(post);
  const openFromKeyboard = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && onOpen) {
      event.preventDefault();
      open();
    }
  };

  return (
    <article className={`post-card${dense ? ' post-card--dense' : ''}`}>
      <div
        className="post-head"
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={onOpen ? open : undefined}
        onKeyDown={openFromKeyboard}
        aria-label={onOpen ? `Open post by ${author.displayName || author.username || 'community member'}` : undefined}
      >
        <Avatar character={author} size={dense ? 'small' : 30} showStatus={!dense} />
        <div className="post-author">
          <div className="post-author-line">
            <strong className="post-name">{author.displayName || author.name || author.username || 'Anonymous'}</strong>
            {author.username && <span className="post-handle">@{String(author.username).replace(/^@/, '')}</span>}
            {time && <time className="post-time">{time}</time>}
          </div>
        </div>
      </div>
      <p className="post-content">{content}</p>
      {token && <span className="post-token"><Sparkles size={12} aria-hidden="true" /> {typeof token === 'string' ? token : token.ticker || token.symbol || 'TOKEN'}</span>}

      <footer className="post-actions" aria-label="Post actions">
        <span>
          {reactionActions.filter((type) => REACTION_EMOJI[type]).map((type) => {
            const count = countFor(reactionCounts, type);
            return (
              <button
                className={`mini-action${post.viewerReaction === type || post.reaction === type ? ' is-active' : ''}`}
                type="button"
                key={type}
                onClick={() => onReact?.(post, type)}
                aria-label={`React ${type}${count ? `, ${count}` : ''}`}
              >
                <span aria-hidden="true">{REACTION_EMOJI[type]}</span>
                {count > 0 && <b>{count}</b>}
              </button>
            );
          })}
        </span>
        <span>
          <button className="mini-action" type="button" onClick={open} aria-label={`${commentCount} comments`}><MessageCircle aria-hidden="true" /> <b>{commentCount}</b></button>
          <button className="mini-action" type="button" onClick={() => onShare?.(post)} aria-label={`Share post${shareCount ? `, ${shareCount} shares` : ''}`}><Repeat2 aria-hidden="true" /> <b>{shareCount}</b></button>
          <button className="mini-action" type="button" onClick={() => onShare?.(post, 'link')} aria-label="Copy post link"><Send aria-hidden="true" /></button>
        </span>
      </footer>
    </article>
  );
}

export default PostCard;
