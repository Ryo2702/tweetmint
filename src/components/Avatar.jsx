const DEFAULT_COLORS = {
  skin: '#d99b78',
  hair: '#26251f',
  color: '#b7ff3c'
};

export function Avatar({ character = {}, size = 'default', showStatus = false }) {
  const source = character.avatarUrl || character.image || (typeof character.avatar === 'string' ? character.avatar : '');
  const palette = typeof character.palette === 'object' ? character.palette : {};
  const paletteColor = typeof character.palette === 'string' ? character.palette : palette.color;
  const colors = {
    ...DEFAULT_COLORS,
    ...palette,
    skin: character.skin || palette.skin || DEFAULT_COLORS.skin,
    hair: character.hairColor || palette.hair || DEFAULT_COLORS.hair,
    color: character.color || paletteColor || DEFAULT_COLORS.color
  };
  const status = character.status || character.currentActivity;
  const isSmall = size === 'small' || (typeof size === 'number' && size <= 28);
  const pixelSize = typeof size === 'number' ? `${size}px` : undefined;

  return (
    <span
      className={`pixel-avatar${isSmall ? ' small' : ''}`}
      style={pixelSize ? { width: pixelSize, height: pixelSize } : undefined}
      title={character.displayName || character.username}
    >
      {source ? (
        <img className="avatar-image" src={source} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
      ) : (
        <>
          <span className="avatar-hair" style={{ background: colors.hair }} aria-hidden="true" />
          <span className="avatar-face" style={{ background: colors.skin }} aria-hidden="true" />
          <span className="avatar-body" style={{ background: colors.color }} aria-hidden="true" />
        </>
      )}
      {showStatus && status && <span aria-label={status} title={status} style={{ position: 'absolute', right: '-2px', bottom: '-2px', width: '8px', height: '8px', background: '#b8ff3b', border: '1px solid #10140e' }} />}
    </span>
  );
}

export default Avatar;
