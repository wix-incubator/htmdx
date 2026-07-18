// Vendored shadcn/ui card (new-york), split into one public component per file.
import * as React from 'react';

import { cn } from '../shared/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6',
        className,
      )}
      {...props}
    />
  );
}

export { Card };
