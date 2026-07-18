import { Children, type ReactNode } from 'react';

export function withoutTableFormattingWhitespace(children: ReactNode) {
  return Children.toArray(children).filter(
    (child) => typeof child !== 'string' || child.trim() !== '',
  );
}
