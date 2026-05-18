/**
 * deepseek/cost — token estimation and per-call budget enforcement.
 *
 * Every chatCompletion call passes through estimateAndCap() which:
 *   1. Estimates input tokens from the messages payload.
 *   2. Computes the max output tokens that keeps total spend under the cap.
 *   3. Refuses up-front if even a minimal-output answer would exceed budget.
 *
 * Tuned for DeepSeek V3 / OpenRouter `deepseek/deepseek-chat` pricing as of
 * mid-2026. Update PRICING below if the model changes.
 */

interface ProviderPricing {
  inputPerToken: number; // USD
  outputPerToken: number; // USD
}

// DeepSeek V3 list price, cache-miss tier. OpenRouter passes through the same
// underlying rate plus a small markup; use the same numbers as a conservative
// estimate either way.
const PRICING: ProviderPricing = {
  inputPerToken: 0.27 / 1_000_000,
  outputPerToken: 1.1 / 1_000_000,
};

/** Hard per-call ceiling in USD. Set to 8¢ per Sean's spec. */
export const PER_CALL_BUDGET_USD = 0.08;

/** DeepSeek's hard max output. Don't go above this regardless of budget. */
const MODEL_MAX_OUTPUT_TOKENS = 8_192;

/** Floor for max_tokens so we never request a uselessly small answer. */
const MIN_USEFUL_OUTPUT_TOKENS = 200;

/**
 * Rough token estimator: ~4 chars per token works for English prose.
 * Off by ~10-20% but always in the safe direction since prose tokens
 * average longer than code/symbols.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface CapResult {
  /** True if the call fits under the per-call budget. */
  ok: boolean;
  /** Reason for refusal if ok is false. */
  reason?: "input-exceeds-budget";
  /** Estimated input tokens. */
  inputTokens: number;
  /** max_tokens to pass to the model. */
  maxOutputTokens: number;
  /** Worst-case USD cost if the model returns maxOutputTokens. */
  worstCaseUsd: number;
}

/**
 * Decide whether the call fits the budget, and how many output tokens
 * are affordable. Caller passes the joined message text (or any prompt
 * that will count toward input billing).
 */
export function estimateAndCap(opts: {
  inputText: string;
  /** Desired max_tokens. Will be lowered if budget can't afford it. */
  requestedMaxOutput: number;
}): CapResult {
  const inputTokens = estimateTokens(opts.inputText);
  const inputCost = inputTokens * PRICING.inputPerToken;

  // If even a minimal answer would blow the budget, refuse.
  const minOutputCost = MIN_USEFUL_OUTPUT_TOKENS * PRICING.outputPerToken;
  if (inputCost + minOutputCost > PER_CALL_BUDGET_USD) {
    return {
      ok: false,
      reason: "input-exceeds-budget",
      inputTokens,
      maxOutputTokens: 0,
      worstCaseUsd: inputCost + minOutputCost,
    };
  }

  // Output tokens we can afford with the remaining budget.
  const remainingUsd = PER_CALL_BUDGET_USD - inputCost;
  const affordableOutput = Math.floor(remainingUsd / PRICING.outputPerToken);

  const maxOutputTokens = Math.min(
    opts.requestedMaxOutput,
    affordableOutput,
    MODEL_MAX_OUTPUT_TOKENS,
  );

  const worstCaseUsd = inputCost + maxOutputTokens * PRICING.outputPerToken;

  return {
    ok: true,
    inputTokens,
    maxOutputTokens,
    worstCaseUsd,
  };
}
