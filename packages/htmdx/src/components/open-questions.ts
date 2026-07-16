import type { HtmdxComponent } from './types';

export const openQuestions: HtmdxComponent = {
  name: 'OpenQuestions',
  body: 'markdown-list-cards',
  purpose:
    'An amber-framed panel of open questions and assumptions, each row carrying a labeled badge. Item title is the label (Assumption = blue, Risk = red, Open = amber); the text is the note.',
  example:
    '<OpenQuestions>\n- **Assumption:** FILE_UPLOAD render type on the Catalog V3 Modifier mechanism. To be confirmed in spec.\n- **Risk:** Required-before-add-to-cart carries an unmeasured buyer-conversion risk. Guardrail KPI at launch.\n- **Open:** Order-carriage path and buyer-file retention policy are deferred to spec.\n</OpenQuestions>',
};
