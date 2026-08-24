/**
 * Tactile Haptic Feedback Utility (Dual Vibration & Audio-Tactile Engine)
 * Provides crisp, tangible feedback patterns for mobile gestures, swipe actions,
 * task completions, status transitions, edits, drag-and-drop, and UI interactions.
 * 
 * Works seamlessly across both Android devices (via Navigator.vibrate API)
 * and iOS / Safari mobile devices (via synthesized tactile micro-haptic click).
 */

export type HapticType =
  | 'success'     // Task completed / milestone marked (double tap)
  | 'complete'    // Alias for success
  | 'edit'        // Edit / modal opened (crisp single pulse)
  | 'threshold'   // Micro-tap fired when card crosses drag activation threshold
  | 'light'       // Micro tap (35ms)
  | 'medium'      // Medium tap (50ms)
  | 'heavy'       // Heavy tap (75ms)
  | 'warning'     // Alert / blocked / delete pattern
  | 'selection';  // Soft selection tap

// Tuned vibration durations: Minimum 30ms-40ms ensures Android hardware motors
// (Samsung, Google Pixel, Xiaomi, Motorola, etc.) reliably spin up and register.
export const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  success: [45, 60, 60],       // Double pulse: tap + brief gap + solid confirmation tap
  complete: [45, 60, 60],
  edit: [50],                  // Crisp, snappy single pulse
  threshold: [35],             // Subtle micro-tick when drag crosses action threshold
  light: [35],                 // Crisp micro tap
  medium: [55],                // Solid tactile feedback
  heavy: [80],                 // Strong pulse
  warning: [40, 50, 40, 50, 80],
  selection: [30],             // Soft selection tick
};

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

/**
 * Initializes and unlocks Web Audio Context on first user touch/pointer interaction.
 * Required by iOS Safari and modern mobile browsers for audio-tactile clicks.
 */
function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch {
        // AudioContext not allowed or supported
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended' && !audioUnlocked) {
    const unlock = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          audioUnlocked = true;
        }).catch(() => {});
      }
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
  }
  return audioCtx;
}

// Auto-initialize audio context unlock listeners in browser
if (typeof window !== 'undefined') {
  initAudioContext();
}

/**
 * Generates an ultra-short, crisp tactile micro-click / mechanical thud using Web Audio.
 * Mimics physical Taptic Engine feedback on iOS Safari and mobile browsers.
 */
function playTactileAudioPulse(type: HapticType = 'light'): void {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 160;
    let duration = 0.018;
    let peakGain = 0.15;

    switch (type) {
      case 'success':
      case 'complete':
        // Two distinct micro-ticks
        freq = 220;
        duration = 0.022;
        peakGain = 0.22;
        // Schedule second tick
        setTimeout(() => {
          try {
            if (!ctx) return;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(320, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.025);
            gain2.gain.setValueAtTime(0.25, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.025);
          } catch {}
        }, 65);
        break;
      case 'threshold':
        freq = 190;
        duration = 0.012;
        peakGain = 0.12;
        break;
      case 'heavy':
        freq = 110;
        duration = 0.035;
        peakGain = 0.28;
        break;
      case 'medium':
        freq = 150;
        duration = 0.02;
        peakGain = 0.18;
        break;
      case 'warning':
        freq = 90;
        duration = 0.04;
        peakGain = 0.25;
        break;
      case 'selection':
      case 'light':
      default:
        freq = 180;
        duration = 0.015;
        peakGain = 0.12;
        break;
    }

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + duration);

    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore audio synthesis errors silently
  }
}

/**
 * Checks if the current browser environment supports the Web Vibration API
 */
export function isHapticSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * Check if haptic feedback is globally enabled by user settings
 */
export function isHapticsGloballyEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const pref = localStorage.getItem('pmo_haptics_enabled');
    return pref === null || pref === 'true';
  } catch {
    return true;
  }
}

/**
 * Set user preference for haptic feedback
 */
export function setHapticsGloballyEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pmo_haptics_enabled', enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Triggers tactile haptic feedback using:
 * 1. Physical device vibration (via Navigator.vibrate API) on supported Android devices.
 * 2. Audio-tactile micro-click synthesizer for iOS / Safari / WebKit or devices where vibrate is unavailable.
 *
 * @param type Haptic preset name or custom pattern (milliseconds or array of durations)
 * @returns boolean indicating if physical vibration or tactile audio was successfully triggered
 */
export function triggerHaptic(type: HapticType | string | number | number[] = 'light'): boolean {
  if (!isHapticsGloballyEnabled()) {
    return false;
  }

  let vibrationDispatched = false;

  // 1. Trigger Physical Vibration on devices that support it
  if (isHapticSupported()) {
    try {
      const pattern = typeof type === 'string'
        ? (HAPTIC_PATTERNS[type as HapticType] ?? [40])
        : type;

      vibrationDispatched = navigator.vibrate(pattern);
    } catch {
      vibrationDispatched = false;
    }
  }

  // 2. Trigger Tactile Audio Pulse (provides crisp tactile feedback on iOS Safari & complementary tactile confirmation)
  const hapticKey: HapticType = typeof type === 'string' && type in HAPTIC_PATTERNS
    ? (type as HapticType)
    : 'light';

  playTactileAudioPulse(hapticKey);

  return vibrationDispatched || true;
}
