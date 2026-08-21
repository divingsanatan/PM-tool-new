/**
 * Tactile Haptic Feedback Utility (Navigator.vibrate API)
 * Provides distinct, tactile vibration feedback patterns for mobile gestures,
 * task completions, status transitions, edits, and UI interactions.
 */

export type HapticType =
  | 'success'     // Used when a task is completed / milestone marked (double tap)
  | 'complete'    // Alias for success
  | 'edit'        // Used when an edit / modal action is triggered (crisp single pulse)
  | 'threshold'   // Micro-tap fired the instant a card crosses its drag activation threshold
  | 'light'       // Micro tap (10ms)
  | 'medium'      // Medium tap (25ms)
  | 'heavy'       // Heavy tap (50ms)
  | 'warning'     // Alert / blocked / delete pattern
  | 'selection';  // Soft selection tap

export const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  success: [35, 45, 45],       // Double pulse: short tap + brief gap + solid confirmation tap
  complete: [35, 45, 45],
  edit: [40],                  // Crisp, snappy single pulse
  threshold: [12],             // Subtle micro-tick when drag crosses action threshold
  light: [10],
  medium: [25],
  heavy: [50],
  warning: [30, 40, 30, 40, 50],
  selection: [8],
};

/**
 * Checks if the current browser environment supports the Web Vibration API
 */
export function isHapticSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

/**
 * Triggers a tactile vibration using the Navigator.vibrate API.
 * Safely fails silently on unsupported devices or browsers (e.g. desktop).
 *
 * @param type Haptic preset name or custom pattern (milliseconds or array of durations)
 * @returns boolean indicating if the vibration was successfully dispatched
 */
export function triggerHaptic(type: HapticType | string | number | number[] = 'light'): boolean {
  if (!isHapticSupported()) {
    return false;
  }

  try {
    const pattern = typeof type === 'string'
      ? (HAPTIC_PATTERNS[type as HapticType] ?? 20)
      : type;

    return navigator.vibrate(pattern);
  } catch {
    // Graceful fallback if device policy or permission blocks vibration
    return false;
  }
}
