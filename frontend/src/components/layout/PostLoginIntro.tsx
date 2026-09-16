import {
  useEffect,
} from 'react';

interface PostLoginIntroProps {
  onComplete: () => void;
}

const INTRO_DURATION_MS = 4200;
const REDUCED_MOTION_DURATION_MS = 120;

export function PostLoginIntro({
  onComplete,
}: PostLoginIntroProps) {
  useEffect(() => {
    document.documentElement.classList.add(
      'codegym-depth-layers-active',
    );

    const prefersReducedMotion =
      window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches ?? false;

    const timeoutId = window.setTimeout(
      onComplete,
      prefersReducedMotion
        ? REDUCED_MOTION_DURATION_MS
        : INTRO_DURATION_MS,
    );

    return () => {
      window.clearTimeout(timeoutId);

      document.documentElement.classList.remove(
        'codegym-depth-layers-active',
      );
    };
  }, [onComplete]);

  return (
    <div
      className="codegym-post-login-intro"
      role="status"
      aria-label="Bienvenido a CodeGym"
    >
      <div className="codegym-depth-welcome">
        <div className="codegym-depth-title">
          <span className="codegym-depth-typing">
            Bienvenido a{' '}
            <strong>CodeGym</strong>
          </span>

          <span
            className="codegym-depth-cursor"
            aria-hidden="true"
          >
            |
          </span>
        </div>

        <p className="codegym-depth-subtitle">
          Tu espacio de entrenamiento está listo.
        </p>
      </div>
    </div>
  );
}
