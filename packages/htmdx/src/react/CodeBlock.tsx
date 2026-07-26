// The single renderer for every block of code in a document: Markdown fences
// and raw <pre>/<pre><code> both land here, so the chrome, the language label,
// and the copy affordance never drift apart.
import { createElement, useRef, useState, type ReactNode } from 'react';
import { hasGrammar, tokenizeCode } from './highlight';
import { isStaticRender } from './static-render';

const COPY_RESET_MS = 1600;

export type CodeBlockProps = {
  code: string;
  // Empty when the fence carried no usable info string.
  language: string;
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  // compile() returns markup with no runtime attached, so a copy button there
  // would be a control nothing is listening to.
  const canCopy = !isStaticRender();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      // A denied clipboard permission is not a document error: the code is
      // selectable, so leave the button silent and let the reader select it.
      setCopied(false);
    }
  };

  return (
    <figure className="htmdx-code-figure" data-language={language || undefined}>
      <figcaption className="htmdx-code-bar">
        <span className="htmdx-code-language">{language || 'code'}</span>
        {canCopy ? (
          <button
            type="button"
            className="htmdx-code-copy"
            data-copied={copied || undefined}
            aria-label={copied ? 'Code copied' : 'Copy code'}
            onClick={copy}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        ) : null}
      </figcaption>
      <pre className="htmdx-code-block">
        <code className={language ? `language-${language}` : undefined}>
          {highlight(code, language)}
        </code>
      </pre>
    </figure>
  );
}

function highlight(code: string, language: string): ReactNode {
  if (!hasGrammar(language)) {
    return code;
  }
  return tokenizeCode(code, language).map((token, index) =>
    token.type === 'plain'
      ? token.value
      : createElement('span', { key: index, className: `htmdx-tok-${token.type}` }, token.value),
  );
}
