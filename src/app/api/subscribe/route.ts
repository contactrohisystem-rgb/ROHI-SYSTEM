import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { isBot } from "@/lib/honeypot";
import { sendNewsletterWelcome } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email").max(200),
  source: z.string().max(60).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const _rl = checkRateLimit(req, LIMITS.subscribe, "subscribe"); if (_rl) return _rl;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" },
      { status: 422 },
    );
  }
  if (isBot(body as Record<string, unknown>)) return NextResponse.json({ ok: true }, { status: 201 });
  const email = parsed.data.email.toLowerCase().trim();
  try {
    // upsert — if the email already exists, update nothing (idempotent).
    // Track whether this is a NEW subscriber to decide if we send the welcome email.
    const existing = await db.subscriber.findUnique({ where: { email } });
    if (!existing) {
      await db.subscriber.create({
        data: { email, source: parsed.data.source || null },
      });
      // Send welcome email (fire-and-forget — only if RESEND_API_KEY is set)
      void sendNewsletterWelcome(email);
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[subscribe] failed", err);
    return NextResponse.json(
      { ok: false, error: "Could not subscribe. Please try again." },
      { status: 500 },
    );
  }
}
