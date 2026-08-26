/**
 * PMO Tactile & Haptic Engine (Universal Dual-Engine for iOS & Android)
 * 
 * Supports:
 * 1. Physical Taptic Engine Trigger on iOS Safari / WebKit (iPhone 17 Pro, 16 Pro, 15 Pro, iOS 17.4+)
 *    via native switch control impulse dispatch.
 * 2. Hardware Vibration API (navigator.vibrate) on Android and supported mobile browsers.
 * 3. Low-Latency Audio-Tactile Micro-Click Synthesizer with permanent iOS AudioContext unlock.
 */

export type HapticType =
  | 'success'     // Task completed / milestone marked (double pulse / celebratory tick)
  | 'complete'    // Alias for success
  | 'edit'        // Edit / modal opened (crisp single pulse)
  | 'threshold'   // Micro-tap fired when card crosses drag activation threshold
  | 'light'       // Micro tap (subtle 30ms tick)
  | 'medium'      // Medium solid feedback (50ms)
  | 'heavy'       // Strong mechanical pulse (80ms)
  | 'warning'     // Alert / blocked / delete pattern
  | 'error'       // Error alert pattern
  | 'impact'      // High-priority action impact
  | 'selection';  // Soft selection tick

export const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  success: [45, 50, 65],
  complete: [45, 50, 65],
  edit: [50],
  threshold: [35],
  light: [35],
  medium: [55],
  heavy: [85],
  warning: [45, 50, 45, 50, 90],
  error: [50, 40, 50, 40, 100],
  impact: [70],
  selection: [28],
};

// Global audio & iOS state
let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;
let iosTapticInput: HTMLInputElement | null = null;
let iosTapticLabel: HTMLLabelElement | null = null;

/**
 * Detects if the current client is running iOS (iPhone, iPad, iPod, or iPadOS Safari)
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
  const isIOSPlatform = /iPhone|iPad|iPod/i.test(ua) || /iPhone|iPad|iPod/i.test(platform);
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSPlatform || isIPadOS;
}

/**
 * Checks if the standard Web Vibration API is natively supported (mostly Android / Chrome)
 */
export function isVibrateSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * Check if haptics is supported in any form on this device (iOS Taptic, Android Vibrate, or Audio-Tactile)
 */
export function isHapticSupported(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if haptic feedback is globally enabled by user preferences
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
 * Creates and mounts a hidden native Switch control in the DOM.
 * In iOS Safari (iOS 17.4+ & iOS 18/19), triggering an input[type="checkbox"][switch]
 * or toggling switch controls causes the iOS system to invoke the physical Taptic Engine.
 */
function ensureIOSTapticElement(): { input: HTMLInputElement; label: HTMLLabelElement } | null {
  if (typeof document === 'undefined') return null;
  
  if (iosTapticInput && iosTapticLabel && document.body.contains(iosTapticInput)) {
    return { input: iosTapticInput, label: iosTapticLabel };
  }

  try {
    const container = document.createElement('div');
    container.id = 'pmo-ios-haptic-mount';
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.opacity = '0.001';
    container.style.pointerEvents = 'none';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.zIndex = '-9999';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'pmo-taptic-switch';
    input.setAttribute('switch', ''); // iOS 17.4+ switch attribute
    input.tabIndex = -1;
    input.style.opacity = '0.01';

    const label = document.createElement('label');
    label.htmlFor = 'pmo-taptic-switch';

    container.appendChild(input);
    container.appendChild(label);
    document.body.appendChild(container);

    iosTapticInput = input;
    iosTapticLabel = label;
    return { input, label };
  } catch {
    return null;
  }
}

/**
 * Fires the physical Taptic Engine pulse on iOS Safari
 */
function triggerIOSTapticFeedback(type: HapticType = 'light'): void {
  try {
    const elements = ensureIOSTapticElement();
    if (!elements) return;

    const { input, label } = elements;

    // Toggle checked state
    input.checked = !input.checked;

    // Dispatch native change/click events which trigger Taptic Engine on iOS WebKit
    const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    label.dispatchEvent(clickEvt);

    if (type === 'success' || type === 'complete' || type === 'warning' || type === 'error') {
      // Dispatch secondary pulse for compound haptics
      setTimeout(() => {
        try {
          input.checked = !input.checked;
          label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch {}
      }, 70);
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Aggressively unlocks the Web Audio pipeline on first user interaction.
 * Required by iOS WebKit and mobile browsers.
 */
function unlockAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }

    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      if (!isAudioUnlocked) {
        // Play 1ms silent buffer to wake iOS audio hardware
        const buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate || 44100);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
        isAudioUnlocked = true;
      }
    }
  } catch {
    // Silently continue
  }

  return audioCtx;
}

