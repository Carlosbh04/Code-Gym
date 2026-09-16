import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

import './page-load-transition.css';

const MIN_SKELETON_VISIBLE_MS = 650;

const presentedKeys = new Set<string>();

type TransitionPhase =
  | 'loading'
  | 'exiting'
  | 'entering'
  | 'ready';

interface PageLoadTransitionProps {
  readonly loading: boolean;
  readonly skeleton: ReactNode;
  readonly children: ReactNode;
  readonly presentationKey: string;
  readonly alwaysShowInitialSkeleton?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}

export function PageLoadTransition({
  loading,
  skeleton,
  children,
  presentationKey,
  alwaysShowInitialSkeleton = false,
  className,
  ariaLabel,
}: PageLoadTransitionProps) {
  const shouldShowInitialSkeleton =
    loading
    || alwaysShowInitialSkeleton
    || !presentedKeys.has(presentationKey);

  const [phase, setPhase] =
    useState<TransitionPhase>(
      shouldShowInitialSkeleton
        ? 'loading'
        : 'entering',
    );

  const skeletonShownAt = useRef(
    shouldShowInitialSkeleton
      ? Date.now()
      : 0,
  );

  useEffect(() => {
    let timeoutId:
      | ReturnType<typeof setTimeout>
      | undefined;

    if (loading) {
      if (phase !== 'loading') {
        skeletonShownAt.current = Date.now();
        setPhase('loading');
      }

      return;
    }

    if (phase !== 'loading') {
      return;
    }

    const elapsed =
      Date.now() - skeletonShownAt.current;

    const remaining = Math.max(
      0,
      MIN_SKELETON_VISIBLE_MS - elapsed,
    );

    timeoutId = setTimeout(() => {
      presentedKeys.add(presentationKey);
      setPhase('exiting');
    }, remaining);

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    loading,
    phase,
    presentationKey,
  ]);

  const handleSkeletonAnimationEnd = (
    event: AnimationEvent<HTMLDivElement>,
  ) => {
    if (
      event.target !== event.currentTarget
      || phase !== 'exiting'
      || loading
    ) {
      return;
    }

    setPhase('entering');
  };

  const handleContentAnimationEnd = (
    event: AnimationEvent<HTMLDivElement>,
  ) => {
    if (
      event.target !== event.currentTarget
      || phase !== 'entering'
    ) {
      return;
    }

    setPhase('ready');
  };

  const busy =
    loading
    || phase === 'loading'
    || phase === 'exiting';

  return (
    <div
      className={cn(
        'page-load-transition',
        className,
      )}
      data-phase={phase}
      aria-busy={busy}
      aria-label={ariaLabel}
    >
      {phase === 'loading'
        || phase === 'exiting' ? (
        <div
          className="page-load-transition__skeleton"
          data-testid="page-load-skeleton"
          aria-hidden={
            phase === 'exiting'
              ? 'true'
              : undefined
          }
          onAnimationEnd={
            handleSkeletonAnimationEnd
          }
        >
          {skeleton}
        </div>
      ) : null}

      {phase === 'entering'
        || phase === 'ready' ? (
        <div
          className="page-load-transition__content"
          data-testid="page-load-content"
          onAnimationEnd={
            handleContentAnimationEnd
          }
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
