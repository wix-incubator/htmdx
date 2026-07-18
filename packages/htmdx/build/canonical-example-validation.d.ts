type CanonicalExample = {
  name: string;
  example?: string;
};

type CompileResult = { ok: true; components: string[] } | { ok: false; error: string };

export declare function validateCanonicalExamples(
  components: readonly CanonicalExample[],
  compile: (source: string) => CompileResult,
): void;
