// ReviewScreen, ReviewElement, ReviewMockup and ReviewVersion are data, not
// views: ContentReview reads their props and children and draws the review
// itself. Rendered anywhere else they have nothing to draw, so they say where
// they belong instead of disappearing.
export function reviewMarker(name: string) {
  function ReviewMarker(): never {
    throw new Error(`<${name}> only works inside <ContentReview>`);
  }
  ReviewMarker.displayName = name;
  return ReviewMarker;
}
