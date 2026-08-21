import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimationControls } from 'motion/react';
import { CheckCircle2, Edit2, Undo2, Sparkles, Smartphone, ArrowLeft, ArrowRight, Vibrate } from 'lucide-react';
import { triggerHaptic, isHapticSupported, HapticType } from '../../utils/haptics';

export interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  swipeRightLabel?: string;
  swipeRightIcon?: React.ReactNode;
  swipeRightColor?: string;
  swipeRightHapticType?: HapticType;
  swipeLeftLabel?: string;
  swipeLeftIcon?: React.ReactNode;
  swipeLeftColor?: string;
  swipeLeftHapticType?: HapticType;
  threshold?: number;
  isCompleted?: boolean;
  showFirstTimeHint?: boolean;
  hintStorageKey?: string;
  className?: string;
  disabled?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  swipeRightLabel = 'Mark Complete',
  swipeRightIcon,
  swipeRightColor = 'from-emerald-600 to-teal-600',
  swipeRightHapticType = 'success',
  swipeLeftLabel = 'Edit Task',
  swipeLeftIcon,
  swipeLeftColor = 'from-indigo-600 to-purple-600',
  swipeLeftHapticType = 'edit',
  threshold = 75,
  isCompleted = false,
  showFirstTimeHint = false,
  hintStorageKey = 'pmo_swipe_hint_seen',
  className = '',
  disabled = false,
}) => {
  const x = useMotionValue(0);
  const controls = useAnimationControls();
  const [isDragging, setIsDragging] = useState(false);
  const [triggeredAction, setTriggeredAction] = useState<'right' | 'left' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasCrossedThresholdRef = useRef<'right' | 'left' | null>(null);

  // Transform values based on drag offset
  const rightOpacity = useTransform(x, [0, 40, threshold], [0, 0.6, 1]);
  const leftOpacity = useTransform(x, [-threshold, -40, 0], [1, 0.6, 0]);
  const rightScale = useTransform(x, [0, threshold], [0.8, 1.1]);
  const leftScale = useTransform(x, [-threshold, 0], [1.1, 0.8]);

  // Real-time threshold crossing tactile feedback during drag
  useEffect(() => {
    const unsubscribe = x.on('change', (latestX) => {
      if (disabled) return;

      // Crossed right activation boundary
      if (onSwipeRight && latestX >= threshold && hasCrossedThresholdRef.current !== 'right') {
        hasCrossedThresholdRef.current = 'right';
        triggerHaptic('threshold');
      }
      // Crossed left activation boundary
      else if (onSwipeLeft && latestX <= -threshold && hasCrossedThresholdRef.current !== 'left') {
        hasCrossedThresholdRef.current = 'left';
        triggerHaptic('threshold');
      }
      // Returned within deadzone / center
      else if (Math.abs(latestX) < threshold * 0.4) {
        hasCrossedThresholdRef.current = null;
      }
    });

    return () => unsubscribe();
  }, [threshold, onSwipeRight, onSwipeLeft, disabled, x]);

  // First-time teaser animation
  useEffect(() => {
    if (!showFirstTimeHint || disabled) return;

    const hasSeen = localStorage.getItem(hintStorageKey);
    if (!hasSeen) {
      // Trigger a gentle peek animation after a short delay so the user notices
      const timer = setTimeout(async () => {
        try {
          await controls.start({
            x: 42,
            transition: { duration: 0.45, ease: 'easeOut' },
          });
          await controls.start({
            x: -42,
            transition: { duration: 0.55, ease: 'easeInOut' },
          });
          await controls.start({
            x: 0,
            transition: { type: 'spring', stiffness: 350, damping: 25 },
          });
          localStorage.setItem(hintStorageKey, 'true');
        } catch {
          // Animation cancelled or unmounted
        }
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [showFirstTimeHint, hintStorageKey, controls, disabled]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    setIsDragging(false);
    hasCrossedThresholdRef.current = null;
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Trigger right action (Swipe Right -> Complete / Milestone)
    if (onSwipeRight && (offset > threshold || (offset > 40 && velocity > 300))) {
      setTriggeredAction('right');
      triggerHaptic(swipeRightHapticType);
      setTimeout(() => {
        onSwipeRight();
        setTriggeredAction(null);
      }, 200);
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } });
      return;
    }

    // Trigger left action (Swipe Left -> Edit Task)
    if (onSwipeLeft && (offset < -threshold || (offset < -40 && velocity < -300))) {
      setTriggeredAction('left');
      triggerHaptic(swipeLeftHapticType);
      setTimeout(() => {
        onSwipeLeft();
        setTriggeredAction(null);
      }, 200);
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } });
      return;
    }

    // Reset back to center smoothly
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } });
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl select-none group touch-pan-y ${className}`}>
      {/* BACKGROUND ACTION UNDERLAYS */}
      {!disabled && (
        <div className="absolute inset-0 flex items-stretch justify-between pointer-events-none rounded-2xl overflow-hidden">
          {/* Left Action Underlay (Revealed on Swipe Right) */}
          <motion.div
            style={{ opacity: rightOpacity }}
            className={`w-full bg-gradient-to-r ${swipeRightColor} flex items-center justify-start pl-4 sm:pl-6 text-white font-bold text-xs gap-2`}
          >
            <motion.div style={{ scale: rightScale }} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-md">
                {swipeRightIcon || (isCompleted ? <Undo2 className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4 text-white" />)}
              </div>
              <span className="tracking-wide uppercase text-[11px] font-black drop-shadow-sm whitespace-nowrap">
                {swipeRightLabel}
              </span>
            </motion.div>
          </motion.div>

          {/* Right Action Underlay (Revealed on Swipe Left) */}
          <motion.div
            style={{ opacity: leftOpacity }}
            className={`w-full bg-gradient-to-l ${swipeLeftColor} flex items-center justify-end pr-4 sm:pr-6 text-white font-bold text-xs gap-2`}
          >
            <motion.div style={{ scale: leftScale }} className="flex items-center gap-2">
              <span className="tracking-wide uppercase text-[11px] font-black drop-shadow-sm whitespace-nowrap">
                {swipeLeftLabel}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-md">
                {swipeLeftIcon || <Edit2 className="w-4 h-4 text-white" />}
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* SWIPEABLE FOREGROUND CONTENT CARD */}
      <motion.div
        ref={cardRef}
        animate={controls}
        drag={disabled ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: onSwipeLeft ? -130 : 0, right: onSwipeRight ? 130 : 0 }}
        dragElastic={0.2}
        dragSnapToOrigin
        onDragStart={() => {
          setIsDragging(true);
          triggerHaptic('selection');
        }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative z-10 w-full bg-slate-950 transition-shadow ${
          isDragging ? 'shadow-2xl cursor-grabbing' : 'cursor-grab sm:cursor-auto'
        } ${triggeredAction ? 'opacity-90 transition-opacity' : ''}`}
      >
        {children}
      </motion.div>
    </div>
  );
};

