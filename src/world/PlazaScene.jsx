import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

const WORLD = { width: 1360, height: 760 };

const activityBubble = {
  'post-created': 'sit · type',
  'comment-created': 'replying...',
  'post-shared': '↗ share',
  'post-read': 'reading',
  'browse-trending': 'trend',
  'browse-coins': 'coins',
  'conversation-started': 'chat',
  'profile-visited': 'visit',
};
const reactionBubble = { laugh: 'haha', heart: '♥', fire: '🔥', rocket: '🚀', shocked: '😮', crying: '😭', skull: '💀' };
const newsLabels = {
  crypto: 'New crypto news!',
  solana: 'New Solana story!',
  'meme-coins': 'New meme coverage!',
  trump: 'New Trump story!',
  viral: 'New internet story!',
  'famous-people': 'New public figure story!',
  technology: 'New tech story!',
};

export function newsActivityBubble(event) {
  if (event?.type === 'news-read' && event.cached) return 'reading the source';
  if (event?.type === 'news-read') return Object.hasOwn(newsLabels, event.category) ? newsLabels[event.category] : 'New source story!';
  if (event?.type === 'news-react') return Object.hasOwn(reactionBubble, event.reactionType) ? reactionBubble[event.reactionType] : event.category === 'viral' ? 'haha' : '♥';
  if (event?.type === 'news-comment') return 'checking the source';
  if (event?.type === 'news-share') return '↗ shared source';
  return '';
}

const actionFocus = {
  'post-created': [340, 540],
  'comment-created': [340, 540],
  'post-read': [575, 385],
  'post-shared': [575, 385],
  'browse-trending': [820, 260],
  'browse-coins': [1135, 455],
  archive: [1110, 610],
  'conversation-started': [1080, 240],
  'news-read': [575, 455],
  'news-react': [575, 455],
  'news-comment': [575, 455],
  'news-share': [575, 455],
};

const zones = [
  { id: 'terminal', label: 'POST TERMINAL', x: 250, y: 490, w: 185, h: 95, color: 0xb7ff3c },
  { id: 'feed', label: 'COMMUNITY FEED', x: 472, y: 332, w: 212, h: 102, color: 0x77dbe8 },
  { id: 'trending', label: 'TRENDING WALL', x: 736, y: 205, w: 196, h: 104, color: 0xc393ff },
  { id: 'mint', label: 'MINT MACHINE', x: 80, y: 185, w: 190, h: 150, color: 0xffa14d },
  { id: 'wallet', label: 'WALLET STATION', x: 35, y: 380, w: 190, h: 88, color: 0x77dbe8 },
  { id: 'trading', label: 'TRADING CORNER', x: 1045, y: 402, w: 200, h: 105, color: 0xb7ff3c },
  { id: 'archive', label: 'POST ARCHIVE BOARD', x: 1015, y: 560, w: 260, h: 104, color: 0xffb765 },
  { id: 'lounge', label: 'SOCIAL LOUNGE', x: 972, y: 185, w: 218, h: 106, color: 0xc393ff }
];

function rect(graphics, x, y, width, height, color, alpha = 1) {
  graphics.rect(x, y, width, height).fill({ color, alpha });
  return graphics;
}

function makeZone(zone) {
  const node = new Container();
  const pad = new Graphics();
  const border = new Graphics();
  rect(pad, 0, 0, zone.w, zone.h, 0x07100d, 0.56);
  border.rect(0, 0, zone.w, zone.h).stroke({ color: zone.color, width: 2, alpha: 0.92 });
  border.rect(4, 4, zone.w - 8, zone.h - 8).stroke({ color: 0xf6f1d4, width: 1, alpha: 0.18 });
  const sign = new Text({
    text: zone.label,
    style: new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fontWeight: '700',
      fill: zone.color,
      letterSpacing: 1
    })
  });
  sign.x = 10;
  sign.y = 10;
  const sub = new Text({
    text: 'CLICK TO ENTER',
    style: new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: 0xf6f1d4, alpha: 0.75 })
  });
  sub.x = 10;
  sub.y = 28;
  const lamp = new Graphics();
  rect(lamp, zone.w - 27, 14, 11, 11, zone.color);
  rect(lamp, zone.w - 24, 17, 5, 5, 0xf8f1d5);
  node.addChild(pad, border, sign, sub, lamp);
  node.activityLamp = lamp;
  node.activityText = sub;
  node.position.set(zone.x, zone.y);
  return node;
}

