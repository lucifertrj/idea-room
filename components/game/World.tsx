'use client';
import {useEffect,useRef} from 'react';
import {findPath,walkable} from '../../lib/navigation';
import {rooms,Room} from '../../lib/rooms';
import {teams,Member} from '../../lib/teams';
import {useWorldStore} from '../../lib/world-store';
import {createPixelCharacterCanvas,createEmoteCanvas} from '../../lib/pixel-characters';

interface WorldProps {
  onEnter: (roomId: string) => void;
  onArrive: (roomId: string, memberId?: string) => void;
  onSelectMember?: (room: Room, member: Member) => void;
}

interface RoomSpot {
  x: number;
  y: number;
  seated: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const ROOM_BOUNDS: Record<string, { minX: number; maxX: number; minY: number; maxY: number; spots: { x: number; y: number; seated: boolean }[] }> = {
  content: {
    minX: 13, maxX: 30, minY: 16, maxY: 27,
    spots: [
      { x: 28, y: 18, seated: true }, // Aditi - editing desk
      { x: 22, y: 27, seated: true }, // Kabir - couch
      { x: 25, y: 27, seated: true }, // Meera - couch
      { x: 16, y: 22, seated: true }, // Arjun - photo set chair
      { x: 21, y: 21, seated: false }, // Isha - photo lights
      { x: 15, y: 26, seated: false }, // Rohan - wander floor
    ]
  },
  technical: {
    minX: 41, maxX: 58, minY: 16, maxY: 27,
    spots: [
      { x: 49, y: 16, seated: true }, // Ananya - center desk chair
      { x: 44, y: 16, seated: true }, // Dev - left desk chair
      { x: 54, y: 16, seated: true }, // Priya - right desk chair
      { x: 43, y: 24, seated: false }, // Neil - workbench
      { x: 49, y: 26, seated: false }, // Tara - center green rug
      { x: 55, y: 24, seated: false }, // Sam - server rack
    ]
  },
  sports: {
    minX: 68, maxX: 88, minY: 16, maxY: 27,
    spots: [
      { x: 73, y: 16, seated: true }, // Dhruv - racing sim bucket seat
      { x: 69, y: 25, seated: true }, // Maya - blue beanbag
      { x: 86, y: 24, seated: true }, // Zoravar - weight bench
      { x: 76, y: 24, seated: false }, // Simran - green turf
      { x: 80, y: 25, seated: false }, // Leo - turf ball spot
      { x: 88, y: 19, seated: false }, // Coach Rao - trophy case
    ]
  },
  fashion: {
    minX: 12, maxX: 30, minY: 42, maxY: 56,
    spots: [
      { x: 13, y: 51, seated: true }, // Sanya - vanity stool
      { x: 20, y: 55, seated: true }, // Reyansh - sewing stool 1
      { x: 24, y: 55, seated: true }, // Tara - sewing stool 2
      { x: 14, y: 44, seated: false }, // Zayd - clothes rack
      { x: 19, y: 44, seated: false }, // Dia - mannequin
      { x: 27, y: 46, seated: false }, // Kael - open floor
    ]
  },
  travel: {
    minX: 68, maxX: 85, minY: 42, maxY: 55,
    spots: [
      { x: 79, y: 53, seated: true }, // Aarav - chart table stool
      { x: 70, y: 48, seated: true }, // Chloe - vintage trunk
      { x: 75, y: 43, seated: false }, // Jin - world map wall
      { x: 68, y: 45, seated: false }, // Amina - globe corner
      { x: 83, y: 47, seated: false }, // Mateo - travel desk
      { x: 74, y: 48, seated: false }, // Freja - wander rug
    ]
  },
  gaming: {
    minX: 13, maxX: 40, minY: 72, maxY: 86,
    spots: [
      { x: 21, y: 84, seated: true }, // Kriti - purple beanbag
      { x: 28, y: 85, seated: true }, // Ren - gaming sofa
      { x: 39, y: 84, seated: true }, // Zephyr - black beanbag
      { x: 14, y: 75, seated: false }, // Akari - arcade 1
      { x: 18, y: 75, seated: false }, // D-Pad - arcade 2
      { x: 33, y: 76, seated: false }, // Nova - figurine shelf
    ]
  },
  music: {
    minX: 59, maxX: 88, minY: 72, maxY: 86,
    spots: [
      { x: 60, y: 75, seated: true }, // Mihir - keyboard stool
      { x: 60, y: 84, seated: true }, // Zoe - leather sofa
      { x: 70, y: 74, seated: true }, // Aftab - mixing console
      { x: 86, y: 74, seated: false }, // Lyra - vocal booth
      { x: 87, y: 84, seated: true }, // Bassman - drum kit
      { x: 72, y: 82, seated: false }, // Echo - persian rug
    ]
  }
};

const EMOTE_ICONS = ['💡', '⚡', '🎵', '💬', '☕', '🎮', '⭐', '✨', '✍️', '💖'];

interface NpcData {
  room: Room;
  member: Member;
  sprite: import('phaser').GameObjects.Image;
  shadow: import('phaser').GameObjects.Ellipse;
  nameplate: import('phaser').GameObjects.Container;
  spot: { x: number; y: number; seated: boolean };
  curX: number;
  curY: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  seated: boolean;
  moving: boolean;
  moveStep: number;
  moveProgress: number;
  wanderTimer: number;
  emoteTimer: number;
  randomOffset: number;
}

export default function World({onEnter,onArrive,onSelectMember}: WorldProps){
  const parent = useRef<HTMLDivElement>(null);
  const enterRef = useRef(onEnter);
  const arriveRef = useRef(onArrive);
  const selectRef = useRef(onSelectMember);
  enterRef.current = onEnter;
  arriveRef.current = onArrive;
  selectRef.current = onSelectMember;

  useEffect(()=>{
    let destroyed = false;
    let game: import('phaser').Game | undefined;
    let unsub: (() => void) | undefined;
    const pressed = new Set<string>();

    const keydown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.target instanceof HTMLElement && e.target.closest('input,textarea,[contenteditable="true"]')) return;
      if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        pressed.add(e.key);
      }
      if (e.key === 'Enter' && !(e.target instanceof HTMLElement && e.target.closest('button'))) {
        const p = useWorldStore.getState().position;
        const r = rooms.find(r => Math.hypot(r.x - p.x, r.y - p.y) < 14);
        if (r) {
          e.preventDefault();
          enterRef.current(r.id);
        }
      }
    };

