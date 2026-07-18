// Vendored shadcn/ui table row (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export { TableRow };
