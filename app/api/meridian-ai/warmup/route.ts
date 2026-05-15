import { NextResponse } from "next/server";
import { warmup } from "@/lib/meridian-ai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const loadedMs = await warmup();
    return NextResponse.json({ ready: true, loadedMs });
  } catch (err) {
    console.error("[meridian-ai] warmup failed:", err);
    return NextResponse.json(
      { ready: false, error: String(err) },
      { status: 500 },
    );
  }
}
