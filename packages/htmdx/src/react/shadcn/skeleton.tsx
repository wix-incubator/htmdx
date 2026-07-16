// Vendored shadcn/ui skeleton (new-york), unmodified apart from the cn import
// path and an explicit React import for the ComponentProps type.
import * as React from 'react';

import { cn } from './utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-accent', className)}
      {...props}
    />
  );
}

export { Skeleton };