export interface SwipeGestureGuideBannerProps {
  onDismiss?: () => void;
  onReplay?: () => void;
  storageKey?: string;
  title?: string;
  rightActionText?: string;
  leftActionText?: string;
  className?: string;
}

export const SwipeGestureGuideBanner: React.FC<SwipeGestureGuideBannerProps> = ({
  onDismiss,
  onReplay,
  storageKey = 'pmo_swipe_guide_dismissed',
  title = 'Mobile Gesture Shortcuts Active',
  rightActionText = 'Swipe Right: Mark Complete',
  leftActionText = 'Swipe Left: Edit Task',
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);
  const hapticAvailable = isHapticSupported();

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey);
    if (isDismissed) {
      setDismissed(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, 'true');
    triggerHaptic('light');
    if (onDismiss) onDismiss();
  };

  const handleTestHaptic = () => {
    triggerHaptic('success');
  };

  if (dismissed) {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            setDismissed(false);
            localStorage.removeItem(storageKey);
            triggerHaptic('selection');
            if (onReplay) onReplay();
          }}
          className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors py-0.5 px-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40"
          title="Show mobile swipe gestures hint"
        >
          <Smartphone className="w-3 h-3 text-indigo-400" />
          <span>Swipe Gestures</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{title}</span>
            {hapticAvailable && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                <Vibrate className="w-2.5 h-2.5" />
                Haptics ON
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-0.5">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <ArrowRight className="w-3 h-3 text-emerald-400" />
              <span>{rightActionText}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold">
              <ArrowLeft className="w-3 h-3 text-indigo-400" />
              <span>{leftActionText}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {hapticAvailable && (
          <button
            type="button"
            onClick={handleTestHaptic}
            className="px-2 py-1 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-emerald-300 bg-slate-900 border border-slate-800 hover:border-emerald-500/30 flex items-center gap-1 transition-colors"
            title="Test haptic vibration feedback"
          >
            <Vibrate className="w-3 h-3 text-emerald-400" />
            <span>Test Vibrate</span>
          </button>
        )}
        {onReplay && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onReplay();
            }}
            className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            Preview Motion
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors cursor-pointer"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