function makeCharacter(character, index) {
  const person = new Container();
  const shadow = new Graphics();
  shadow.ellipse(0, 17, 12, 4).fill({ color: 0x050807, alpha: 0.58 });
  const legs = new Graphics();
  rect(legs, -7, 6, 5, 11, 0x111515);
  rect(legs, 2, 6, 5, 11, 0x111515);
  const shirt = new Graphics();
  rect(shirt, -10, -4, 20, 13, character.color);
  rect(shirt, -8, -1, 16, 3, 0xf6f1d4, 0.22);
  const head = new Graphics();
  rect(head, -8, -17, 16, 15, character.skin);
  const hair = new Graphics();
  rect(hair, -9, -20, 18, 7, character.hair);
  const face = new Graphics();
  rect(face, -4, -10, 2, 2, 0x171a17);
  rect(face, 3, -10, 2, 2, 0x171a17);
  const label = new Text({
    text: character.username,
    style: new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: 0xf6f1d4, dropShadow: { color: 0x000000, blur: 0, distance: 1, alpha: 1 } })
  });
  label.anchor.set(0.5, 0);
  label.y = 23;
  const bubble = new Container();
  const bubbleShape = new Graphics();
  rect(bubbleShape, -24, -43, 48, 17, 0xf6f1d4);
  bubbleShape.rect(-3, -28, 6, 4).fill(0xf6f1d4);
  const bubbleText = new Text({
    text: index % 5 === 0 ? 'typing...' : index % 4 === 0 ? 'haha' : '',
    style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0x111311 })
  });
  bubbleText.anchor.set(0.5, 0.5);
  bubbleText.y = -34;
  bubble.addChild(bubbleShape, bubbleText);
  bubble.visible = Boolean(bubbleText.text);
  person.addChild(shadow, legs, shirt, head, hair, face, label, bubble);
  person.position.set(character.x, character.y);
  return { person, legs, bubble, bubbleShape, bubbleText, character, phase: index * 0.72, baseX: character.x, baseY: character.y };
}

