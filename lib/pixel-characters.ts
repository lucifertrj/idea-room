/**
 * Generates custom 2D top-down pixel art character sprites for each team member.
 * Each character has distinct skin tones, hair styles, outfits, and accessories
 * corresponding to their personality, avatar emoji, and signature room color.
 */
import { Member } from './teams';

export type SpritePose = 'stand' | 'walk' | 'sit';

interface CharacterStyle {
  skin: string;
  skinShadow: string;
  hair: string;
  hairShadow: string;
  hairStyle: 'spiky' | 'wavy' | 'bob' | 'afro' | 'buns' | 'fade' | 'curls' | 'ponytail' | 'long' | 'beanie' | 'hat' | 'cap' | 'silver';
  facialHair?: boolean;
  glasses?: boolean;
  headphones?: boolean;
  topStyle: 'hoodie' | 'blazer' | 'jacket' | 'vest' | 'sweater' | 'tee' | 'dress';
  pantsColor: string;
  shoesColor: string;
}

// Map each member ID to a tailored pixel art visual signature
const MEMBER_STYLES: Record<string, Partial<CharacterStyle>> = {
  // Content
  cleo: { hairStyle: 'wavy', topStyle: 'blazer', hair: '#2b1d14', hairShadow: '#190e07', pantsColor: '#2b2938' }, // Aditi
  theo: { hairStyle: 'fade', facialHair: true, topStyle: 'sweater', hair: '#33271e', hairShadow: '#1c140d', pantsColor: '#303038' }, // Kabir
  mira: { hairStyle: 'buns', topStyle: 'tee', hair: '#1a101f', hairShadow: '#0d0710', pantsColor: '#252130' }, // Meera
  finn: { hairStyle: 'fade', topStyle: 'hoodie', hair: '#1f2428', hairShadow: '#121618', pantsColor: '#1e2430' }, // Arjun
  zoe: { hairStyle: 'buns', topStyle: 'sweater', hair: '#4a2c11', hairShadow: '#2c1908', pantsColor: '#3d3129' }, // Isha
  silas: { hairStyle: 'spiky', topStyle: 'jacket', hair: '#1f1a18', hairShadow: '#100c0a', pantsColor: '#28222b' }, // Rohan

  // Technical
  ananya: { hairStyle: 'bob', glasses: true, topStyle: 'blazer', hair: '#1a1924', hairShadow: '#0d0c14', pantsColor: '#232230' },
  dev: { hairStyle: 'curls', topStyle: 'hoodie', hair: '#211915', hairShadow: '#120d0b', pantsColor: '#1d222b' },
  priya: { hairStyle: 'long', topStyle: 'tee', hair: '#3a2012', hairShadow: '#201007', pantsColor: '#2a2420' },
  neil: { hairStyle: 'curls', facialHair: true, glasses: true, topStyle: 'sweater', hair: '#241b17', hairShadow: '#130d0a', pantsColor: '#231f2b' },
  tara_tech: { hairStyle: 'ponytail', topStyle: 'tee', hair: '#e6be6c', hairShadow: '#b08a34', pantsColor: '#202a28' },
  sam: { hairStyle: 'spiky', topStyle: 'tee', hair: '#d49b55', hairShadow: '#9c6a28', pantsColor: '#28201d' },

  // Sports
  dhruv: { hairStyle: 'cap', topStyle: 'jacket', hair: '#1c1b22', hairShadow: '#0f0e14', pantsColor: '#1d2633' },
  maya: { hairStyle: 'ponytail', topStyle: 'jacket', hair: '#1e1c24', hairShadow: '#100e14', pantsColor: '#281c1c' },
  zoravar: { hairStyle: 'fade', facialHair: true, topStyle: 'vest', hair: '#1b171f', hairShadow: '#0d0a10', pantsColor: '#241d2e' },
  simran: { hairStyle: 'curls', topStyle: 'jacket', hair: '#241a16', hairShadow: '#130d0a', pantsColor: '#1a2822' },
  leo: { hairStyle: 'spiky', topStyle: 'jacket', hair: '#e8c46d', hairShadow: '#b3903b', pantsColor: '#2e271a' },
  coach: { hairStyle: 'silver', facialHair: true, glasses: true, topStyle: 'vest', hair: '#b8b5c0', hairShadow: '#84818e', pantsColor: '#302924' },

  // Fashion
  sanya: { hairStyle: 'bob', topStyle: 'dress', hair: '#17141d', hairShadow: '#0b090f', pantsColor: '#291823' },
  reyansh: { hairStyle: 'beanie', topStyle: 'hoodie', hair: '#1e1b24', hairShadow: '#0f0d14', pantsColor: '#1e2430' },
  tara_fashion: { hairStyle: 'long', topStyle: 'dress', hair: '#f0d284', hairShadow: '#ba9a47', pantsColor: '#2e2a1e' },
  zayd: { hairStyle: 'fade', facialHair: true, topStyle: 'blazer', hair: '#1a1622', hairShadow: '#0d0a12', pantsColor: '#241d2e' },
  dia: { hairStyle: 'long', topStyle: 'dress', hair: '#261b17', hairShadow: '#140c09', pantsColor: '#1a2924' },
  kael: { hairStyle: 'spiky', topStyle: 'blazer', hair: '#ded8e8', hairShadow: '#a69ebd', pantsColor: '#2b2124' },

  // Travel
  aarav: { hairStyle: 'hat', topStyle: 'vest', hair: '#211a16', hairShadow: '#110b08', pantsColor: '#30281e' },
  chloe: { hairStyle: 'ponytail', topStyle: 'jacket', hair: '#eecb79', hairShadow: '#b8923a', pantsColor: '#1d2730' },
  jin: { hairStyle: 'bob', topStyle: 'blazer', hair: '#181b22', hairShadow: '#0b0d12', pantsColor: '#2b1f24' },
  amina: { hairStyle: 'afro', topStyle: 'dress', hair: '#16121c', hairShadow: '#0b0810', pantsColor: '#241c2e' },
  mateo: { hairStyle: 'curls', facialHair: true, topStyle: 'vest', hair: '#261d18', hairShadow: '#140d08', pantsColor: '#1d2b20' },
  freja: { hairStyle: 'long', topStyle: 'sweater', hair: '#f2dc94', hairShadow: '#bfa754', pantsColor: '#2e261f' },

  // Gaming
  kriti: { hairStyle: 'buns', headphones: true, topStyle: 'hoodie', hair: '#a980e8', hairShadow: '#764bbd', pantsColor: '#251f33' },
  ren: { hairStyle: 'spiky', topStyle: 'jacket', hair: '#1a1924', hairShadow: '#0e0d14', pantsColor: '#2b1d22' },
  zephyr: { hairStyle: 'spiky', topStyle: 'sweater', hair: '#7bd8df', hairShadow: '#489fa5', pantsColor: '#1d2a2b' },
  akari: { hairStyle: 'bob', topStyle: 'dress', hair: '#2b1a20', hairShadow: '#170b10', pantsColor: '#2e2c1d' },
  dpad: { hairStyle: 'cap', facialHair: true, glasses: true, topStyle: 'jacket', hair: '#2d211b', hairShadow: '#170f0b', pantsColor: '#1d2030' },
  nova: { hairStyle: 'bob', topStyle: 'jacket', hair: '#e2d4f2', hairShadow: '#a994c2', pantsColor: '#281f33' },

  // Music
  mihir: { hairStyle: 'curls', topStyle: 'blazer', hair: '#211a18', hairShadow: '#120d0b', pantsColor: '#2e2819' },
  zoe: { hairStyle: 'long', headphones: true, topStyle: 'jacket', hair: '#49a8e0', hairShadow: '#2272a1', pantsColor: '#182730' },
  aftab: { hairStyle: 'curls', facialHair: true, topStyle: 'blazer', hair: '#241a1d', hairShadow: '#130b0e', pantsColor: '#301c24' },
  lyra: { hairStyle: 'ponytail', topStyle: 'tee', hair: '#181b22', hairShadow: '#0c0d12', pantsColor: '#192e24' },
  bassman: { hairStyle: 'cap', topStyle: 'hoodie', hair: '#131118', hairShadow: '#08060c', pantsColor: '#271c33' },
  echo: { hairStyle: 'fade', headphones: true, topStyle: 'tee', hair: '#241b16', hairShadow: '#130d08', pantsColor: '#2e2518' },
};

