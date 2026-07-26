// Both markers are absent from a correct browser bundle and fatal at runtime
// when present, and neither is caught by typecheck, tests, or `htmdx compile`.
// A marker only earns a place here once it has been observed in a broken build.
const DEVELOPMENT_ARTIFACTS = [
  {
    marker: 'jsxDEV',
    problem: 'was compiled with the development JSX transform',
    consequence: 'the bundled React runtime leaves jsxDEV undefined, so every component throws',
  },
  {
    marker: 'process.env',
    problem: 'reads process.env at runtime',
    consequence: 'the IIFE throws on `process` in a browser',
  },
];

export function validateProductionBundle(fileName, code) {
  const errors = DEVELOPMENT_ARTIFACTS.filter(({ marker }) => code.includes(marker)).map(
    ({ problem, consequence }) => `${fileName} ${problem}; ${consequence}`,
  );

  if (errors.length) {
    throw new Error(`Found the following production bundle errors:\n\n- ${errors.join('\n\n- ')}`);
  }
}
