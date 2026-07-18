// Vendored shadcn/ui table (new-york), split into one public component per file.
import * as React from 'react';

import { withoutTableFormattingWhitespace } from '../shared/table';
import { cn } from '../shared/utils';

function Table({ className, children, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      >
        {withoutTableFormattingWhitespace(children)}
      </table>
    </div>
  );
}

export { Table };
