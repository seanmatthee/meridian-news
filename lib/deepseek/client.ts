/**
 * deepseek/client — wrapper for DeepSeek chat completions, with two providers.
 *
 * Provider selection (first match wins):
 *   1. OPENROUTER_MERIDIAN_API_KEY → OpenRouter, model `deepseek/deepseek-chat`
 *   2. DEEPSEEK_API_KEY            → direct DeepSeek API, model `deepseek-chat`
 *   3. nothing                     → stubbed placeholder response
 *
 * Both providers are OpenAI-compatible so the request body shape is the same.
 * Only the URL, model id, and a couple of OpenRouter-specific headers differ.
 *
 * Every call passes through estimateAndCap() in ./cost, which refuses input
 * that would exceed the per-call USD budget and lowers max_tokens to fit.
 */
import { estimateAndCap, PER_CALL_BUDGET_USD } from "./cost";

interface ProviderConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  extraHeaders: Record<string, string>;
  name: string;
}

function resolveProvider(): ProviderConfig | null {
  const orKey = process.env.OPENROUTER_MERIDIAN_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (orKey) {
    return {
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: orKey,
      model: process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat",
      extraHeaders: {
        // OpenRouter recommends these for analytics/abuse-tracking. Optional but cheap to send.
        "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://meridian.local",
        "X-Title": "Meridian",
      },
      name: "openrouter",
    };
  }
  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (dsKey) {
    return {
      endpoint: "https://api.deepseek.com/v1/chat/completions",
      apiKey: dsKey,
      model: "deepseek-chat",
      extraHeaders: {},
      name: "deepseek",
    };
  }
  return null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DeepSeekResponse {
  text: string;
  stub: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export function isDeepSeekConfigured(): boolean {
  return resolveProvider() !== null;
}

export async function chatCompletion(
  req: DeepSeekRequest,
): Promise<DeepSeekResponse> {
  const provider = resolveProvider();
  if (!provider) {
    return { text: stubResponse(req), stub: true };
  }

  // Enforce the per-call USD budget. If the input alone would blow it,
  // return the stub instead of making the request.
  const inputText = req.messages.map((m) => m.content).join("\n");
  const cap = estimateAndCap({
    inputText,
    requestedMaxOutput: req.maxTokens ?? 1200,
  });
  if (!cap.ok) {
    console.warn(
      `[deepseek] input rejected — would exceed $${PER_CALL_BUDGET_USD} budget ` +
        `(estimated ${cap.inputTokens} input tokens)`,
    );
    return {
      text:
        "That request is too large for Meridian to answer within its per-call budget. " +
        "Try a shorter question.",
      stub: true,
    };
  }

  let res: Response;
  try {
    res = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${provider.apiKey}`,
        ...provider.extraHeaders,
      },
      body: JSON.stringify({
        model: req.model ?? provider.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.4,
        max_tokens: cap.maxOutputTokens,
        stream: false,
      }),
    });
  } catch (err) {
    console.error(`[deepseek/${provider.name}] network error:`, err);
    return { text: stubResponse(req), stub: true };
  }

  if (!res.ok) {
    const detail = await res.text();
    // Log loudly but don't throw — callers (briefing, ask) have their own
    // fallback behavior keyed on `stub: true`.
    console.error(
      `[deepseek/${provider.name}] HTTP ${res.status}: ${detail.slice(0, 300)}`,
    );
    return { text: stubResponse(req), stub: true };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    console.error(`[deepseek/${provider.name}] empty response`);
    return { text: stubResponse(req), stub: true };
  }

  return {
    text,
    stub: false,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };
}

function stubResponse(req: DeepSeekRequest): string {
  if (!resolveProvider()) {
    const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
    const preview = lastUser?.content.slice(0, 120) ?? "your query";
    return [
      "[Meridian AI is currently running in fallback mode.]",
      "",
      "Add OPENROUTER_MERIDIAN_API_KEY (or DEEPSEEK_API_KEY) to .env.local to enable full analysis.",
      "",
      `Your question was: "${preview}…"`,
    ].join("\n");
  }
  return "Meridian's analysis is temporarily unavailable. Please try again in a moment.";
}
