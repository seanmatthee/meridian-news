/**
 * test-meridian-ai — smoke test for the self-hosted AI layer.
 * Runs 5 intent queries, plus an extractive AND an abstractive summarization
 * over the same 5 sample articles.
 *
 *   npm run test:ai
 */
import { interpretIntent, summarize } from "../lib/meridian-ai";
import type { ArticleInput } from "../lib/meridian-ai";

const INTENT_QUERIES = [
  "show me SA market news",
  "latest tech from Europe",
  "what's happening with rugby",
  "global politics this week",
  "JSE today",
];

const SAMPLE_ARTICLES: ArticleInput[] = [
  {
    title: "JSE All Share closes higher as resource stocks rally",
    source: "Moneyweb",
    url: "https://example.com/jse-rally",
    content:
      "The JSE All Share Index closed 1.2% higher on Wednesday, led by a sharp rally in resource stocks. Anglo American, BHP and Sasol all posted gains of more than 2% as global commodity prices firmed. The rand strengthened against the US dollar, helping to support sentiment among foreign investors. Analysts cited improving demand from China and a softer US dollar as the main drivers behind the move. Trading volumes were above the 30-day average, suggesting genuine conviction behind the rally.",
  },
  {
    title: "South African government tables new energy plan",
    source: "Daily Maverick",
    url: "https://example.com/sa-energy",
    content:
      "South Africa's government has tabled a new Integrated Resource Plan aimed at reducing reliance on coal-fired power. The proposal commits the country to adding 6 gigawatts of renewable capacity by 2030 and pushing back the decommissioning of several Eskom coal stations. Civil society groups welcomed the targets but warned that implementation has lagged previous commitments. The plan must still pass cabinet review and parliamentary scrutiny before becoming policy.",
  },
  {
    title: "OpenAI announces new reasoning model with longer context",
    source: "TechCrunch",
    url: "https://example.com/openai-reasoning",
    content:
      "OpenAI has unveiled a new reasoning-focused large language model with a one-million-token context window. The company says the model is designed for complex multi-step tasks, including code generation, scientific analysis, and long-document summarization. Early benchmarks show meaningful improvements over the previous flagship on math and competitive programming tasks. The model will be made available via the OpenAI API starting next week, with consumer access following shortly after.",
  },
  {
    title: "European Central Bank holds rates as inflation eases",
    source: "FT Markets",
    url: "https://example.com/ecb-rates",
    content:
      "The European Central Bank held interest rates steady at its latest meeting, citing easing inflation pressure across the euro area. Headline inflation in the bloc fell to 2.4% in the most recent reading, closer to the central bank's 2% target than at any point in the last two years. President Christine Lagarde signaled that cuts later in the year remain on the table but emphasized that the bank would remain data-dependent. Markets reacted positively, with European equities closing higher and bond yields easing.",
  },
  {
    title: "Springboks dominate All Blacks in test match opener",
    source: "News24",
    url: "https://example.com/boks",
    content:
      "South Africa's Springboks beat the All Blacks 32-15 in the opening test of their three-match series. Captain Siya Kolisi led from the front with a man-of-the-match performance, while the forward pack overpowered their New Zealand counterparts in the scrums and lineouts. The win marks the Boks' first home victory over the All Blacks in four years and sets up a fascinating second test in Cape Town next weekend. Coach Rassie Erasmus praised the team's discipline and execution.",
  },
];

async function runIntent() {
  console.log("\n=== INTENT QUERIES ===");
  for (const q of INTENT_QUERIES) {
    const result = await interpretIntent(q);
    console.log(`\n> ${q}`);
    console.log(
      `  region=${result.region} timeframe=${result.timeframe} confidence=${result.confidence.toFixed(3)}`,
    );
    console.log(
      `  topics: ${result.topics.map((t) => `${t.slug}(${t.score.toFixed(2)})`).join(", ") || "-"}`,
    );
    console.log(
      `  outlets: ${result.outlets.map((o) => `${o.slug}(${o.score.toFixed(2)})`).join(", ") || "-"}`,
    );
  }
}

async function runExtractive() {
  console.log("\n=== EXTRACTIVE SUMMARY (medium) ===");
  const result = await summarize({
    articles: SAMPLE_ARTICLES,
    mode: "extractive",
    length: "medium",
  });
  console.log(result.summary);
  console.log(`(cached=${result.cached})`);
}

async function runAbstractive() {
  console.log("\n=== ABSTRACTIVE SUMMARY (medium) ===");
  const result = await summarize({
    articles: SAMPLE_ARTICLES,
    mode: "abstractive",
    length: "medium",
  });
  console.log(result.summary);
  console.log(`(cached=${result.cached})`);
}

async function main() {
  const t0 = Date.now();
  await runIntent();
  await runExtractive();
  await runAbstractive();
  console.log(`\nTotal: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error("[test-meridian-ai] FAILED:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
