/**
 * embeddings.ts — singleton sentence embedder.
 *
 * Wraps `@xenova/transformers` pipeline('feature-extraction', ...).
 * Model: Xenova/all-MiniLM-L6-v2 — 23MB quantized ONNX, 384-dim output.
 * Loads once per process; subsequent calls reuse the same pipeline.
 *
 * Embeddings are L2-normalized — cosine similarity becomes a dot product.
 */

import type {
  FeatureExtractionPipeline,
  PipelineType,
} from "@xenova/transformers";

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIM = 384;

type TransformersModule = typeof import("@xenova/transformers");

let modulePromise: Promise<TransformersModule> | null = null;
let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;

async function loadModule(): Promise<TransformersModule> {
  if (!modulePromise) {
    modulePromise = import("@xenova/transformers").then((mod) => {
      mod.env.allowRemoteModels = true;
      mod.env.allowLocalModels = true;
      mod.env.cacheDir = ".cache/transformers";
      return mod;
    });
  }
  return modulePromise;
}

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const mod = await loadModule();
      const task: PipelineType = "feature-extraction";
      return (await mod.pipeline(task, EMBEDDING_MODEL)) as FeatureExtractionPipeline;
    })();
  }
  return embedderPromise;
}

/**
 * Embed one or more strings. Returns Float32Array(s) of length EMBEDDING_DIM.
 * Output vectors are L2-normalized.
 */
export async function embed(text: string): Promise<Float32Array> {
  if (!text || !text.trim()) {
    throw new Error("[meridian-ai] embed: empty input");
  }
  const embedder = await getEmbedder();
  const result = await embedder(text, { pooling: "mean", normalize: true });
  const vec = new Float32Array(result.data as Float32Array | number[]);
  if (vec.length !== EMBEDDING_DIM) {
    throw new Error(
      `[meridian-ai] embed: unexpected dim ${vec.length}, want ${EMBEDDING_DIM}`,
    );
  }
  return vec;
}

export async function embedMany(texts: string[]): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (const t of texts) {
    out.push(await embed(t));
  }
  return out;
}

/**
 * Returns a Uint8Array view over a freshly-owned ArrayBuffer, suitable for
 * passing directly into Prisma's `Bytes` input type.
 */
export function bufferFromVector(vec: Float32Array): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(vec.byteLength);
  const view = new Uint8Array(ab);
  const src = new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength);
  view.set(src);
  return view;
}

export function vectorFromBuffer(buf: Uint8Array): Float32Array {
  // Copy into a fresh ArrayBuffer to guarantee alignment.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  const vec = new Float32Array(ab);
  if (vec.length !== EMBEDDING_DIM) {
    throw new Error(
      `[meridian-ai] vectorFromBuffer: bad shape ${vec.length}, want ${EMBEDDING_DIM}`,
    );
  }
  return vec;
}

export async function warmupEmbedder(): Promise<void> {
  await getEmbedder();
}

export const EMBEDDING_MODEL_ID = EMBEDDING_MODEL;
export const EMBEDDING_VECTOR_DIM = EMBEDDING_DIM;