export default function PlazaScene({ characters, activity = [], newsActivity = [], paused = false, walletConnected = false, onZoneSelect, onCharacterSelect }) {
  const host = useRef(null);
  const pausedRef = useRef(paused);
  const activityByActorRef = useRef(new Map());
  const newsSignalRef = useRef(null);
  const callbacks = useRef({ onZoneSelect, onCharacterSelect });
  pausedRef.current = paused;
  const recentNews = newsActivity
    .filter((event) => {
      const age = Date.now() - Date.parse(event?.createdAt);
      return event?.id && newsActivityBubble(event) && age >= 0 && age < 20_000;
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  newsSignalRef.current = recentNews[0] || null;
  activityByActorRef.current = new Map(
    [...recentNews, ...activity]
      .reduce((entries, event) => {
        const actorId = event?.actorId || event?.characterId;
        if (actorId && !entries.some(([id]) => id === actorId)) entries.push([actorId, event]);
        return entries;
      }, []),
  );
  callbacks.current = { onZoneSelect, onCharacterSelect };

  useEffect(() => {
    const element = host.current;
    if (!element) return undefined;
    let app;
    let destroyed = false;
    let initialized = false;

    const setup = async () => {
      app = new Application();
      await app.init({
        resizeTo: element,
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2)
      });
      initialized = true;
      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }
      app.canvas.setAttribute('aria-label', 'Interactive TweetMint social plaza');
      element.appendChild(app.canvas);

      const world = new Container();
      const scaleStart = Math.max(0.64, Math.min(0.94, element.clientWidth / WORLD.width));
      world.scale.set(scaleStart);
      world.position.set((element.clientWidth - WORLD.width * scaleStart) / 2, Math.max(-44, (element.clientHeight - WORLD.height * scaleStart) / 2));
      app.stage.addChild(world);

      const paving = new Graphics();
      paving.rect(0, 0, WORLD.width, WORLD.height).fill({ color: 0x0b100f, alpha: 0.12 });
      for (let x = 0; x < WORLD.width; x += 34) paving.moveTo(x, 0).lineTo(x, WORLD.height).stroke({ color: 0xb9b09b, width: 1, alpha: 0.05 });
      for (let y = 0; y < WORLD.height; y += 26) paving.moveTo(0, y).lineTo(WORLD.width, y).stroke({ color: 0xb9b09b, width: 1, alpha: 0.05 });
      world.addChild(paving);

      const sceneZones = zones.map((zone) => zone.id === 'wallet'
        ? { ...zone, label: walletConnected ? 'WALLET CONNECTED' : zone.label, color: walletConnected ? 0xb7ff3c : zone.color }
        : zone);
      let feedBoard;
      sceneZones.forEach((zone) => {
        const node = makeZone(zone);
        if (zone.id === 'feed') feedBoard = node;
        world.addChild(node);
      });

      const people = characters.slice(0, 25).map(makeCharacter);
      people.forEach(({ person }) => world.addChild(person));
      const pointerUp = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left - world.x) / world.scale.x;
        const y = (event.clientY - bounds.top - world.y) / world.scale.y;
        const zone = sceneZones.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
        if (zone) callbacks.current.onZoneSelect(zone.id);
        else {
          const match = people.find(({ person }) => Math.abs(person.x - x) < 18 && Math.abs(person.y - y) < 28);
          if (match) callbacks.current.onCharacterSelect(match.character);
        }
      };
      element.addEventListener('pointerup', pointerUp);

      app.ticker.add(() => {
        if (pausedRef.current) return;
        const now = performance.now() / 1000;
        const newsSignal = newsSignalRef.current;
        if (newsSignal && newsSignal.id !== feedBoard.lastActivityId) {
          feedBoard.lastActivityId = newsSignal.id;
          feedBoard.alertUntil = now + 6;
          feedBoard.activityText.text = newsSignal.type === 'news-read' && !newsSignal.cached ? 'NEW SOURCE STORY' : 'COMMUNITY READING';
        }
        const boardActive = now < (feedBoard.alertUntil || 0);
        feedBoard.activityLamp.alpha = boardActive ? 0.65 + Math.sin(now * 8) * 0.35 : 1;
        if (!boardActive && feedBoard.activityText.text !== 'CLICK TO ENTER') feedBoard.activityText.text = 'CLICK TO ENTER';
        people.forEach((entry, index) => {
          const speed = 0.75 + (index % 4) * 0.11;
          const event = activityByActorRef.current.get(entry.character.id);
          const eventTime = event ? Date.parse(event.createdAt) : NaN;
          const isFresh = Number.isFinite(eventTime) && Date.now() - eventTime >= 0 && Date.now() - eventTime < 12_000;
          const isNews = Boolean(newsActivityBubble(event));
          if (event && event.id !== entry.lastActivityId) {
            entry.lastActivityId = event.id;
            entry.actionUntil = now + (isNews ? 10 : 5);
            entry.actionStarted = now;
          }
          const isActing = Boolean(event && now < (entry.actionUntil || 0));
          const focus = actionFocus[event?.type];
          const elapsed = now - (entry.actionStarted || 0);
          const travel = !isActing ? 0 : isNews
            ? Math.max(0, Math.min(1, elapsed / 3, (10 - elapsed) / 3))
            : Math.sin(Math.min(1, Math.max(0, elapsed / 5)) * Math.PI);
          const focusX = !focus ? 0 : isNews
            ? (focus[0] + (index % 3 - 1) * 22 - entry.baseX) * travel
            : Math.max(-42, Math.min(42, focus[0] - entry.baseX)) * travel;
          const focusY = !focus ? 0 : isNews
            ? (focus[1] + index % 3 * 8 - entry.baseY) * travel
            : Math.max(-30, Math.min(30, focus[1] - entry.baseY)) * travel;
          entry.person.y = entry.baseY + Math.sin(now * speed + entry.phase) * 2 + focusY;
          entry.person.x = entry.baseX + Math.cos(now * speed * 0.56 + entry.phase) * 3 + focusX;
          entry.person.scale.y = isActing && event.type === 'post-created' ? 0.86 : 1;
          entry.legs.x = isNews && isActing && travel < 1 ? Math.sin(now * 12 + entry.phase) * 2 : 0;
          entry.person.rotation = isNews && isActing && event.type === 'news-read' && travel === 1 ? Math.sin(now * 2) * 0.035 : 0;
          const actionText = event && (isFresh || now < (entry.actionUntil || 0))
            ? isNews && event.type === 'news-read' && elapsed >= 3 && elapsed < 7
              ? 'reading the source'
              : newsActivityBubble(event) || (event.type === 'reaction-added' ? reactionBubble[event.reactionType] || '♥' : activityBubble[event.type])
            : '';
          const nextBubbleText = actionText || (index % 5 === 0 ? 'typing...' : index % 4 === 0 ? 'haha' : '');
          if (entry.bubbleText.text !== nextBubbleText) {
            entry.bubbleText.text = nextBubbleText;
            const width = Math.max(48, entry.bubbleText.width + 12);
            entry.bubbleShape.clear();
            rect(entry.bubbleShape, -width / 2, -43, width, 17, 0xf6f1d4);
            rect(entry.bubbleShape, -3, -28, 6, 4, 0xf6f1d4);
          }
          entry.bubble.visible = Boolean(actionText) || (index % 7 === Math.floor(now / 3) % 7 && Boolean(entry.bubbleText.text));
        });
      });

      const reset = () => {
        gsap.to(world, { x: (element.clientWidth - WORLD.width * scaleStart) / 2, y: Math.max(-44, (element.clientHeight - WORLD.height * scaleStart) / 2), duration: 0.35 });
        gsap.to(world.scale, { x: scaleStart, y: scaleStart, duration: 0.35 });
      };
      element.dataset.reset = 'ready';
      element._tweetmintReset = reset;
      element._tweetmintZoom = (amount) => {
        const next = Math.max(0.52, Math.min(1.25, world.scale.x + amount));
        gsap.to(world.scale, { x: next, y: next, duration: 0.16 });
      };
      element._tweetmintCleanup = () => {
        element.removeEventListener('pointerup', pointerUp);
      };
    };
    setup();
    return () => {
      destroyed = true;
      if (element?._tweetmintCleanup) element._tweetmintCleanup();
      if (initialized && app) app.destroy(true, { children: true });
    };
  }, [characters, walletConnected]);

  return (
    <div className="plaza-canvas-shell">
      <div ref={host} className="plaza-canvas" />
      <div className="scene-controls" aria-label="World camera controls">
        <button type="button" onClick={() => host.current?._tweetmintZoom?.(0.12)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => host.current?._tweetmintZoom?.(-0.12)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => host.current?._tweetmintReset?.()} aria-label="Reset world view">◎</button>
      </div>
      <p className="scene-hint">FICTIONAL CHARACTERS · CLICK A PLACE OR PERSON · USE CONTROLS TO ZOOM</p>
    </div>
  );
}
