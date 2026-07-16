import * as React from 'react';

import { cn } from './utils';

function Spacer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="spacer"
      aria-hidden="true"
      className={cn('h-6 w-full shrink-0', className)}
      {...props}
    />
  );
}

export { Spacer };
