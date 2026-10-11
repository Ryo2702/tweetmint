import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

const WORLD = { width: 1360, height: 760 };

const zones = [
  { id: 'terminal', label: 'POST TERMINAL', x: 250, y: 490, w: 185, h: 95, color: 0xb7ff3c },
  { id: 'feed', label: 'COMMUNITY FEED', x: 472, y: 332, w: 212, h: 102, color: 0x77dbe8 },
  { id: 'trending', label: 'TRENDING WALL', x: 736, y: 205, w: 196, h: 104, color: 0xc393ff },
  { id: 'mint', label: 'MINT MACHINE', x: 80, y: 185, w: 190, h: 150, color: 0xffa14d },
  { id: 'trading', label: 'TRADING CORNER', x: 1045, y: 402, w: 200, h: 105, color: 0xb7ff3c },
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
  return { person, bubble, bubbleText, character, phase: index * 0.72, baseX: character.x, baseY: character.y };
}

export default function PlazaScene({ characters, onZoneSelect, onCharacterSelect }) {
  const host = useRef(null);
  const callbacks = useRef({ onZoneSelect, onCharacterSelect });
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

      zones.forEach((zone) => world.addChild(makeZone(zone)));

      const people = characters.slice(0, 25).map(makeCharacter);
      people.forEach(({ person }) => world.addChild(person));
      let pointerId = null;
      let dragging = false;
      let origin = { x: 0, y: 0 };
      let stageOrigin = { x: 0, y: 0 };
      const pointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        pointerId = event.pointerId;
        dragging = false;
        origin = { x: event.clientX, y: event.clientY };
        stageOrigin = { x: world.x, y: world.y };
        element.setPointerCapture?.(pointerId);
      };
      const pointerMove = (event) => {
        if (pointerId !== event.pointerId) return;
        const deltaX = event.clientX - origin.x;
        const deltaY = event.clientY - origin.y;
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) dragging = true;
        if (dragging) world.position.set(stageOrigin.x + deltaX, stageOrigin.y + deltaY);
      };
      const pointerUp = (event) => {
        if (pointerId !== event.pointerId) return;
        if (!dragging) {
          const bounds = element.getBoundingClientRect();
          const x = (event.clientX - bounds.left - world.x) / world.scale.x;
          const y = (event.clientY - bounds.top - world.y) / world.scale.y;
          const zone = zones.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
          if (zone) callbacks.current.onZoneSelect(zone.id);
          else {
            const match = people.find(({ person }) => Math.abs(person.x - x) < 18 && Math.abs(person.y - y) < 28);
            if (match) callbacks.current.onCharacterSelect(match.character);
          }
        }
        pointerId = null;
        element.releasePointerCapture?.(event.pointerId);
      };
      element.addEventListener('pointerdown', pointerDown);
      element.addEventListener('pointermove', pointerMove);
      element.addEventListener('pointerup', pointerUp);
      element.addEventListener('pointercancel', pointerUp);

      const wheel = (event) => {
        event.preventDefault();
        const next = Math.max(0.52, Math.min(1.25, world.scale.x + (event.deltaY > 0 ? -0.075 : 0.075)));
        world.scale.set(next);
      };
      element.addEventListener('wheel', wheel, { passive: false });

      app.ticker.add(() => {
        const now = performance.now() / 1000;
        people.forEach((entry, index) => {
          const speed = 0.75 + (index % 4) * 0.11;
          entry.person.y = entry.baseY + Math.sin(now * speed + entry.phase) * 2;
          entry.person.x = entry.baseX + Math.cos(now * speed * 0.56 + entry.phase) * 3;
          entry.bubble.visible = index % 7 === Math.floor(now / 3) % 7;
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
      element._tweetmintCleanup = () => element.removeEventListener('wheel', wheel);
      const priorCleanup = element._tweetmintCleanup;
      element._tweetmintCleanup = () => {
        priorCleanup();
        element.removeEventListener('pointerdown', pointerDown);
        element.removeEventListener('pointermove', pointerMove);
        element.removeEventListener('pointerup', pointerUp);
        element.removeEventListener('pointercancel', pointerUp);
      };
    };
    setup();
    return () => {
      destroyed = true;
      if (element?._tweetmintCleanup) element._tweetmintCleanup();
      if (initialized && app) app.destroy(true, { children: true });
    };
  }, [characters]);

  return (
    <div className="plaza-canvas-shell">
      <div ref={host} className="plaza-canvas" />
      <div className="scene-controls" aria-label="World camera controls">
        <button type="button" onClick={() => host.current?._tweetmintZoom?.(0.12)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => host.current?._tweetmintZoom?.(-0.12)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => host.current?._tweetmintReset?.()} aria-label="Reset world view">◎</button>
      </div>
      <p className="scene-hint">DRAG TO PAN · SCROLL TO ZOOM · CLICK A PLACE OR PERSON</p>
    </div>
  );
}
