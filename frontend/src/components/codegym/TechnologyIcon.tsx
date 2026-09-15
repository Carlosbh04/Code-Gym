import type { HTMLAttributes } from 'react';
import { getTechnologyIcon } from '@/lib/technology-icons';
import { cn } from '@/lib/utils';

export interface TechnologyIconProps extends HTMLAttributes<HTMLSpanElement> {
  technologyId: string;
  technologyName: string;
  fallback?: string;
  imageClassName?: string;
}

/**
 * Único renderer de identidad visual de tecnologías.
 * Los PNG son decorativos cuando aparecen junto al nombre; el contenedor
 * conserva un fallback textual para tecnologías sin asset real.
 */
export function TechnologyIcon({
  technologyId,
  technologyName,
  fallback,
  className,
  imageClassName,
  ...props
}: TechnologyIconProps) {
  const source = getTechnologyIcon(technologyId);
  const identifier = fallback?.trim() || technologyName.slice(0, 2).toUpperCase();

  return (
    <span
      aria-hidden="true"
      data-technology-icon={technologyId}
      data-technology-icon-source={source === undefined ? 'fallback' : 'asset'}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10 text-xs font-bold uppercase text-primary',
        className,
      )}
      {...props}
    >
      {source === undefined ? (
        identifier
      ) : (
        <img
          src={source}
          alt=""
          draggable={false}
          className={cn('size-[78%] select-none object-contain', imageClassName)}
        />
      )}
    </span>
  );
}