function getSkinColors(avatar: string): { skin: string; skinShadow: string } {
  if (avatar.includes('🏻')) return { skin: '#fed7c3', skinShadow: '#e6b097' };
  if (avatar.includes('🏼')) return { skin: '#f3c79a', skinShadow: '#d6a06f' };
  if (avatar.includes('🏽')) return { skin: '#d6975f', skinShadow: '#b07137' };
  if (avatar.includes('🏾')) return { skin: '#9b5d30', skinShadow: '#76411a' };
  if (avatar.includes('🏿')) return { skin: '#5c3519', skinShadow: '#42220b' };
  if (avatar.includes('👴')) return { skin: '#d6975f', skinShadow: '#b07137' };
  // Default warm tan
  return { skin: '#e2ad7a', skinShadow: '#ba804b' };
}

function adjustHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Creates an HTML5 Canvas containing the pixel art sprite for a given character and pose.
 */
export function createPixelCharacterCanvas(member: Member, pose: SpritePose = 'stand'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Dimensions for high detail retro sprite (36 x 44 grid, drawn at 2x scale: 72x88px)
  const W = 36;
  const H = 44;
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  const skinInfo = getSkinColors(member.avatar);
  const custom = MEMBER_STYLES[member.id] || {};

  const skin = custom.skin || skinInfo.skin;
  const skinShadow = custom.skinShadow || skinInfo.skinShadow;
  const hair = custom.hair || '#292019';
  const hairShadow = custom.hairShadow || adjustHex(hair, -35);
  const hairStyle = custom.hairStyle || 'spiky';
  const facialHair = custom.facialHair || false;
  const glasses = custom.glasses || false;
  const headphones = custom.headphones || false;
  const topColor = member.color;
  const topShadow = adjustHex(topColor, -35);
  const topLight = adjustHex(topColor, 25);
  const pantsColor = custom.pantsColor || '#262433';
  const pantsShadow = adjustHex(pantsColor, -25);
  const shoesColor = custom.shoesColor || '#f0eff5';
  const shoeTrim = '#1a1924';

  function pixel(x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }

  function rect(x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
  }

  // Calculate pose offsets
  const isSit = pose === 'sit';
  const isWalk = pose === 'walk';
  const yOffset = isSit ? 4 : 0;

  // 1. Soft ground shadow
  if (!isSit) {
    rect(11, 41, 14, 2, 'rgba(0, 0, 0, 0.25)');
    rect(13, 40, 10, 3, 'rgba(0, 0, 0, 0.35)');
  } else {
    rect(9, 41, 18, 2, 'rgba(0, 0, 0, 0.2)');
    rect(11, 40, 14, 3, 'rgba(0, 0, 0, 0.3)');
  }

  // 2. Head base coordinates
  const hx = 11;
  const hy = 7 + yOffset;

  // 3. Neck & Head
  rect(16, hy + 13, 4, 3, skinShadow); // neck
  rect(hx + 2, hy + 2, 10, 11, skin); // face base
  rect(hx + 3, hy + 1, 8, 2, skin); // forehead
  rect(hx + 1, hy + 4, 12, 8, skin); // cheeks
  rect(hx + 2, hy + 11, 10, 2, skinShadow); // chin shadow

  // 4. Eyes & Expression
  const eyeY = hy + 6;
  // Left eye
  rect(hx + 3, eyeY, 3, 3, '#ffffff');
  rect(hx + 4, eyeY, 2, 3, '#1c1b24');
  pixel(hx + 3, eyeY, '#ffffff'); // shine
  // Right eye
  rect(hx + 8, eyeY, 3, 3, '#ffffff');
  rect(hx + 8, eyeY, 2, 3, '#1c1b24');
  pixel(hx + 9, eyeY, '#ffffff'); // shine

  // Eyebrows
  rect(hx + 3, eyeY - 2, 3, 1, hairShadow);
  rect(hx + 8, eyeY - 2, 3, 1, hairShadow);

  // Nose & Mouth
  pixel(hx + 6, eyeY + 3, skinShadow);
  rect(hx + 5, eyeY + 5, 4, 1, '#9e5252'); // mouth

  // Blush
  pixel(hx + 2, eyeY + 4, 'rgba(235, 120, 120, 0.4)');
  pixel(hx + 11, eyeY + 4, 'rgba(235, 120, 120, 0.4)');

  // Facial hair
  if (facialHair) {
    rect(hx + 4, eyeY + 5, 6, 2, hairShadow);
    rect(hx + 5, eyeY + 7, 4, 2, hairShadow);
  }

  // Glasses
  if (glasses) {
    rect(hx + 2, eyeY - 1, 4, 4, '#38324f');
    rect(hx + 3, eyeY, 2, 2, 'rgba(215, 235, 255, 0.5)');
    rect(hx + 8, eyeY - 1, 4, 4, '#38324f');
    rect(hx + 9, eyeY, 2, 2, 'rgba(215, 235, 255, 0.5)');
    rect(hx + 6, eyeY, 2, 1, '#38324f'); // bridge
  }

  // 5. Hair Styles
  switch (hairStyle) {
    case 'spiky':
      rect(hx + 1, hy - 2, 12, 4, hair);
      rect(hx + 3, hy - 4, 8, 3, hair);
      pixel(hx + 2, hy - 5, hair);
      pixel(hx + 5, hy - 6, hair);
      pixel(hx + 9, hy - 5, hair);
      rect(hx, hy + 2, 2, 6, hair);
      rect(hx + 12, hy + 2, 2, 6, hair);
      rect(hx + 2, hy - 1, 10, 2, hairShadow);
      break;

    case 'wavy':
      rect(hx + 1, hy - 2, 12, 5, hair);
      rect(hx - 1, hy + 2, 3, 14, hair);
      rect(hx + 12, hy + 2, 3, 14, hair);
      rect(hx + 2, hy + 1, 10, 2, hair);
      rect(hx, hy + 14, 2, 3, hairShadow);
      rect(hx + 12, hy + 14, 2, 3, hairShadow);
      break;

    case 'bob':
      rect(hx + 1, hy - 2, 12, 5, hair);
      rect(hx - 1, hy + 2, 3, 10, hair);
      rect(hx + 12, hy + 2, 3, 10, hair);
      rect(hx + 2, hy + 1, 10, 3, hair);
      rect(hx, hy + 10, 2, 2, hairShadow);
      rect(hx + 12, hy + 10, 2, 2, hairShadow);
      break;

    case 'buns':
      rect(hx + 1, hy - 2, 12, 5, hair);
      rect(hx + 2, hy + 1, 10, 2, hair);
      // Left bun
      rect(hx - 2, hy - 4, 4, 4, hair);
      rect(hx - 1, hy - 3, 2, 2, hairShadow);
      // Right bun
      rect(hx + 12, hy - 4, 4, 4, hair);
      rect(hx + 13, hy - 3, 2, 2, hairShadow);
      rect(hx, hy + 3, 2, 6, hair);
      rect(hx + 12, hy + 3, 2, 6, hair);
      break;

    case 'afro':
      rect(hx - 3, hy - 5, 20, 10, hair);
      rect(hx - 2, hy - 6, 18, 12, hair);
      rect(hx - 1, hy - 7, 16, 14, hair);
      rect(hx + 2, hy + 1, 10, 2, hairShadow);
      break;

    case 'ponytail':
      rect(hx + 1, hy - 2, 12, 5, hair);
      rect(hx + 2, hy + 1, 10, 2, hair);
      rect(hx, hy + 2, 2, 6, hair);
      rect(hx + 12, hy + 2, 2, 6, hair);
      // Ponytail tail to the right
      rect(hx + 13, hy, 4, 10, hair);
      rect(hx + 15, hy + 8, 3, 4, hairShadow);
      break;

    case 'cap':
      rect(hx, hy - 2, 14, 5, topColor);
      rect(hx + 2, hy - 4, 10, 3, topShadow);
      rect(hx + 12, hy + 1, 5, 2, topShadow); // visor
      rect(hx, hy + 3, 2, 4, hair);
      rect(hx + 12, hy + 3, 2, 4, hair);
      break;

    case 'hat':
      rect(hx - 2, hy, 18, 3, '#ab824b'); // brim
      rect(hx + 1, hy - 5, 12, 6, '#ab824b'); // crown
      rect(hx + 1, hy - 1, 12, 2, '#42311b'); // band
      rect(hx, hy + 3, 2, 5, hair);
      rect(hx + 12, hy + 3, 2, 5, hair);
      break;

    case 'beanie':
      rect(hx, hy - 4, 14, 7, '#383b54');
      rect(hx + 2, hy - 6, 10, 3, '#383b54');
      rect(hx - 1, hy + 1, 16, 2, '#4d5173'); // fold
      rect(hx, hy + 3, 2, 5, hair);
      rect(hx + 12, hy + 3, 2, 5, hair);
      break;

    default: // fade / curls / long
      rect(hx + 1, hy - 2, 12, 5, hair);
      rect(hx + 2, hy + 1, 10, 2, hair);
      rect(hx, hy + 2, 2, 6, hair);
      rect(hx + 12, hy + 2, 2, 6, hair);
      break;
  }

  // Headphones accessory
  if (headphones) {
    rect(hx - 2, hy + 4, 3, 5, '#1e1c24');
    rect(hx + 13, hy + 4, 3, 5, '#1e1c24');
    rect(hx, hy - 3, 14, 2, '#3b3847'); // headband
  }

  // 6. Body & Torso
  const by = hy + 15;
  // Shoulders & Chest
  rect(10, by, 16, 11, topColor);
  rect(12, by, 12, 2, topLight); // shoulder highlight
  rect(10, by + 9, 16, 2, topShadow); // bottom hem

  // Collar / V-neck / Tie / Details
  rect(16, by, 4, 3, skin);
  rect(17, by + 1, 2, 1, skinShadow);

  // Arms
  if (!isSit) {
    const leftArmOffset = isWalk ? -1 : 0;
    const rightArmOffset = isWalk ? 1 : 0;
    // Left arm
    rect(8, by + 1 + leftArmOffset, 3, 9, topColor);
    rect(8, by + 9 + leftArmOffset, 3, 3, skin); // hand
    // Right arm
    rect(25, by + 1 + rightArmOffset, 3, 9, topColor);
    rect(25, by + 9 + rightArmOffset, 3, 3, skin); // hand
  } else {
    // Seated arms resting on lap/knees
    rect(8, by + 1, 3, 7, topColor);
    rect(10, by + 7, 4, 3, topColor);
    rect(13, by + 8, 3, 2, skin); // left hand on lap

    rect(25, by + 1, 3, 7, topColor);
    rect(22, by + 7, 4, 3, topColor);
    rect(20, by + 8, 3, 2, skin); // right hand on lap
  }

  // 7. Legs & Shoes
  const py = by + 11;
  if (!isSit) {
    if (!isWalk) {
      // Standing legs
      rect(12, py, 5, 8, pantsColor);
      rect(19, py, 5, 8, pantsColor);
      rect(16, py, 4, 1, pantsShadow);

      // Shoes
      rect(11, py + 8, 6, 3, shoesColor);
      rect(19, py + 8, 6, 3, shoesColor);
      rect(11, py + 10, 6, 1, shoeTrim);
      rect(19, py + 10, 6, 1, shoeTrim);
    } else {
      // Walking stride
      rect(11, py, 5, 8, pantsColor);
      rect(20, py - 1, 5, 7, pantsColor);

      // Shoes with stride
      rect(10, py + 7, 6, 3, shoesColor);
      rect(21, py + 6, 6, 3, shoesColor);
      rect(10, py + 9, 6, 1, shoeTrim);
      rect(21, py + 8, 6, 1, shoeTrim);
    }
  } else {
    // Seated posture: legs tucked forward
    rect(11, py, 6, 5, pantsColor);
    rect(19, py, 6, 5, pantsColor);
    rect(11, py + 4, 6, 3, pantsShadow);
    rect(19, py + 4, 6, 3, pantsShadow);

    // Seated shoes
    rect(11, py + 6, 6, 3, shoesColor);
    rect(19, py + 6, 6, 3, shoesColor);
    rect(11, py + 8, 6, 1, shoeTrim);
    rect(19, py + 8, 6, 1, shoeTrim);
  }

  return canvas;
}

/**
 * Creates an emote bubble canvas (e.g. 💡, ⚡, 🎵, 💬, etc.) for floating detail animations.
 */
export function createEmoteCanvas(icon: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 44;
  canvas.height = 36;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  // Retro speech bubble with pixel border
  ctx.fillStyle = '#1b1926';
  ctx.fillRect(4, 2, 36, 26);
  ctx.fillRect(2, 4, 40, 22);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(5, 3, 34, 24);
  ctx.fillRect(3, 5, 38, 20);

  // Bubble tail pointing down
  ctx.fillStyle = '#1b1926';
  ctx.fillRect(20, 28, 4, 4);
  ctx.fillRect(22, 32, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(20, 27, 3, 3);
  ctx.fillRect(21, 30, 2, 2);

  // Draw emoji/symbol
  ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 22, 15);

  return canvas;
}
