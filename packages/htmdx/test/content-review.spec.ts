import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compile } from '../src';
import * as builtinDefinitions from '../src/components/builtins';
import * as shadcnDefinitions from '../src/components/shadcn';
import { contentReviewExample } from '../src/components/builtins/shared/review-example';
import {
  decisionsMessage,
  hasNews,
  liveComment,
  liveEdits,
  markCommentsSent,
  pickOf,
  setComment,
  setEdit,
  setPick,
  setRequests,
  type Decisions,
} from '../src/components/builtins/shared/review-decisions';
import { diffWords } from '../src/components/builtins/shared/review-diff';
import {
  buildReviewModel,
  reviewFingerprint,
  type ReviewModel,
} from '../src/components/builtins/shared/review-model';
import { compileToReact } from '../src/react';

const definitions = [...Object.values(builtinDefinitions), ...Object.values(shadcnDefinitions)];

const render = (source: string) => renderToStaticMarkup(compileToReact(source, { definitions }));

// The model is built from compiled children, so compile the source and read
// them back off the ContentReview element.
function modelOf(source: string): ReviewModel {
  let model: ReviewModel | undefined;
  const Capture = ({ children }: { children?: unknown }) => {
    model = buildReviewModel(children as never);
    return null;
  };
  renderToStaticMarkup(
    compileToReact(source, {
      definitions: [
        ...definitions.filter((definition) => definition.name !== 'ContentReview'),
        { ...builtinDefinitions.ContentReview, Component: Capture },
      ],
    }),
  );
  return model!;
}

const review = (elements: string) =>
  `<ContentReview title="Test">\n\n${elements}\n\n</ContentReview>`;

const element = (attrs = '', versions = '') => `<ReviewElement name="Banner"${attrs}>

<ReviewMockup>
<div><b><CopyField name="title" /></b> <a href="/x"><CopyField name="cta" /></a></div>
</ReviewMockup>

<ReviewVersion current="true">
- title: Save Changes
- cta: Learn More
</ReviewVersion>

<ReviewVersion label="Plain" why="Shorter.">
- title: Save changes
- cta: How it works
</ReviewVersion>
${versions}
</ReviewElement>`;

describe('diffWords', () => {
  test('marks a rewrite, a recapitalization, and a pure cut differently', () => {
    expect(diffWords('Try Again', 'Try again')).toEqual([
      { kind: 'same', text: 'Try ' },
      { kind: 'cased', text: 'again' },
    ]);
    expect(diffWords('Select a gender', 'Select')).toEqual([
      { kind: 'same', text: 'Select' },
      { kind: 'cut', text: 'a gender' },
    ]);
    expect(diffWords('', 'New text')).toEqual([{ kind: 'changed', text: 'New text' }]);
  });

  test('merges short unchanged gaps into one changed phrase', () => {
    const segments = diffWords('Your order is ready', 'Your new order is ready now and shipped');
    expect(segments.filter((segment) => segment.kind === 'changed')).toHaveLength(2);
    expect(diffWords('one two three', 'x two y').filter((s) => s.kind === 'changed')).toEqual([
      { kind: 'changed', text: 'x two y' },
    ]);
  });
});

describe('ContentReview model', () => {
  test('reads elements, inherits Before fields, and keeps the overview', () => {
    const model = modelOf(
      review(
        `Intro paragraph.\n\n${element(' group="Settings"', '<ReviewVersion label="Title only">\n- title: Saved\n</ReviewVersion>')}`,
      ),
    );
    const [banner] = model.elements;
    expect(model.overview).toHaveLength(1);
    expect(banner).toMatchObject({
      name: 'Banner',
      key: 'banner',
      group: 'Settings',
      changed: true,
    });
    expect(banner.before?.values).toEqual({ title: 'Save Changes', cta: 'Learn More' });
    expect(banner.versions[1].values).toEqual({ title: 'Saved', cta: 'Learn More' });
  });

  test('accepts a bare current attribute', () => {
    const model = modelOf(
      review(element().replace('<ReviewVersion current="true">', '<ReviewVersion current>')),
    );
    expect(model.elements[0].before?.values.title).toBe('Save Changes');
  });

  test('applies the reader’s edits written back by the agent', () => {
    const model = modelOf(
      review(
        element(
          '',
          `<ReviewVersion label="Edited" edited='{"cta":"See how & why"}'>\n- title: Save\n</ReviewVersion>`,
        ),
      ),
    );
    expect(model.elements[0].versions[1].values.cta).toBe('See how & why');
  });

  test.each([
    [
      element().replace('<ReviewVersion current="true">', '<ReviewVersion>'),
      'needs a <ReviewVersion current>',
    ],
    [element(' final="3"'), 'final="3" does not name a version'],
    [element(' screen="missing"'), 'no <ReviewScreen name="missing">'],
    [`${element()}\n\n${element()}`, 'two <ReviewElement>s are named "Banner"'],
    [
      element().replace('- cta: How it works', '- cta: How\n- cta: Twice'),
      'not a usable field name',
    ],
  ])('rejects a mistake with a message that names it', (body, message) => {
    expect(() => modelOf(review(body))).toThrow(message);
  });
});

