// Vendored shadcn/ui table footer (new-york), split into its own component file.
import * as React from 'react';

import { withoutTableFormattingWhitespace } from '../shared/table';
import { cn } from '../shared/utils';

function TableFooter({ className, children, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    >
      {withoutTableFormattingWhitespace(children)}
    </tfoot>
  );
}

export { TableFooter };
