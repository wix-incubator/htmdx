import { parseComponentBody } from '../../body-contracts';
import { InlineMarkdown, StructuredBlock, type StructuredBodyProps } from '../shared/structured';

export function Timeline({ body = '', className, ...attributes }: StructuredBodyProps) {
  const items = parseComponentBody('Timeline', 'label-value-list', body);
  return (
    <StructuredBlock name="Timeline" className={className} {...attributes}>
      <div className="w-full rounded-[var(--md-sys-shape-corner-large)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] px-5 py-4">
        {items.map((item, index) => (
          <div key={index} className="relative pt-1.5 pr-0 pb-[22px] pl-7 last:pb-1">
            <span className="absolute top-[13px] left-0 z-10 size-2.5 rounded-full border-2 border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-lowest)]" />
            {index < items.length - 1 ? (
              <span className="absolute top-[18px] bottom-[-18px] left-1 w-0.5 bg-[var(--md-sys-color-primary)]" />
            ) : null}
            <div className="text-xs font-semibold tracking-wide text-[var(--md-sys-color-primary)] uppercase">
              <InlineMarkdown text={item.label} />
            </div>
            <div className="mt-0.5 text-[var(--md-sys-color-on-surface)]">
              <InlineMarkdown text={item.value} />
            </div>
          </div>
        ))}
      </div>
    </StructuredBlock>
  );
}