// Auto-register touch/pointer listeners to unlock audio immediately on first gesture
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    unlockAudioContext();
    ensureIOSTapticElement();
  };

  ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'mousedown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, handleInteraction, { passive: true, capture: true });
  });
}

/**
 * Generates an ultra-crisp tactile acoustic micro-impulse (120Hz-280Hz transient waveform).
 * Provides crisp tactile acoustic feedback across speakers/earpieces on iOS and mobile browsers.
 */
function playTactileAudioPulse(type: HapticType = 'light'): void {
  try {
    const ctx = unlockAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let startFreq = 180;
    let endFreq = 45;
    let duration = 0.016;
    let peakGain = 0.22;
    let waveType: OscillatorType = 'sine';

    switch (type) {
      case 'success':
      case 'complete':
        startFreq = 260;
        endFreq = 70;
        duration = 0.022;
        peakGain = 0.32;
        waveType = 'triangle';
        // Double tap schedule
        setTimeout(() => {
          try {
            if (!ctx) return;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(340, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.025);
            gain2.gain.setValueAtTime(0.35, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.025);
          } catch {}
        }, 75);
        break;

      case 'threshold':
        startFreq = 210;
        endFreq = 60;
        duration = 0.012;
        peakGain = 0.18;
        break;

      case 'heavy':
      case 'impact':
        startFreq = 120;
        endFreq = 30;
        duration = 0.04;
        peakGain = 0.45;
        waveType = 'triangle';
        break;

      case 'medium':
        startFreq = 160;
        endFreq = 45;
        duration = 0.02;
        peakGain = 0.25;
        break;

      case 'warning':
      case 'error':
        startFreq = 95;
        endFreq = 30;
        duration = 0.045;
        peakGain = 0.4;
        waveType = 'sawtooth';
        break;

      case 'selection':
        startFreq = 220;
        endFreq = 70;
        duration = 0.012;
        peakGain = 0.16;
        break;

      case 'light':
      case 'edit':
      default:
        startFreq = 190;
        endFreq = 50;
        duration = 0.015;
        peakGain = 0.2;
        break;
    }

    osc.type = waveType;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);

    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Silently continue
  }
}

/**
 * Triggers universal tactile haptic feedback:
 * - On iOS / iPhone: Fires native Taptic Switch impulse + low-latency audio-tactile pulse
 * - On Android / Chromium: Fires hardware Vibration API (navigator.vibrate) + audio-tactile pulse
 * 
 * @param type Haptic preset name or custom duration pattern
 * @returns boolean indicating if haptic was dispatched
 */
export function triggerHaptic(type: HapticType | string | number | number[] = 'light'): boolean {
  if (!isHapticsGloballyEnabled()) {
    return false;
  }

  const hapticKey: HapticType = typeof type === 'string' && type in HAPTIC_PATTERNS
    ? (type as HapticType)
    : 'light';

  let vibrationDispatched = false;

  // 1. Android / Supported Hardware Vibration API
  if (isVibrateSupported()) {
    try {
      const pattern = typeof type === 'string'
        ? (HAPTIC_PATTERNS[type as HapticType] ?? [40])
        : type;

      vibrationDispatched = navigator.vibrate(pattern);
    } catch {
      vibrationDispatched = false;
    }
  }

  // 2. iOS Taptic Engine Trigger (iPhone 17 Pro / 16 Pro / 15 Pro / iOS 17.4+)
  if (isIOSDevice() || !vibrationDispatched) {
    triggerIOSTapticFeedback(hapticKey);
  }

  // 3. Audio-Tactile Acoustic Micro-Click (universal reinforcement)
  playTactileAudioPulse(hapticKey);

  return true;
}
