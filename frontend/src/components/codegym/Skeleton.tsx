import type {
  ComponentPropsWithoutRef,
  ElementType,
} from 'react';

import { cn } from '@/lib/utils';

import './skeleton.css';

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
        'codegym-skeleton rounded-md',
        className,
      )}
      {...props}
    />
  );
}
