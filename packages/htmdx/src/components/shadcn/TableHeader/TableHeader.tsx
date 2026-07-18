// Vendored shadcn/ui table header (new-york), split into its own component file.
import * as React from 'react';

import { withoutTableFormattingWhitespace } from '../shared/table';
import { cn } from '../shared/utils';

function TableHeader({ className, children, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props}>
      {withoutTableFormattingWhitespace(children)}
    </thead>
  );
}

export { TableHeader };
