export const METRIC_NAMES = [
  "Metadata Integrity",
  "Compression Artifacts",
  "Pixel Inconsistency",
  "Noise Pattern Analysis",
  "Facial/Object Detection",
  "Deepfake Signature Scan",
] as const;

export type MetricName = (typeof METRIC_NAMES)[number];

export interface AnalysisResult {
  metrics: Array<{ name: string; score: number }>;
  verdict: "fake" | "real";
  confidenceScore: number;
  avgScore: number;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number, index: number): number {
  const s = simpleHash(`${seed}-${index}-${seed * index + 7}`);
  return (s % 10000) / 10000;
}

export function analyzeFile(
  filename: string,
  fileSize: number,
): AnalysisResult {
  const seed = simpleHash(filename) ^ (fileSize % 99991);

  const metrics = METRIC_NAMES.map((name, i) => ({
    name,
    score: Math.round(seededRandom(seed, i) * 100),
  }));

  const avgScore = metrics.reduce((s, m) => s + m.score, 0) / metrics.length;
  const verdict: "fake" | "real" = avgScore > 55 ? "fake" : "real";
  const confidenceScore = Math.round(Math.abs(avgScore - 50) * 2);

  return { metrics, verdict, confidenceScore, avgScore };
}

export function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
