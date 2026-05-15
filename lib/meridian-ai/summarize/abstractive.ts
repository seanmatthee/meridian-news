/**
 * abstractive.ts — distilbart-cnn-6-6 summarizer via transformers.js.
 *
 * Loads on first use, held in module scope thereafter. CPU-only, but small
 * enough (~88MB) to run on a $5/mo Node host.
 */
import type { SummarizationPipeline, PipelineType } from "@xenova/transformers";
import type { ArticleInput, SummaryLength } from "../types";

const SUMMARIZER_MODEL = "Xenova/distilbart-cnn-6-6";

const LENGTH_TO_TOKENS: Record<SummaryLength, { min: number; max: number }> = {
  short: { min: 30, max: 80 },
  medium: { min: 60, max: 140 },
  long: { min: 120, max: 220 },
};

type TransformersModule = typeof import("@xenova/transformers");

let modulePromise: Promise<TransformersModule> | null = null;
let summarizerPromise: Promise<SummarizationPipeline> | null = null;

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

async function getSummarizer(): Promise<SummarizationPipeline> {
  if (!summarizerPromise) {
    summarizerPromise = (async () => {
      const mod = await loadModule();
      const task: PipelineType = "summarization";
      return (await mod.pipeline(task, SUMMARIZER_MODEL)) as SummarizationPipeline;
    })();
  }
  return summarizerPromise;
}

export async function warmupSummarizer(): Promise<void> {
  await getSummarizer();
}

function preparePrompt(articles: ArticleInput[]): string {
  // distilbart's max input is ~1024 tokens. Take title + first ~400 chars
  // of each article body so we stay under the cap even with many articles.
  const chunks: string[] = [];
  for (const a of articles) {
    const title = a.title.trim();
    const body = (a.content ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
    chunks.push(`${title}. ${body}`);
  }
  // Hard upper bound on character count too — defensive.
  return chunks.join(" ").slice(0, 4000);
}

export async function summarizeAbstractive(
  articles: ArticleInput[],
  length: SummaryLength,
): Promise<string> {
  if (articles.length === 0) return "";

  const summarizer = await getSummarizer();
  const input = preparePrompt(articles);
  const { min, max } = LENGTH_TO_TOKENS[length];

  const result = await summarizer(input, {
    min_length: min,
    max_length: max,
    num_beams: 2,
    early_stopping: true,
  });

  const first = Array.isArray(result) ? result[0] : result;
  const text = (first as { summary_text?: string }).summary_text;
  if (!text) {
    throw new Error("[meridian-ai] abstractive: empty output");
  }
  return text.trim();
}
