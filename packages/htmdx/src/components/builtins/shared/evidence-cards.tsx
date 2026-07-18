import { InlineMarkdown, splitFeature, StructuredBlock } from './structured';

type EvidenceCardGridProps = {
  name: string;
  items: string[];
  className?: string;
  attributes: Record<string, unknown>;
};

export function EvidenceCardGrid({ name, items, className, attributes }: EvidenceCardGridProps) {
  return (
    <StructuredBlock name={name} className={className} {...attributes}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => {
          const { title, text } = splitFeature(item);
          return (
            <div key={index} className="rounded-lg border bg-card p-4">
              {title ? (
                <div className="font-semibold text-card-foreground">
                  <InlineMarkdown text={title} />
                </div>
              ) : null}
              <div className="text-sm text-muted-foreground">
                <InlineMarkdown text={text} />
              </div>
            </div>
          );
        })}
      </div>
    </StructuredBlock>
  );
}
