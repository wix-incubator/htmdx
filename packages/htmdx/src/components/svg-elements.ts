// Inline SVG has its own element and attribute space, so it gets its own
// allowlist rather than an extension of the HTML one. Two properties of SVG
// drive the shape of this file: element and attribute names are case sensitive
// (`linearGradient`, `viewBox`), and the forgiving HTML parse uppercases tag
// names while lowercasing attribute names. Both are keyed by lowercase and
// resolve to canonical casing, so either parse path lands on the same element.
//
// Left out on purpose: `<script>`, `<foreignObject>`, `<use>`, `<image>`,
// `<feImage>`, the animation elements, and `<a>`. Each is a way to reach outside
// the graphic — into script, into HTML, or into another document. Every filter
// primitive that only computes from its inputs is allowed; `<feImage>` is the
// one that loads a document, so it is the one that is not.
import { HtmdxSourceError } from '../diagnostics';
import { safeStyle } from './html-elements';

const ELEMENT_NAMES = [
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'g',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'switch',
  'symbol',
  'text',
  'textPath',
  'title',
  'tspan',
];

/** Lowercased tag name to the casing React and the SVG DOM expect. */
export const SVG_ELEMENTS = new Map(ELEMENT_NAMES.map((name) => [name.toLowerCase(), name]));

// Attributes every element may carry, on top of `aria-*` and `data-*`. The two
// conditional ones are what makes `<switch>` able to choose a branch.
const GLOBAL_ATTRIBUTES = new Set([
  'class',
  'id',
  'lang',
  'requiredextensions',
  'role',
  'style',
  'systemlanguage',
  'tabindex',
  'transform',
]);

// Presentation attributes are valid on any renderable element and are the SVG
// equivalent of styling, so they are shared rather than repeated per element.
const PRESENTATION_ATTRIBUTES = new Set([
  'alignment-baseline',
  'baseline-shift',
  'clip-path',
  'clip-rule',
  'color',
  'color-interpolation',
  'color-interpolation-filters',
  'direction',
  'display',
  'dominant-baseline',
  'fill',
  'fill-opacity',
  'fill-rule',
  'filter',
  'font-family',
  'font-size',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'image-rendering',
  'letter-spacing',
  'lighting-color',
  'marker-end',
  'marker-mid',
  'marker-start',
  'mask',
  'mask-type',
  'mix-blend-mode',
  'opacity',
  'overflow',
  'paint-order',
  'pointer-events',
  'shape-rendering',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'text-decoration',
  'text-rendering',
  'transform-origin',
  'unicode-bidi',
  'vector-effect',
  'visibility',
  'word-spacing',
  'writing-mode',
]);

const FILTER_PRIMITIVE_ATTRIBUTES = ['height', 'in', 'result', 'width', 'x', 'y'] as const;

function filterPrimitive(...extra: string[]) {
  return new Set([...FILTER_PRIMITIVE_ATTRIBUTES, ...extra]);
}

// The four `<feFunc*>` channels share one attribute set; they differ only in
// which channel of `<feComponentTransfer>` they describe.
function transferFunction() {
  return new Set(['amplitude', 'exponent', 'intercept', 'offset', 'slope', 'tablevalues', 'type']);
}

