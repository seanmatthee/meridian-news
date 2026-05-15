import { NextResponse } from "next/server";
import { embed } from "@/lib/meridian-ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "empty-input" }, { status: 400 });
  }

  try {
    const vec = await embed(text);
    return NextResponse.json({ embedding: Array.from(vec) });
  } catch (err) {
    console.error("[meridian-ai] embed failed:", err);
    return NextResponse.json(
      { error: "inference-failed", detail: String(err) },
      { status: 500 },
    );
  }
}
