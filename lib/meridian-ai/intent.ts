/**
 * intent.ts — interprets a user query into outlets / topics / region / timeframe.
 *
 * 1. Embed the query.
 * 2. Cosine-rank all Sources and Topics from the DB against it.
 * 3. Detect region & timeframe via lightweight keyword rules.
 */
import { prisma } from "@/lib/prisma";
import { embed, vectorFromBuffer } from "./embeddings";
import { dot, topK } from "./similarity";
import type {
  IntentResult,
  OutletHit,
  Region,
  Timeframe,
  TopicHit,
} from "./types";

const OUTLET_TOP_K = 5;
const TOPIC_TOP_K = 3;
const MIN_SCORE = 0.25;

const REGION_PATTERNS: Array<{ region: Region; rx: RegExp }> = [
  {
    region: "south-africa",
    rx: /\b(south africa|south[- ]african|sa\b|jse|ramaphosa|eskom|johannesburg|cape town|pretoria|durban|gauteng|kwazulu)\b/i,
  },
  {
    region: "africa",
    rx: /\b(africa|nigerian?|kenyan?|ghana|egypt|moroccan?|continent of africa)\b/i,
  },
  {
    region: "us",
    rx: /\b(united states|u\.?s\.?a?\.?|america(n)?|wall street|nasdaq|s&p|dow jones|silicon valley|new york|washington|biden|trump)\b/i,
  },
  {
    region: "europe",
    rx: /\b(europe(an)?|eu\b|brussels|france|french|germany|german|italian?|spain|spanish|london|uk\b|britain|british|ireland)\b/i,
  },
  {
    region: "asia",
    rx: /\b(asia(n)?|china|chinese|beijing|shanghai|japan|japanese|tokyo|korea(n)?|india(n)?|hong kong|singapore|taiwan)\b/i,
  },
];

const TIMEFRAME_PATTERNS: Array<{ timeframe: Timeframe; rx: RegExp }> = [
  {
    timeframe: "this-week",
    rx: /\b(this week|past week|last \d+ days?|last week|weekly)\b/i,
  },
  {
    timeframe: "this-month",
    rx: /\b(this month|past month|last month|monthly)\b/i,
  },
  {
    timeframe: "latest",
    rx: /\b(latest|recent|breaking|right now|just (in|now)|moments ago)\b/i,
  },
];

function detectRegion(text: string): Region {
  for (const { region, rx } of REGION_PATTERNS) {
    if (rx.test(text)) return region;
  }
  return "global";
}

function detectTimeframe(text: string): Timeframe {
  for (const { timeframe, rx } of TIMEFRAME_PATTERNS) {
    if (rx.test(text)) return timeframe;
  }
  return "today";
}

export async function interpretIntent(text: string): Promise<IntentResult> {
  if (!text || !text.trim()) {
    return {
      outlets: [],
      topics: [],
      region: "global",
      timeframe: "today",
      confidence: 0,
    };
  }

  const queryVec = await embed(text);

  const [sources, topics] = await Promise.all([
    prisma.source.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        region: true,
        embedding: true,
      },
    }),
    prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        embedding: true,
      },
    }),
  ]);

  const sourceScores = sources.map((s) => ({
    source: s,
    score: dot(queryVec, vectorFromBuffer(s.embedding)),
  }));
  const topicScores = topics.map((t) => ({
    topic: t,
    score: dot(queryVec, vectorFromBuffer(t.embedding)),
  }));

  const outletHits: OutletHit[] = topK(
    sourceScores,
    (s) => s.score,
    OUTLET_TOP_K,
    MIN_SCORE,
  ).map(({ item }) => ({
    id: item.source.id,
    name: item.source.name,
    slug: item.source.slug,
    category: item.source.category,
    region: item.source.region,
    score: item.score,
  }));

  const topicHits: TopicHit[] = topK(
    topicScores,
    (t) => t.score,
    TOPIC_TOP_K,
    MIN_SCORE,
  ).map(({ item }) => ({
    id: item.topic.id,
    name: item.topic.name,
    slug: item.topic.slug,
    score: item.score,
  }));

  const region = detectRegion(text);
  const timeframe = detectTimeframe(text);

  const bestSource = outletHits[0]?.score ?? 0;
  const bestTopic = topicHits[0]?.score ?? 0;
  const confidence = Math.max(bestSource, bestTopic);

  return { outlets: outletHits, topics: topicHits, region, timeframe, confidence };
}
