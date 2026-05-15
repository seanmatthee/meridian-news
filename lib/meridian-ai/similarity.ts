/**
 * similarity.ts — cosine similarity helpers.
 *
 * Vectors produced by embeddings.ts are L2-normalized, so cosine reduces to
 * a dot product. We still support the general form for safety.
 */

export function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `[meridian-ai] dot: length mismatch ${a.length} vs ${b.length}`,
    );
  }
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function norm(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}

export function cosine(a: Float32Array, b: Float32Array): number {
  const d = dot(a, b);
  // Embeddings are normalized; this guards mixed callers.
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return d / (na * nb);
}

export interface Scored<T> {
  item: T;
  score: number;
}

export function topK<T>(
  items: T[],
  scoreOf: (item: T) => number,
  k: number,
  threshold = 0,
): Scored<T>[] {
  const scored: Scored<T>[] = items.map((item) => ({
    item,
    score: scoreOf(item),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score >= threshold).slice(0, k);
}
