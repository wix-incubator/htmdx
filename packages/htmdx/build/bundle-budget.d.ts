export type BundleSizes = {
  raw: number;
  gzip: number;
};

export declare function measureBundle(contents: Uint8Array): BundleSizes;
export declare function checkBudgetCoverage(
  budgetedFileNames: readonly string[],
  emittedFileNames: readonly string[],
): void;
export declare function formatBundleSizes(
  fileName: string,
  sizes: BundleSizes,
  limits: BundleSizes,
): string;
export declare function checkBundleBudget(
  fileName: string,
  sizes: BundleSizes,
  limits: BundleSizes,
): void;
