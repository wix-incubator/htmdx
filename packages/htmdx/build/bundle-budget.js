import { gzipSync } from 'node:zlib';

// Pinned so the number is reproducible across machines and Node releases. It is
// not what a CDN serves - unpkg and jsdelivr compress with their own settings -
// and it does not have to be. The budget guards against growth, so the metric
// only has to be deterministic and to move with the real size.
const GZIP_LEVEL = 9;

const METRIC_LABELS = {
  raw: 'raw',
  gzip: `gzip (zlib level ${GZIP_LEVEL})`,
};

export function measureBundle(contents) {
  return {
    raw: contents.length,
    gzip: gzipSync(contents, { level: GZIP_LEVEL }).length,
  };
}

export function formatBundleSizes(fileName, sizes, limits) {
  const parts = Object.keys(METRIC_LABELS).map((metric) => {
    const used = Math.round((sizes[metric] / limits[metric]) * 100);
    return `${metric} ${bytes(sizes[metric])} (${used}% of ${bytes(limits[metric])})`;
  });

  return `${fileName}: ${parts.join(', ')}`;
}

// A budget keyed on a file the build no longer emits enforces nothing, and it
// does it silently: the build stays green while the gate is gone. Renaming an
// output has to fail loudly rather than switch the check off.
export function checkBudgetCoverage(budgetedFileNames, emittedFileNames) {
  const emitted = new Set(emittedFileNames);
  const missing = [...budgetedFileNames].filter((fileName) => !emitted.has(fileName));

  if (!missing.length) {
    return;
  }

  throw new Error(
    `build/bundle-budget.json budgets a file the build did not emit: ${missing.join(', ')}. ` +
      `The build emitted: ${emittedFileNames.join(', ') || '(nothing)'}. ` +
      'Point the budget at the current output name, or the size gate silently stops running.',
  );
}

export function checkBundleBudget(fileName, sizes, limits) {
  const breaches = Object.entries(METRIC_LABELS)
    .filter(([metric]) => sizes[metric] > limits[metric])
    .map(([metric, label]) => {
      const over = sizes[metric] - limits[metric];
      const percent = ((over / limits[metric]) * 100).toFixed(1);
      return `${label}: ${bytes(sizes[metric])} bytes, ${bytes(over)} over the ${bytes(limits[metric])} budget (+${percent}%)`;
    });

  if (!breaches.length) {
    return;
  }

  throw new Error(
    `${fileName} exceeds its size budget:\n\n- ${breaches.join('\n\n- ')}\n\n` +
      'Every htmdx artifact loads this bundle from a CDN, so the growth is paid on ' +
      'every page open. Either bring it back under the budget, or raise the limit in ' +
      'build/bundle-budget.json and record why in its note - in this change, not later.',
  );
}

function bytes(value) {
  return value.toLocaleString('en-US');
}
