/**
 * extractive.ts — TextRank summarizer, written from scratch.
 *
 * Steps:
 *  1. Split each article into sentences.
 *  2. Embed every sentence with the same MiniLM model used elsewhere.
 *  3. Build a similarity graph (cosine ≥ EDGE_MIN), then run PageRank.
 *  4. Pick the top-N sentences by score, return them in original document order.
 *
 * No LLM call anywhere — pure algorithm.
 */
import { embed } from "../embeddings";
import { dot } from "../similarity";
import type { ArticleInput, SummaryLength } from "../types";

const EDGE_MIN = 0.1;
const DAMPING = 0.85;
const ITERATIONS = 30;

const LENGTH_TO_N: Record<SummaryLength, number> = {
  short: 3,
  medium: 5,
  long: 8,
};

interface Sentence {
  text: string;
  /** Index into the original concatenated stream — preserves reading order. */
  globalIndex: number;
  /** Article index this sentence came from (for attribution if needed). */
  articleIndex: number;
}

/**
 * Split a paragraph of text into sentences. Conservative regex that guards
 * common abbreviations (Mr., Mrs., U.S., etc.) by requiring a following
 * capital letter or end-of-string.
 */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const ABBREV_GUARDED = /([.!?])\s+(?=[A-Z"'])/g;
  const pieces = normalized.split(ABBREV_GUARDED);

  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < pieces.length; i++) {
    buf += pieces[i];
    if (i % 2 === 1) {
      out.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());

  return out.filter((s) => s.length >= 20 && s.length <= 400);
}

function collectSentences(articles: ArticleInput[]): Sentence[] {
  const out: Sentence[] = [];
  let gi = 0;
  for (let a = 0; a < articles.length; a++) {
    const body = `${articles[a].title}. ${articles[a].content ?? ""}`;
    const sents = splitSentences(body);
    for (const s of sents) {
      out.push({ text: s, globalIndex: gi++, articleIndex: a });
    }
  }
  return out;
}

/**
 * PageRank over a similarity matrix with self-loops removed.
 * Weights are normalized so each row sums to 1.
 */
function pageRank(matrix: Float32Array[], damping: number, iterations: number): Float32Array {
  const n = matrix.length;
  if (n === 0) return new Float32Array(0);

  // Row-normalize.
  const rowSums = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += matrix[i][j];
    rowSums[i] = s;
  }

  const scores = new Float32Array(n).fill(1 / n);
  const next = new Float32Array(n);

  for (let it = 0; it < iterations; it++) {
    next.fill((1 - damping) / n);
    for (let i = 0; i < n; i++) {
      if (rowSums[i] === 0) continue;
      const share = (damping * scores[i]) / rowSums[i];
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] > 0) next[j] += share * matrix[i][j];
      }
    }
    scores.set(next);
  }

  return scores;
}

export async function summarizeExtractive(
  articles: ArticleInput[],
  length: SummaryLength,
): Promise<string> {
  const sentences = collectSentences(articles);
  if (sentences.length === 0) return "";

  // Embed every sentence.
  const vecs: Float32Array[] = [];
  for (const s of sentences) {
    vecs.push(await embed(s.text));
  }

  // Build similarity matrix (self-loops zeroed).
  const n = sentences.length;
  const sim: Float32Array[] = Array.from(
    { length: n },
    () => new Float32Array(n),
  );
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const c = dot(vecs[i], vecs[j]);
      if (c >= EDGE_MIN) {
        sim[i][j] = c;
        sim[j][i] = c;
      }
    }
  }

  // Score.
  const scores = pageRank(sim, DAMPING, ITERATIONS);

  // Top-N by score, then re-sort by original document order.
  const wantN = Math.min(LENGTH_TO_N[length], n);
  const indexed = sentences.map((s, i) => ({ s, score: scores[i] }));
  indexed.sort((a, b) => b.score - a.score);
  const picked = indexed
    .slice(0, wantN)
    .sort((a, b) => a.s.globalIndex - b.s.globalIndex);

  return picked.map((p) => p.s.text).join(" ");
}