const ELEMENT_ATTRIBUTES = new Map([
  ['circle', new Set(['cx', 'cy', 'r', 'pathlength'])],
  ['clippath', new Set(['clippathunits'])],
  ['ellipse', new Set(['cx', 'cy', 'rx', 'ry', 'pathlength'])],
  ['feblend', filterPrimitive('in2', 'mode')],
  ['fecolormatrix', filterPrimitive('type', 'values')],
  ['fecomponenttransfer', filterPrimitive()],
  ['fecomposite', filterPrimitive('in2', 'k1', 'k2', 'k3', 'k4', 'operator')],
  [
    'feconvolvematrix',
    filterPrimitive(
      'bias',
      'divisor',
      'edgemode',
      'kernelmatrix',
      'kernelunitlength',
      'order',
      'preservealpha',
      'targetx',
      'targety',
    ),
  ],
  ['fediffuselighting', filterPrimitive('diffuseconstant', 'surfacescale')],
  ['fedisplacementmap', filterPrimitive('in2', 'scale', 'xchannelselector', 'ychannelselector')],
  ['fedistantlight', new Set(['azimuth', 'elevation'])],
  ['fedropshadow', filterPrimitive('dx', 'dy', 'stddeviation')],
  ['feflood', filterPrimitive('flood-color', 'flood-opacity')],
  ['fefunca', transferFunction()],
  ['fefuncb', transferFunction()],
  ['fefuncg', transferFunction()],
  ['fefuncr', transferFunction()],
  ['fegaussianblur', filterPrimitive('edgemode', 'stddeviation')],
  ['femerge', filterPrimitive()],
  ['femergenode', new Set(['in'])],
  ['femorphology', filterPrimitive('operator', 'radius')],
  ['feoffset', filterPrimitive('dx', 'dy')],
  ['fepointlight', new Set(['x', 'y', 'z'])],
  ['fespecularlighting', filterPrimitive('specularconstant', 'specularexponent', 'surfacescale')],
  [
    'fespotlight',
    new Set([
      'limitingconeangle',
      'pointsatx',
      'pointsaty',
      'pointsatz',
      'specularexponent',
      'x',
      'y',
      'z',
    ]),
  ],
  ['fetile', filterPrimitive()],
  ['feturbulence', filterPrimitive('basefrequency', 'numoctaves', 'seed', 'stitchtiles', 'type')],
  ['filter', new Set(['filterunits', 'height', 'primitiveunits', 'width', 'x', 'y'])],
  ['line', new Set(['pathlength', 'x1', 'x2', 'y1', 'y2'])],
  [
    'lineargradient',
    new Set(['gradienttransform', 'gradientunits', 'spreadmethod', 'x1', 'x2', 'y1', 'y2']),
  ],
  [
    'marker',
    new Set([
      'markerheight',
      'markerunits',
      'markerwidth',
      'orient',
      'preserveaspectratio',
      'refx',
      'refy',
      'viewbox',
    ]),
  ],
  ['mask', new Set(['height', 'maskcontentunits', 'maskunits', 'width', 'x', 'y'])],
  ['path', new Set(['d', 'pathlength'])],
  [
    'pattern',
    new Set([
      'height',
      'patterncontentunits',
      'patterntransform',
      'patternunits',
      'preserveaspectratio',
      'viewbox',
      'width',
      'x',
      'y',
    ]),
  ],
  ['polygon', new Set(['pathlength', 'points'])],
  ['polyline', new Set(['pathlength', 'points'])],
  [
    'radialgradient',
    new Set([
      'cx',
      'cy',
      'fr',
      'fx',
      'fy',
      'gradienttransform',
      'gradientunits',
      'r',
      'spreadmethod',
    ]),
  ],
  ['rect', new Set(['height', 'pathlength', 'rx', 'ry', 'width', 'x', 'y'])],
  ['stop', new Set(['offset'])],
  ['svg', new Set(['height', 'preserveaspectratio', 'viewbox', 'width', 'xmlns'])],
  [
    'symbol',
    new Set(['height', 'preserveaspectratio', 'refx', 'refy', 'viewbox', 'width', 'x', 'y']),
  ],
  ['text', new Set(['dx', 'dy', 'lengthadjust', 'rotate', 'textlength', 'x', 'y'])],
  ['textpath', new Set(['href', 'method', 'side', 'spacing', 'startoffset', 'textlength'])],
  ['tspan', new Set(['dx', 'dy', 'lengthadjust', 'rotate', 'textlength', 'x', 'y'])],
]);