describe('decisions', () => {
  const model = modelOf(review(element()));
  const banner = model.elements[0];
  const fingerprint = reviewFingerprint(model, 0);

  test('selecting, editing, and commenting produce one message', () => {
    let decisions: Decisions = {};
    decisions = setEdit(decisions, banner, 0, 'cta', 'See how it works');
    expect(pickOf(decisions, banner)).toBe(0);
    decisions = setComment(decisions, banner, 0, 'Keep it short.\nReally.');
    decisions = setRequests(decisions, banner, ['Warmer', '']);

    expect(decisionsMessage('Test', model.elements, decisions, fingerprint)).toBe(
      [
        'Content review decisions: Test',
        '',
        'Banner: Version 1 "Plain", with my edits',
        '  title: Save changes',
        '  cta: See how it works  (my edit)',
        '  Comments: Keep it short. / Really.',
        '  Add another version: Warmer',
      ].join('\n'),
    );
  });

  test('typing the original wording back drops the edit', () => {
    let decisions = setEdit({}, banner, 0, 'cta', 'Other');
    decisions = setEdit(decisions, banner, 0, 'cta', 'How it works');
    expect(liveEdits(decisions, banner, 0)).toEqual({});
  });

  test('clicking the selected version again clears it', () => {
    const decisions = setPick(setPick({}, banner, 0, true), banner, 0, false);
    expect(pickOf(decisions, banner)).toBeNull();
    expect(decisionsMessage('Test', model.elements, decisions, fingerprint)).toContain(
      'Not selected yet: Banner',
    );
  });

  test('a republish settles what was sent', () => {
    let decisions = setComment(setPick({}, banner, 0, true), banner, 0, 'Looks good');
    decisions = markCommentsSent(decisions, model.elements, fingerprint);
    expect(liveComment(decisions, banner, 0, fingerprint)).toBe('Looks good');

    const republished = modelOf(review(element(' final="1"')));
    const next = reviewFingerprint(republished, 1);
    const settled = republished.elements[0];
    expect(liveComment(decisions, settled, 0, next)).toBe('');
    expect(hasNews(decisions, settled, next)).toBe(false);
  });

  test('a selection drops when the agent rewrites that version', () => {
    const decisions = setPick({}, banner, 0, true);
    const rewritten = modelOf(
      review(element().replace('- cta: How it works', '- cta: Read the guide')),
    );
    expect(pickOf(decisions, rewritten.elements[0])).toBeNull();
  });
});

describe('ContentReview rendering', () => {
  test('compiles the canonical example and starts on the Overview', () => {
    const html = render(contentReviewExample);
    expect(html).toContain('data-htmdx-component="ContentReview"');
    expect(html).toContain('Elements reviewed (1)');
    expect(html).toContain('Reviewed with no change');
    expect(html).toContain('No Brands');
  });

  test('renders field text as text, never as markup', () => {
    const html = render(
      review(
        element().replace('- cta: Learn More', '- cta: Use &lt;img src=x onerror=alert(1)&gt;'),
      ),
    );
    expect(html).toContain('Use &lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src="x"');
  });

  test('links a field to a URL that each version can change', () => {
    const source = review(
      element()
        .replace(
          '<a href="/x"><CopyField name="cta" /></a>',
          '<CopyField name="cta" href="ctaUrl" />',
        )
        .replace('- cta: Learn More', '- cta: Learn More\n- ctaUrl: https://example.com/a')
        .replace('- cta: How it works', '- cta: How it works\n- ctaUrl: javascript:alert(1)'),
    );
    const html = render(source);
    expect(html).toContain('href="https://example.com/a"');
    expect(html).not.toContain('javascript:');
  });

  test('summarizes the feature and its assumptions', () => {
    const html = render(
      '<ReviewSummary whatItIs="Shoppers filter by brand." audience="Store owners.">\n- Brands come from Products:\n  - in the panel\n  - in cards\n</ReviewSummary>',
    );
    expect(html).toContain('About this feature');
    expect(html).toContain('Shoppers filter by brand.');
    expect(html).toMatch(/Brands come from Products:.*<li>.*in the panel.*<\/li>/);
  });

  test('explains where the parts belong when used alone', () => {
    expect(compile('<ReviewVersion current="true">\n- title: Hi\n</ReviewVersion>')).toEqual({
      ok: false,
      error: '<ReviewVersion> only works inside <ContentReview>',
    });
  });
});
