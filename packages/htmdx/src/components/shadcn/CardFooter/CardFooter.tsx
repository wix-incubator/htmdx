// Vendored shadcn/ui card footer (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export { CardFooter };
