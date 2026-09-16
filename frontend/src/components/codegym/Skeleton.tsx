import type {
  ComponentPropsWithoutRef,
  ElementType,
} from 'react';

import { cn } from '@/lib/utils';

type SkeletonProps<T extends ElementType> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Skeleton<
  T extends ElementType = 'div',
>({
  as,
  className,
  ...props
}: SkeletonProps<T>) {
  const Component = as ?? 'div';

  return (
    <Component
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