// Attributes whose SVG spelling is not recoverable by lowercasing, plus the few
// React renames. Everything else is either already lowercase or hyphenated,
// and hyphenated names camel-case mechanically.
const CANONICAL_NAMES = new Map([
  ['basefrequency', 'baseFrequency'],
  ['class', 'className'],
  ['clippathunits', 'clipPathUnits'],
  ['diffuseconstant', 'diffuseConstant'],
  ['edgemode', 'edgeMode'],
  ['filterunits', 'filterUnits'],
  ['gradienttransform', 'gradientTransform'],
  ['gradientunits', 'gradientUnits'],
  ['kernelmatrix', 'kernelMatrix'],
  ['kernelunitlength', 'kernelUnitLength'],
  ['lengthadjust', 'lengthAdjust'],
  ['limitingconeangle', 'limitingConeAngle'],
  ['markerheight', 'markerHeight'],
  ['markerunits', 'markerUnits'],
  ['markerwidth', 'markerWidth'],
  ['maskcontentunits', 'maskContentUnits'],
  ['maskunits', 'maskUnits'],
  ['numoctaves', 'numOctaves'],
  ['pathlength', 'pathLength'],
  ['patterncontentunits', 'patternContentUnits'],
  ['patterntransform', 'patternTransform'],
  ['patternunits', 'patternUnits'],
  ['pointsatx', 'pointsAtX'],
  ['pointsaty', 'pointsAtY'],
  ['pointsatz', 'pointsAtZ'],
  ['preserveaspectratio', 'preserveAspectRatio'],
  ['preservealpha', 'preserveAlpha'],
  ['primitiveunits', 'primitiveUnits'],
  ['refx', 'refX'],
  ['refy', 'refY'],
  ['requiredextensions', 'requiredExtensions'],
  ['specularconstant', 'specularConstant'],
  ['specularexponent', 'specularExponent'],
  ['spreadmethod', 'spreadMethod'],
  ['startoffset', 'startOffset'],
  ['stddeviation', 'stdDeviation'],
  ['stitchtiles', 'stitchTiles'],
  ['surfacescale', 'surfaceScale'],
  ['systemlanguage', 'systemLanguage'],
  ['tabindex', 'tabIndex'],
  ['tablevalues', 'tableValues'],
  ['targetx', 'targetX'],
  ['targety', 'targetY'],
  ['textlength', 'textLength'],
  ['viewbox', 'viewBox'],
  ['xchannelselector', 'xChannelSelector'],
  ['ychannelselector', 'yChannelSelector'],
]);

// React knows the hyphenated presentation attributes by their camel-cased prop
// name and writes the hyphen back out — except these two, which it has no entry
// for and would emit verbatim as `maskType`. SVG attribute names are case
// sensitive, so that is a dead attribute. Passing the hyphen straight through
// makes React treat them as custom attributes and render them unchanged.
const HYPHENATED_PROPS = new Set(['mask-type', 'mix-blend-mode']);

// A paint value may reference a gradient, mask, or filter defined in the same
// document. That is the only `url()` an SVG attribute is allowed to carry: no
// scheme, no path, no other document.
const LOCAL_REFERENCE = /^url\(\s*(['"]?)#[A-Za-z_][\w.:-]*\1\s*\)$/;
const FRAGMENT = /^#[A-Za-z_][\w.:-]*$/;

export function safeSvgProps(
  tagName: string,
  attributes: { name: string; value: string }[],
): Record<string, unknown> {
  const allowed = ELEMENT_ATTRIBUTES.get(tagName.toLowerCase());
  const props: Record<string, unknown> = {};

  for (const { name, value } of attributes) {
    const attribute = name.toLowerCase();
    if (attribute.startsWith('on')) {
      throw new HtmdxSourceError(
        'event-handler-attribute',
        `event handler attribute "${name}" is not allowed`,
      );
    }
    if (/^(?:aria|data)-[a-z0-9_.:-]+$/.test(attribute)) {
      props[attribute] = value;
      continue;
    }
    if (attribute === 'href' || attribute === 'xlink:href') {
      // Only a same-document reference, and only where an SVG element needs one
      // to be useful at all. Anything else is a way out of the graphic.
      if (allowed?.has('href') && FRAGMENT.test(value.trim())) {
        props.href = value.trim();
      }
      continue;
    }
    if (
      !GLOBAL_ATTRIBUTES.has(attribute) &&
      !PRESENTATION_ATTRIBUTES.has(attribute) &&
      !allowed?.has(attribute)
    ) {
      continue;
    }
    if (attribute === 'style') {
      const style = safeStyle(value);
      if (style) {
        props.style = style;
      }
      continue;
    }
    if (value.includes('url(') && !LOCAL_REFERENCE.test(value.trim())) {
      continue;
    }
    props[reactPropName(attribute)] = value;
  }
  return props;
}

function reactPropName(attribute: string) {
  const canonical = CANONICAL_NAMES.get(attribute);
  if (canonical) {
    return canonical;
  }
  if (HYPHENATED_PROPS.has(attribute)) {
    return attribute;
  }
  return attribute.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
}
