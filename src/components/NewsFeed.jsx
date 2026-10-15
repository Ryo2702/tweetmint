import PixelWindow from './PixelWindow.jsx';
import { ExternalLink } from 'lucide-react';
import { CRYPTO_NEWS, CRYPTO_NEWS_UPDATED } from '../data/cryptoNews.js';

export const SOURCE_LINKS = [
  ['News', 'https://news.google.com/'],
  ['Crypto', 'https://www.coindesk.com/'],
  ['Solana', 'https://solana.com/news'],
  ['Meme coins', 'https://pump.fun/'],
  ['X', 'https://x.com/explore'],
  ['Bluesky', 'https://bsky.app/']
];

export default function NewsFeed({ onClose, embedded = false }) {
  return <div className={embedded ? 'news-feed-embedded' : 'floating-window news-feed-window'}>
    <PixelWindow eyebrow="EXPLORE ORIGINAL SOURCES" title="CRYPTO NEWS & LINKS" onClose={onClose} className="news-feed-panel">
      <div className="news-feed-body">
        <p className="news-community-note">Curated crypto headlines · Updated <time dateTime={CRYPTO_NEWS_UPDATED}>{CRYPTO_NEWS_UPDATED}</time> · Manually updated</p>
        <section aria-label="Recent crypto news">
          {CRYPTO_NEWS.map((story) => <article className="news-card" key={story.url}>
            <div className="news-card-source"><span className="news-source-badge">{story.category}</span><span>{story.publisher}</span></div>
            <h2 className="news-headline"><a href={story.url} target="_blank" rel="noopener noreferrer">{story.title}</a></h2>
            <div className="news-times"><span>Published <time dateTime={story.publishedAt}>{story.publishedAt}</time></span></div>
            <a className="news-original-link" href={story.url} target="_blank" rel="noopener noreferrer">Read on {story.publisher} <ExternalLink size={12} aria-hidden="true" /></a>
          </article>)}
        </section>
        <a className="pixel-button" href="https://www.coindesk.com/latest-crypto-news" target="_blank" rel="noopener noreferrer">More latest crypto news <ExternalLink size={12} /></a>
        <p>Explore more sources</p>
        <div className="news-category-nav">{SOURCE_LINKS.map(([label, url]) => <a key={label} className="pixel-button" href={url} target="_blank" rel="noopener noreferrer">{label} <ExternalLink size={12} /></a>)}</div>
      </div>
    </PixelWindow>
  </div>;
}

export function NewsStats() {
  return <aside className="stats-board news-stats-board"><header>✦ SOURCE LINKS</header><p className="panel-note">Browse news, social posts, and coins on their original websites.</p></aside>;
}

export function NewsAnnouncements() {
  return <aside className="announcement-stack news-announcement-stack"><header>✦ EXPLORE</header><a className="announcement-card" href="https://pump.fun/" target="_blank" rel="noopener noreferrer">Explore coins on pump.fun <ExternalLink size={12} /></a></aside>;
}

export function NewsHistory({ onClose }) {
  return <NewsFeed onClose={onClose} />;
}

export function NewsDetail({ onClose }) {
  return <NewsFeed onClose={onClose} />;
}
