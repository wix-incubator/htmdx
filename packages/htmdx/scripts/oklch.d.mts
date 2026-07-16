export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export declare function hexToRgb(hex: string): [number, number, number];
export declare function rgbToHex(rgb: [number, number, number]): string;
export declare function srgbToLinear(channel: number): number;
export declare function linearToSrgb(linear: number): number;
export declare function hexToOklch(hex: string): Oklch;
export declare function oklchToHex(color: Oklch): string;
export declare function relativeLuminance(hex: string): number;
export declare function contrastRatio(hexA: string, hexB: string): number;
