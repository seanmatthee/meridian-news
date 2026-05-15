# Meridian AI — architecture

A self-hosted intelligence layer. Runs on Meridian's own infrastructure, against Meridian's own database, with zero external LLM API calls and zero per-token costs. Open-weight models are downloaded once, cached to disk, and executed locally forever after.

This document is the contract. Code in `lib/meridian-ai/` and `app/api/meridian-ai/*` implements it. If the implementation diverges from this doc, the doc wins — fix the code.

---

## 1. Runtime

**Choice: [`@xenova/transformers`](https://github.com/xenova/transformers.js) (transformers.js).**

A pure JavaScript port of Hugging Face Transformers that runs ONNX models in Node via `onnxruntime-node`. Models are pulled from the HF hub on first use and cached to a local directory (`./.cache/transformers/` by default). After the first cold start there is no network call.

### Alternatives considered

| Option | Verdict |
|---|---|
| **Python microservice (FastAPI + sentence-transformers)** | Most capable, but adds a second runtime, Docker, and inter-process latency. Rejected — we'd be shipping two stacks for one feature. |
| **llama.cpp via node binding (e.g. `node-llama-cpp`)** | Great for generative LLMs but overkill for embeddings + summarization, and the model files (GGUF) are larger than what we need. |
| **Hugging Face Inference API** | Explicitly forbidden — external API, per-call cost. |
| **`@xenova/transformers` (chosen)** | Pure Node, one runtime, ONNX, model caches to disk, MIT-compatible. Trade-off: CPU-only inference is slower than a GPU pipeline, but for our model sizes (≤90MB) it's fine. |

### Models

| Job | Model | Size | License |
|---|---|---|---|
| Sentence embedding | `Xenova/all-MiniLM-L6-v2` | ~23 MB (quantized) | Apache-2.0 |
| Abstractive summarization (optional) | `Xenova/distilbart-cnn-6-6` | ~88 MB (quantized) | Apache-2.0 |

Both are quantized ONNX builds maintained by the transformers.js author. The embedding model produces 384-dim float vectors.

### Loading discipline

Models are instantiated **once** and held in a module-level singleton. There is one `getEmbedder()` and one `getSummarizer()` — both lazy. A `warmup()` function pre-loads both at server boot.

---

## 2. Intent routing

When a user types a query on `/my-world` ("show me SA market news", "what's happening with rugby"), we have to decide:

1. Which **outlets** should we read?
2. Which **topics** are in play?
3. Which **region** does this concern? (`global` | `south-africa` | `africa` | `europe` | `us` | `asia`)
4. What **timeframe** do they want? (`today` | `this-week` | `this-month` | `latest`)

### Algorithm

```
embed(query) → query_vec (384-dim float32, L2-normalized)
for each Source s in DB: score_s = cosine(query_vec, s.embedding)
for each Topic  t in DB: score_t = cosine(query_vec, t.embedding)
return {
  outlets: top-k Sources by score_s, with score_s > 0.25,
  topics:  top-k Topics by score_t,  with score_t > 0.25,
  region:  argmax over region keywords in the query (regex), else 'global',
  timeframe: argmax over time keywords ('today', 'this week', 'recent'…), else 'today',
  confidence: max(score_s_best, score_t_best),
}
```

Cosine similarity is dot product over normalized vectors — a single hot loop in `lib/meridian-ai/similarity.ts`.

`k` defaults to 5 for outlets, 3 for topics. Threshold 0.25 keeps low-quality matches out. If nothing clears the threshold, return `{ outlets: [], topics: [], region, timeframe, confidence: 0 }` — the caller falls back to "show all top headlines."

---

## 3. Summarization — two paths

Both paths take the same input (`articleIds[]`) and return the same shape. Caller chooses with `mode`.

### 3a. Extractive (default)

Pure TypeScript, no LLM. The algorithm is **TextRank over sentence embeddings**:

1. For each article, split into sentences (regex + abbreviation guard).
2. Embed every sentence with the same MiniLM model.
3. Build a graph: nodes = sentences, edge weight = cosine similarity if ≥ 0.1 else 0.
4. Run PageRank for 30 iterations (damping 0.85). Score each sentence.
5. Pick top N sentences by score. Return them in **original document order**, joined.

`N` depends on `length`:
- `short` → 3 sentences
- `medium` → 5
- `long` → 8

All written from scratch — no external dependency beyond the already-loaded embedding model.

### 3b. Abstractive (optional)

`Xenova/distilbart-cnn-6-6` via transformers.js `pipeline('summarization', …)`.

- Concatenate article bodies, truncate to model's max input (~1024 tokens).
- Call the pipeline with `min_length` / `max_length` derived from `length`.
- Return the generated string.

Slower (~1–3s on CPU), generative. Used when extractive output is too disjointed for the use case.

---

## 4. Database schema

Prisma. SQLite locally (`prisma/dev.db`). Postgres in prod by changing the `datasource` URL only — schema is identical.

```prisma
model Source {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  slug        String    @unique
  url         String
  rssUrl      String?
  region      String    // 'global' | 'south-africa' | 'africa' | 'europe' | 'us' | 'asia'
  category    String    // 'ai' | 'world' | 'business' | 'finance' | 'south-africa'
  description String
  embedding   Bytes     // Float32Array(384) serialized as raw bytes
  articles    Article[]
  createdAt   DateTime  @default(now())
}

model Topic {
  id          Int     @id @default(autoincrement())
  name        String  @unique
  slug        String  @unique
  description String
  parentId    Int?
  parent      Topic?  @relation("TopicHierarchy", fields: [parentId], references: [id])
  children    Topic[] @relation("TopicHierarchy")
  embedding   Bytes
  createdAt   DateTime @default(now())
}

model Article {
  id          Int      @id @default(autoincrement())
  sourceId    Int
  source      Source   @relation(fields: [sourceId], references: [id])
  title       String
  url         String   @unique
  content     String
  publishedAt DateTime
  embedding   Bytes?
  createdAt   DateTime @default(now())
  @@index([sourceId, publishedAt])
}

model UserSession {
  id        String      @id            // UUID generated client-side
  createdAt DateTime    @default(now())
  queries   UserQuery[]
}

model UserQuery {
  id                Int          @id @default(autoincrement())
  sessionId         String
  session           UserSession  @relation(fields: [sessionId], references: [id])
  rawText           String
  interpretedIntent String       // JSON blob
  summaryId         Int?
  summary           UserSummary? @relation(fields: [summaryId], references: [id])
  createdAt         DateTime     @default(now())
  @@index([sessionId, createdAt])
}

model UserSummary {
  id           Int         @id @default(autoincrement())
  queryHash    String      @unique  // sha256(intent + sortedArticleIds + mode + length)
  summaryText  String
  mode         String      // 'extractive' | 'abstractive'
  length       String      // 'short' | 'medium' | 'long'
  articleIds   String      // JSON array of Article.id used as source
  createdAt    DateTime    @default(now())
  queries      UserQuery[]
}
```

`embedding Bytes` stores a Float32Array as a raw little-endian byte buffer (`Buffer.from(new Float32Array(vec).buffer)`). Reads call `new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)`.

`Article` is structured but not used in Phase 5 except as a forward-compatible target — the news fetcher continues to deliver `NewsItem` objects in-memory. We can wire `Article` persistence in later if we need cross-session deduplication, without changing the AI layer.

---

## 5. API surface

Internal Next.js route handlers under `app/api/meridian-ai/*`. All server-side. All accept and return JSON.

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/meridian-ai/interpret` | POST | `{ text: string }` | `{ topics: TopicHit[], outlets: OutletHit[], region: Region, timeframe: Timeframe, confidence: number }` |
| `/api/meridian-ai/summarize` | POST | `{ articleIds?: string[], articles?: ArticleInput[], mode: 'extractive' \| 'abstractive', length: 'short' \| 'medium' \| 'long', sessionId?: string, queryId?: number }` | `{ summary: string, sourceArticles: Array<{ title, url, source }> }` |
| `/api/meridian-ai/embed` | POST | `{ text: string }` | `{ embedding: number[] }` |
| `/api/meridian-ai/warmup` | GET | — | `{ ready: true, loadedMs: number }` |
| `/api/meridian-ai/history` | GET | query: `sessionId` | `{ items: HistoryItem[] }` |
| `/api/meridian-ai/history/clear` | POST | `{ sessionId: string }` | `{ cleared: number }` |

`ArticleInput` is `{ id?: string; title: string; content: string; source: string; url: string }`. This lets the caller pass in articles fetched live from RSS feeds without having to persist them first.

The summarize route accepts either persisted `articleIds` OR an inline `articles` array. The inline path is what `/my-world` and `/briefing` actually use in Phase 5–7: the news layer is still RSS-driven, so we feed fresh items in directly.

---

## 6. Caching

Cache key: `sha256(JSON.stringify({ intent, articleIds: sortedIds, mode, length }))`.

Lookup order on `summarize`:

1. Hash the input.
2. `SELECT * FROM UserSummary WHERE queryHash = ?`
3. If found → return cached `summaryText`. Tag the `UserQuery` row with that summary's id.
4. Else → compute, write a new `UserSummary` row, return.

Same input set never gets summarized twice across the lifetime of the DB. Cache is process-independent (in DB), so it survives restarts and is shared across instances.

---

## 7. Cold start

First request to either model triggers a download. On Vercel serverless this is a 10–30s cold start with a high chance of timeout — **so we don't deploy this on Vercel serverless.**

Recommended deploy target: **Railway / Fly.io / Render**, single Node process, persistent disk (so model files survive restarts), 1–2 GB RAM. The `./.cache/transformers/` directory is on disk, not ephemeral.

Cost estimate: $5–10/month on the Hobby tier of any of those three. No per-token cost ever.

Warmup: `GET /api/meridian-ai/warmup` is called once after deploy. It loads both models and reports load time. CI/CD can hit this as a post-deploy step.

---

## 8. Failure modes

| Condition | Response |
|---|---|
| Model not loaded yet | 503 `{ error: 'model-loading' }`. Client retries with backoff. |
| Empty / whitespace input to `interpret` | 400 `{ error: 'empty-input' }`. |
| `interpret` produces no matches above threshold | 200 with `{ outlets: [], topics: [], confidence: 0 }`. Caller falls back to "all sources, today". |
| `summarize` called with zero articles | 400 `{ error: 'no-articles' }`. |
| `summarize` called with malformed article | Skip that article, summarize the rest, log a warning. If all are malformed, 400 `{ error: 'no-valid-articles' }`. |
| DB unreachable | 503 `{ error: 'db-unavailable' }`. No partial writes. |
| Embedding model returns wrong dimensions | 500 `{ error: 'embedding-shape' }`. Hard fail — indicates bad model file. |
| Inference throws | 500 `{ error: 'inference-failed', detail }`. Log with full stack server-side. |

No silent failures. Every catch logs with a `[meridian-ai]` prefix.

---

## 9. File layout (target)

```
lib/meridian-ai/
  index.ts              Public exports.
  types.ts              Region, Timeframe, IntentResult, SummaryRequest, etc.
  embeddings.ts         getEmbedder(), embed(text), warmup().
  similarity.ts         cosine(a, b), topK(scores, k).
  intent.ts             interpretIntent(text).
  cache.ts              hashQuery(...), readCache, writeCache.
  summarize/
    extractive.ts       TextRank from scratch.
    abstractive.ts      distilbart pipeline.
    index.ts            summarize(req) dispatcher.

app/api/meridian-ai/
  interpret/route.ts
  summarize/route.ts
  embed/route.ts
  warmup/route.ts
  history/route.ts
  history/clear/route.ts

prisma/
  schema.prisma
  seed.ts
  dev.db                (generated, gitignored)

scripts/
  test-meridian-ai.ts   Smoke test: 5 intent queries + extractive + abstractive.
```