    const keyup = (e: KeyboardEvent) => pressed.delete(e.key);
    const blur = () => pressed.clear();

    import('phaser').then(({default: P}) => {
      if (destroyed || !parent.current) return;

      class Clubhouse extends P.Scene {
        player!: import('phaser').GameObjects.Image;
        label!: import('phaser').GameObjects.Text;
        playerShadow!: import('phaser').GameObjects.Ellipse;
        cursor!: import('phaser').GameObjects.Arc;
        marker!: import('phaser').GameObjects.Arc;
        trail!: import('phaser').GameObjects.Graphics;
        path: {x:number; y:number}[] = [];
        tick = 0;
        lastDrag = 0;
        arrival: {roomId?: string; memberId?: string} | null = null;
        npcs: NpcData[] = [];
        activeTooltipNpc: NpcData | null = null;

        preload() {
          this.load.image('map', '/assets/clubhouse.png');
          this.load.image('player', '/assets/player.png');
        }

        create() {
          this.game.canvas.tabIndex = 0;
          this.add.image(768, 512, 'map').setDisplaySize(1536, 1024).setDepth(0);
          this.trail = this.add.graphics().setDepth(2);
          this.marker = this.add.circle(0, 0, 10, 0xd9c3fb, 0.25).setStrokeStyle(2, 0xeedfff).setVisible(false).setDepth(3);
          this.cursor = this.add.circle(0, 0, 12, 0xc7e8cb, 0.2).setStrokeStyle(2, 0xd7edc9).setVisible(false).setDepth(4);

          // 1. Generate textures for all 42 team characters (stand, walk, sit)
          rooms.forEach(r => {
            const roomMembers = teams[r.id] || [];
            roomMembers.forEach(m => {
              const standCanvas = createPixelCharacterCanvas(m, 'stand');
              this.textures.addCanvas(`char_${m.id}_stand`, standCanvas);

              const walkCanvas = createPixelCharacterCanvas(m, 'walk');
              this.textures.addCanvas(`char_${m.id}_walk`, walkCanvas);

              const sitCanvas = createPixelCharacterCanvas(m, 'sit');
              this.textures.addCanvas(`char_${m.id}_sit`, sitCanvas);
            });
          });

          // Generate emote textures
          EMOTE_ICONS.forEach((emoji, idx) => {
            const emoteCanvas = createEmoteCanvas(emoji);
            this.textures.addCanvas(`emote_${idx}`, emoteCanvas);
          });

          // 2. Spawn characters into their respective rooms
          rooms.forEach(r => {
            const roomConfig = ROOM_BOUNDS[r.id];
            const roomMembers = teams[r.id] || [];
            if (!roomConfig) return;

            roomMembers.forEach((m, idx) => {
              const spot = roomConfig.spots[idx % roomConfig.spots.length];
              const curX = spot.x;
              const curY = spot.y;
              const isSeated = spot.seated;
              const texKey = `char_${m.id}_${isSeated ? 'sit' : 'stand'}`;

              // Soft drop shadow
              const shadow = this.add.ellipse(curX * 15.36, curY * 10.24 + 4, isSeated ? 34 : 28, isSeated ? 14 : 10, 0x120e20, 0.35);
              shadow.setDepth(curY * 10.24 - 1);

              // Character sprite
              const sprite = this.add.image(curX * 15.36, curY * 10.24, texKey);
              sprite.setDisplaySize(72, 84).setOrigin(0.5, 0.88);
              sprite.setDepth(curY * 10.24);
              sprite.setInteractive({ useHandCursor: true });

              // Retro nameplate container
              const nameplate = this.add.container(curX * 15.36, curY * 10.24 - 72);
              const bg = this.add.rectangle(0, 0, 110, 24, 0x181628, 0.92);
              bg.setStrokeStyle(1.5, parseInt(m.color.replace('#', '0x'), 16));
              const text = this.add.text(0, 0, `${m.name} · ${m.role}`, {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#ffffff',
                align: 'center'
              }).setOrigin(0.5);
              nameplate.add([bg, text]);
              nameplate.setVisible(false);
              nameplate.setDepth(10000);

              const npc: NpcData = {
                room: r,
                member: m,
                sprite,
                shadow,
                nameplate,
                spot,
                curX,
                curY,
                targetX: curX,
                targetY: curY,
                homeX: spot.x,
                homeY: spot.y,
                minX: roomConfig.minX,
                maxX: roomConfig.maxX,
                minY: roomConfig.minY,
                maxY: roomConfig.maxY,
                seated: isSeated,
                moving: false,
                moveStep: 0,
                moveProgress: 0,
                wanderTimer: 2000 + Math.random() * 5000,
                emoteTimer: 4000 + Math.random() * 10000,
                randomOffset: Math.random() * 1000,
              };

              // Hover effect
              sprite.on('pointerover', () => {
                nameplate.setVisible(true);
                nameplate.setPosition(sprite.x, sprite.y - 74);
                sprite.setTint(0xffeedd);
                this.activeTooltipNpc = npc;
              });

              sprite.on('pointerout', () => {
                nameplate.setVisible(false);
                sprite.clearTint();
                if (this.activeTooltipNpc === npc) this.activeTooltipNpc = null;
              });

              // Click opens profile dialog
              sprite.on('pointerdown', (pointer: import('phaser').Input.Pointer, _localX: number, _localY: number, event: MouseEvent) => {
                if (event && event.stopPropagation) event.stopPropagation();
                if (selectRef.current) {
                  selectRef.current(r, m);
                }
              });

              this.npcs.push(npc);
            });
          });

          // 3. Player Setup
          const p = useWorldStore.getState().position;
          this.playerShadow = this.add.ellipse(p.x * 15.36, p.y * 10.24 + 4, 38, 14, 0x120e20, 0.4).setDepth(p.y * 10.24 - 1);
          this.player = this.add.image(p.x * 15.36, p.y * 10.24, 'player').setDisplaySize(96, 100).setOrigin(0.5, 0.88);
          this.player.setDepth(p.y * 10.24);

          this.label = this.add.text(0, 0, 'YOU', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#fff',
            backgroundColor: '#67528a',
            padding: { x: 7, y: 3 }
          }).setOrigin(0.5, 1).setDepth(p.y * 10.24 + 1);
          this.label.setPosition(this.player.x, this.player.y - 68);

          // World store navigation
          const go = () => {
            const d = useWorldStore.getState().destination;
            if (d?.roomId) this.game.canvas.focus({ preventScroll: true });
            if (!d) {
              this.path = [];
              this.arrival = null;
              this.marker.setVisible(false);
              this.trail.clear();
              useWorldStore.getState().setMoving(false);
              return;
            }
            this.path = findPath(useWorldStore.getState().position, d.point);
            this.arrival = d;
            this.marker.setPosition(d.point.x * 15.36, d.point.y * 10.24).setVisible(true);
            this.trail.clear();
            this.trail.fillStyle(0xe9d4ff, 0.65);
            this.path.forEach((pt, i) => {
              if (i % 3 === 0) this.trail.fillCircle(pt.x * 15.36, pt.y * 10.24, 2);
            });
            if (!this.path.length) this.finish();
            else useWorldStore.getState().setMoving(true);
          };

          unsub = useWorldStore.subscribe((s, prev) => {
            if (s.destination !== prev.destination) go();
          });
          go();

          const target = (pointer: import('phaser').Input.Pointer) => {
            // Check if clicking on an interactive NPC
            if (this.activeTooltipNpc) return;
            this.game.canvas.focus({ preventScroll: true });
            const x = pointer.x / 15.36;
            const y = pointer.y / 10.24;
            if (walkable(x, y)) {
              useWorldStore.getState().moveTo({ point: { x: Math.round(x), y: Math.round(y) } });
            }
          };

          this.input.on('pointerdown', target);
          this.input.on('pointermove', (pointer: import('phaser').Input.Pointer) => {
            const valid = walkable(pointer.x / 15.36, pointer.y / 10.24);
            this.cursor.setPosition(pointer.x, pointer.y)
              .setStrokeStyle(2, valid ? 0xd7edc9 : 0xdc989f)
              .setFillStyle(valid ? 0xc7e8cb : 0xdc989f, 0.2)
              .setVisible(true);
            if (pointer.isDown && this.time.now - this.lastDrag > 100) {
              this.lastDrag = this.time.now;
              target(pointer);
            }
          });
          this.input.on('gameout', () => this.cursor.setVisible(false));
        }

        finish() {
          const arrival = this.arrival;
          this.arrival = null;
          this.path = [];
          this.marker.setVisible(false);
          this.trail.clear();
          useWorldStore.getState().moveTo(null);
          if (arrival?.roomId) arriveRef.current(arrival.roomId, arrival.memberId);
        }

        spawnEmote(npc: NpcData) {
          const emoteIdx = Math.floor(Math.random() * EMOTE_ICONS.length);
          const iconKey = `emote_${emoteIdx}`;
          const bubble = this.add.image(npc.sprite.x, npc.sprite.y - 70, iconKey);
          bubble.setDisplaySize(38, 30).setDepth(npc.sprite.depth + 100);

          this.tweens.add({
            targets: bubble,
            y: bubble.y - 20,
            alpha: { from: 1, to: 0 },
            duration: 2200,
            ease: 'Sine.easeOut',
            onComplete: () => bubble.destroy()
          });
        }

        update(_time: number, delta: number) {
          this.tick += delta;

          // Update NPCs (idle bob, wander motion, detail emotes)
          for (let i = 0; i < this.npcs.length; i++) {
            const npc = this.npcs[i];

            // Emote timer
            npc.emoteTimer -= delta;
            if (npc.emoteTimer <= 0) {
              npc.emoteTimer = 10000 + Math.random() * 20000;
              // Occasional emote bubble
              if (Math.random() < 0.6) {
                this.spawnEmote(npc);
              }
            }

            if (npc.seated) {
              // Seated idle: subtle breathing
              const bob = Math.sin((this.tick + npc.randomOffset) * 0.003) * 1.2;
              npc.sprite.setPosition(npc.curX * 15.36, npc.curY * 10.24 + bob);
              npc.shadow.setPosition(npc.curX * 15.36, npc.curY * 10.24 + 4);
              npc.sprite.setDepth(npc.curY * 10.24);
              npc.shadow.setDepth(npc.curY * 10.24 - 1);
            } else {
              // Standing / Wandering NPC
              npc.wanderTimer -= delta;

              if (!npc.moving && npc.wanderTimer <= 0) {
                // Decide to take a walk nearby
                npc.wanderTimer = 4000 + Math.random() * 7000;
                if (Math.random() < 0.65) {
                  // Pick a random destination within room bounds
                  const range = 7;
                  const candX = Math.min(npc.maxX, Math.max(npc.minX, npc.homeX + (Math.random() * 2 - 1) * range));
                  const candY = Math.min(npc.maxY, Math.max(npc.minY, npc.homeY + (Math.random() * 2 - 1) * range));
                  if (walkable(candX, candY)) {
                    npc.targetX = candX;
                    npc.targetY = candY;
                    npc.moving = true;
                    npc.moveProgress = 0;
                    npc.sprite.setTexture(`char_${npc.member.id}_walk`);
                    npc.sprite.setFlipX(npc.targetX < npc.curX);
                  }
                }
              }

              if (npc.moving) {
                npc.moveProgress += (delta / 1800);
                if (npc.moveProgress >= 1) {
                  npc.curX = npc.targetX;
                  npc.curY = npc.targetY;
                  npc.moving = false;
                  npc.sprite.setTexture(`char_${npc.member.id}_stand`);
                } else {
                  const t = npc.moveProgress;
                  const x = npc.curX + (npc.targetX - npc.curX) * t;
                  const y = npc.curY + (npc.targetY - npc.curY) * t;
                  const walkBob = Math.abs(Math.sin((this.tick + npc.randomOffset) * 0.018)) * 3;
                  npc.sprite.setPosition(x * 15.36, y * 10.24 - walkBob);
                  npc.shadow.setPosition(x * 15.36, y * 10.24 + 4);
                  npc.sprite.setDepth(y * 10.24);
                  npc.shadow.setDepth(y * 10.24 - 1);
                  continue;
                }
              }

              // Idle standing breathe
              const bob = Math.sin((this.tick + npc.randomOffset) * 0.004) * 1.5;
              npc.sprite.setPosition(npc.curX * 15.36, npc.curY * 10.24 + bob);
              npc.shadow.setPosition(npc.curX * 15.36, npc.curY * 10.24 + 4);
              npc.sprite.setDepth(npc.curY * 10.24);
              npc.shadow.setDepth(npc.curY * 10.24 - 1);
            }
          }

          // Update Player
          if (!this.player) return;
          let { x, y } = useWorldStore.getState().position;
          const dx = (pressed.has('d') || pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('a') || pressed.has('ArrowLeft') ? 1 : 0);
          const dy = (pressed.has('s') || pressed.has('ArrowDown') ? 1 : 0) - (pressed.has('w') || pressed.has('ArrowUp') ? 1 : 0);
          const step = Math.min(delta, 40) * 0.026;
          let moving = false;

          if (dx || dy) {
            if (this.arrival || this.path.length) useWorldStore.getState().moveTo(null);
            const length = Math.hypot(dx, dy);
            if (walkable(x + dx / length * step, y)) {
              x += dx / length * step;
              moving = !!dx;
            }
            if (walkable(x, y + dy / length * step)) {
              y += dy / length * step;
              moving = moving || !!dy;
            }
            this.player.setFlipX(dx < 0);
          } else if (this.path.length) {
            const target = this.path[0];
            const dist = Math.hypot(target.x - x, target.y - y);
            if (dist <= step) {
              x = target.x;
              y = target.y;
              this.path.shift();
            } else {
              x += (target.x - x) / dist * step;
              y += (target.y - y) / dist * step;
            }
            this.player.setFlipX(target.x < x);
            moving = true;
          }

          if (moving) {
            useWorldStore.getState().setPosition({ x, y });
          }

          const playerBob = moving ? Math.sin(this.tick * 0.018) * 2 : 0;
          this.player.setPosition(x * 15.36, y * 10.24 + playerBob);
          this.playerShadow.setPosition(x * 15.36, y * 10.24 + 4);
          this.player.setDepth(y * 10.24);
          this.playerShadow.setDepth(y * 10.24 - 1);
          this.label.setPosition(this.player.x, this.player.y - 68);
          this.label.setDepth(y * 10.24 + 1);

          if (useWorldStore.getState().moving !== moving) {
            useWorldStore.getState().setMoving(moving);
          }
          if (this.arrival && !this.path.length) this.finish();
        }
      }

      game = new P.Game({
        type: P.AUTO,
        parent: parent.current,
        width: 1536,
        height: 1024,
        pixelArt: true,
        transparent: true,
        scene: Clubhouse,
        scale: { mode: P.Scale.FIT, autoCenter: P.Scale.CENTER_BOTH },
        audio: { noAudio: true },
        banner: false
      });

      window.addEventListener('keydown', keydown);
      window.addEventListener('keyup', keyup);
      window.addEventListener('blur', blur);
    });

    return () => {
      destroyed = true;
      unsub?.();
      game?.destroy(true);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
    };
  }, []);

  return (
    <div
      ref={parent}
      className="phaser-world"
      role="img"
      aria-label="Interactive Clubhouse Map with characters sitting and wandering in each creative room."
    />
  );
}
