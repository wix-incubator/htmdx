import type { HTMLAttributes } from 'react';

// The universal attributes every component accepts. A component's other props
// are its data, not attributes for the DOM.
export function domAttributes(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(([name]) => name === 'id' || /^(aria|data)-/.test(name)),
  ) as HTMLAttributes<HTMLElement>;
}
