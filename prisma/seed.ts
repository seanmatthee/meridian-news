/**
 * Prisma seed — populates Source and Topic tables with embeddings.
 *
 * Sources mirror the live RSS registry in lib/feeds.ts so intent routing
 * matches what the news layer can actually fetch.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { embed, bufferFromVector } from "../lib/meridian-ai/embeddings";

const prisma = new PrismaClient();

interface SourceSeed {
  name: string;
  slug: string;
  url: string;
  rssUrl: string;
  region: string;
  category: string;
  description: string;
}

const SOURCES: SourceSeed[] = [
  // AI
  {
    name: "TechCrunch",
    slug: "techcrunch",
    url: "https://techcrunch.com",
    rssUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    region: "us",
    category: "ai",
    description:
      "Silicon Valley tech and startup news with deep coverage of artificial intelligence, machine learning, generative models, AI infrastructure, and the companies building them.",
  },
  {
    name: "The Verge",
    slug: "the-verge",
    url: "https://www.theverge.com",
    rssUrl: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    region: "us",
    category: "ai",
    description:
      "Consumer technology and AI culture — product launches, AI assistants, large language models, image generation, and how new technology reshapes the consumer landscape.",
  },
  {
    name: "Hacker News",
    slug: "hacker-news",
    url: "https://news.ycombinator.com",
    rssUrl:
      "https://hnrss.org/newest?q=ai+OR+llm+OR+model+OR+gpt+OR+claude&points=50",
    region: "global",
    category: "ai",
    description:
      "Engineer-curated technology discussion covering AI research papers, open-source models, developer tooling, infrastructure, and emerging programming trends.",
  },

  // World
  {
    name: "BBC World",
    slug: "bbc-world",
    url: "https://bbc.com/news/world",
    rssUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    region: "global",
    category: "world",
    description:
      "International news, geopolitics, conflict reporting, foreign policy, diplomacy, and humanitarian coverage from a UK editorial perspective.",
  },
  {
    name: "The Guardian World",
    slug: "guardian-world",
    url: "https://www.theguardian.com/world",
    rssUrl: "https://www.theguardian.com/world/rss",
    region: "global",
    category: "world",
    description:
      "Liberal British coverage of global affairs, human rights, climate, war reporting, European politics, and international culture.",
  },
  {
    name: "Al Jazeera",
    slug: "al-jazeera",
    url: "https://aljazeera.com",
    rssUrl: "https://www.aljazeera.com/xml/rss/all.xml",
    region: "global",
    category: "world",
    description:
      "Qatari-based international news with strong coverage of the Middle East, North Africa, conflict zones, geopolitics, and the global South.",
  },

  // Business
  {
    name: "The Guardian Business",
    slug: "guardian-business",
    url: "https://www.theguardian.com/uk/business",
    rssUrl: "https://www.theguardian.com/uk/business/rss",
    region: "europe",
    category: "business",
    description:
      "UK and European business news — corporate earnings, deals, mergers, regulation, energy, banking, retail, and macroeconomic policy.",
  },
  {
    name: "BBC Business",
    slug: "bbc-business",
    url: "https://www.bbc.com/business",
    rssUrl: "https://feeds.bbci.co.uk/news/business/rss.xml",
    region: "global",
    category: "business",
    description:
      "Global business and economic news — companies, markets, jobs, trade, central bank policy, and consumer economics.",
  },
  {
    name: "Bloomberg",
    slug: "bloomberg",
    url: "https://bloomberg.com",
    rssUrl: "https://feeds.bloomberg.com/markets/news.rss",
    region: "global",
    category: "business",
    description:
      "Financial markets, equities, bonds, commodities, mergers and acquisitions, central banks, hedge funds, and the global macro picture.",
  },

  // Finance
  {
    name: "Moneyweb",
    slug: "moneyweb",
    url: "https://www.moneyweb.co.za",
    rssUrl: "https://www.moneyweb.co.za/feed/",
    region: "south-africa",
    category: "finance",
    description:
      "South African personal finance, investing, retirement planning, tax, JSE-listed companies, and local market commentary.",
  },
  {
    name: "MarketWatch",
    slug: "marketwatch",
    url: "https://www.marketwatch.com",
    rssUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    region: "us",
    category: "finance",
    description:
      "US equity markets, sectors, indices, individual stocks, analyst calls, ETFs, and personal-finance commentary aimed at retail investors.",
  },
  {
    name: "FT Markets",
    slug: "ft-markets",
    url: "https://www.ft.com/markets",
    rssUrl: "https://www.ft.com/markets?format=rss",
    region: "europe",
    category: "finance",
    description:
      "Financial Times global markets coverage — equities, fixed income, currencies, central bank policy, and institutional investor focus.",
  },

  // South Africa
  {
    name: "News24",
    slug: "news24",
    url: "https://www.news24.com",
    rssUrl: "https://feeds.24.com/articles/news24/TopStories/rss",
    region: "south-africa",
    category: "south-africa",
    description:
      "South African breaking news, politics, government, crime, sport, and current affairs from the country's largest news publisher.",
  },
  {
    name: "Daily Maverick",
    slug: "daily-maverick",
    url: "https://www.dailymaverick.co.za",
    rssUrl: "https://www.dailymaverick.co.za/feed/",
    region: "south-africa",
    category: "south-africa",
    description:
      "South African investigative journalism, opinion, politics, civil society, and long-form analysis with an independent editorial stance.",
  },
  {
    name: "Moneyweb SA",
    slug: "moneyweb-sa",
    url: "https://www.moneyweb.co.za",
    rssUrl: "https://www.moneyweb.co.za/feed/",
    region: "south-africa",
    category: "south-africa",
    description:
      "South African economic news, corporate developments, JSE listings, government policy, and business commentary.",
  },
  {
    name: "MyBroadband",
    slug: "mybroadband",
    url: "https://mybroadband.co.za",
    rssUrl: "https://mybroadband.co.za/news/feed",
    region: "south-africa",
    category: "south-africa",
    description:
      "South African technology, telecoms, internet service providers, fibre rollout, load shedding, fintech, and consumer tech news.",
  },
];

interface TopicSeed {
  name: string;
  slug: string;
  description: string;
}

const TOPICS: TopicSeed[] = [
  {
    name: "Artificial Intelligence",
    slug: "ai",
    description:
      "Machine learning, large language models, generative AI, AI safety, AI policy, neural networks, GPT, Claude, Gemini, and frontier AI research.",
  },
  {
    name: "Markets",
    slug: "markets",
    description:
      "Stock markets, indices, equity prices, JSE, S&P 500, Dow Jones, Nasdaq, bonds, treasuries, commodity prices, currency markets, and forex.",
  },
  {
    name: "Business",
    slug: "business",
    description:
      "Companies, corporate earnings, deals, mergers and acquisitions, IPOs, layoffs, executive changes, and industry developments.",
  },
  {
    name: "Politics",
    slug: "politics",
    description:
      "Elections, governments, political parties, parliament, presidency, legislation, foreign policy, and political analysis.",
  },
  {
    name: "World News",
    slug: "world",
    description:
      "International affairs, geopolitics, foreign relations, global events, wars, conflicts, diplomacy, and international organizations.",
  },
  {
    name: "South Africa",
    slug: "south-africa",
    description:
      "South African news, politics, economy, ANC, DA, Ramaphosa, load shedding, Eskom, JSE-listed companies, Pretoria, Johannesburg, and Cape Town.",
  },
  {
    name: "Technology",
    slug: "tech",
    description:
      "Consumer technology, software, hardware, smartphones, semiconductors, cloud computing, cybersecurity, gadgets, and product launches.",
  },
  {
    name: "Sport",
    slug: "sport",
    description:
      "Rugby, cricket, football, soccer, Springboks, Proteas, Bafana Bafana, Premier League, World Cup, Olympics, and competitive sports.",
  },
  {
    name: "Science",
    slug: "science",
    description:
      "Scientific research, physics, biology, climate science, medical breakthroughs, space exploration, and academic studies.",
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    description:
      "Culture, food, travel, fashion, entertainment, lifestyle trends, celebrities, and arts.",
  },
  {
    name: "Opinion",
    slug: "opinion",
    description:
      "Editorial commentary, opinion pieces, analysis, columns, and persuasive writing on current affairs.",
  },
  {
    name: "Energy",
    slug: "energy",
    description:
      "Oil, gas, electricity, renewable energy, solar, wind, Eskom, load shedding, power generation, OPEC, and the energy transition.",
  },
];

async function main(): Promise<void> {
  // Fast-path: if every Source and Topic is already present, skip the model
  // load entirely. Makes redeploys cheap (no model download, no re-embed).
  const [existingSources, existingTopics] = await Promise.all([
    prisma.source.findMany({ select: { slug: true } }),
    prisma.topic.findMany({ select: { slug: true } }),
  ]);
  const haveSourceSlugs = new Set(existingSources.map((s: { slug: string }) => s.slug));
  const haveTopicSlugs = new Set(existingTopics.map((t: { slug: string }) => t.slug));
  const missingSources = SOURCES.filter((s) => !haveSourceSlugs.has(s.slug));
  const missingTopics = TOPICS.filter((t) => !haveTopicSlugs.has(t.slug));

  if (missingSources.length === 0 && missingTopics.length === 0) {
    console.log(
      `[seed] up-to-date — ${existingSources.length} sources, ${existingTopics.length} topics already present.`,
    );
    return;
  }

  console.log(
    `[seed] missing: ${missingSources.length} sources, ${missingTopics.length} topics — loading embedding model...`,
  );
  await embed("warmup");

  for (const s of missingSources) {
    const vec = await embed(s.description);
    const buf = bufferFromVector(vec);
    await prisma.source.upsert({
      where: { slug: s.slug },
      create: { ...s, embedding: buf },
      update: { ...s, embedding: buf },
    });
    console.log(`  ✓ source: ${s.name}`);
  }

  for (const t of missingTopics) {
    const vec = await embed(t.description);
    const buf = bufferFromVector(vec);
    await prisma.topic.upsert({
      where: { slug: t.slug },
      create: { ...t, embedding: buf },
      update: { ...t, embedding: buf },
    });
    console.log(`  ✓ topic: ${t.name}`);
  }

  // Verify a non-zero embedding shape on one row of each table.
  const sampleSource = await prisma.source.findFirst({
    select: { name: true, embedding: true },
  });
  const sampleTopic = await prisma.topic.findFirst({
    select: { name: true, embedding: true },
  });
  const sourceTotal = await prisma.source.count();
  const topicTotal = await prisma.topic.count();
  console.log(
    `[seed] done. sources=${sourceTotal} (sample bytes=${sampleSource?.embedding.byteLength ?? 0}) topics=${topicTotal} (sample bytes=${sampleTopic?.embedding.byteLength ?? 0})`,
  );
}

main()
  .catch((err) => {
    console.error("[seed] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
