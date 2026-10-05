import { createContext } from 'react';

// What a mockup's CopyFields show. ContentReview renders the same mockup once
// for Before and once per version, each under its own value.
export type ReviewFieldContextValue = {
  values: Record<string, string>;
  // Before's text to diff against; undefined draws the text unmarked.
  before?: Record<string, string>;
  // While editing, the fields become editable text and report each change.
  onEdit?: (field: string, text: string) => void;
};

export const ReviewFieldContext = createContext<ReviewFieldContextValue | null>(null);
