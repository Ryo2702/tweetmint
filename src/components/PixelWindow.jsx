import { X } from 'lucide-react';

export function PixelWindow({ title, eyebrow, onClose, children, className = '' }) {
  const classes = ['pixel-window', className].filter(Boolean).join(' ');

  return (
    <section className={classes} aria-label={title || eyebrow || 'TweetMint panel'}>
      {(title || eyebrow || onClose) && (
        <header className="pixel-window-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <span className="window-title">{title}</span>}
          </div>
          {onClose && (
            <button className="window-close" type="button" onClick={onClose} aria-label={`Close ${title || 'panel'}`}>
              <X size={15} strokeWidth={3} aria-hidden="true" />
            </button>
          )}
        </header>
      )}
      <div className="pixel-window-content">{children}</div>
    </section>
  );
}

export default PixelWindow;
