import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * Newsletter unsubscribe endpoint.
 *
 * Called when a subscriber clicks the "Unsubscribe" link in a newsletter email.
 * Accepts either:
 *   - GET /api/unsubscribe?email=foo@bar.com  (from email-client link click)
 *   - POST /api/unsubscribe { email: "foo@bar.com" }
 *
 * Removes the subscriber from the database and returns a simple confirmation
 * page (HTML) so the visitor sees confirmation in their browser.
 *
 * SECURITY NOTE: This uses email-only verification (no token). A determined
 * attacker could unsubscribe someone else if they knew the email. For a
 * higher-security implementation, use a per-subscriber unique token in the
 * unsubscribe URL. This is a known trade-off for simplicity — standard for
 * low-volume B2B newsletters.
 */

const emailSchema = z.string().email().max(200).transform((e) => e.toLowerCase().trim());

export async function GET(req: Request) {
  const url = new URL(req.url);
  const emailParam = url.searchParams.get("email");
  if (!emailParam) {
    return htmlResponse(missingEmailPage());
  }
  const parsed = emailSchema.safeParse(emailParam);
  if (!parsed.success) {
    return htmlResponse(errorPage("The unsubscribe link is invalid."));
  }
  try {
    await db.subscriber.delete({ where: { email: parsed.data } });
    return htmlResponse(successPage(parsed.data));
  } catch {
    // If the email doesn't exist in the DB, still show success (don't leak
    // whether an email is subscribed or not)
    return htmlResponse(successPage(parsed.data));
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const emailRaw = (body as Record<string, unknown>)?.email;
  const parsed = emailSchema.safeParse(emailRaw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 422 });
  }
  try {
    await db.subscriber.delete({ where: { email: parsed.data } });
    return NextResponse.json({ ok: true, message: "Unsubscribed" });
  } catch {
    return NextResponse.json({ ok: true, message: "Unsubscribed" });
  }
}

function htmlResponse(html: string) {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function successPage(email: string): string {
  const masked = email.replace(/(.{2}).*(@.*)/, "$1***$2");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed — ROHI SYSTEMS</title>
<style>body{font-family:system-ui,sans-serif;background:#f5f7fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:12px;padding:48px;max-width:480px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.logo{font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#20C7C9;font-weight:700}
h1{font-size:24px;margin:8px 0 16px;color:#0B1220}
p{font-size:16px;line-height:1.6;color:#374151}
a{color:#20C7C9;text-decoration:none}</style></head>
<body><div class="card">
<p class="logo">ROHI SYSTEMS</p>
<h1>You're unsubscribed.</h1>
<p>${masked} will no longer receive emails from ROHI Insights.</p>
<p style="margin-top:24px;font-size:14px;color:#667085">Changed your mind? <a href="/">Visit rohi.systems</a> to subscribe again anytime.</p>
</div></body></html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribe — ROHI SYSTEMS</title>
<style>body{font-family:system-ui,sans-serif;background:#f5f7fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:12px;padding:48px;max-width:480px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
h1{font-size:24px;margin:8px 0 16px;color:#0B1220}
p{font-size:16px;color:#374151}</style></head>
<body><div class="card"><h1>Oops.</h1><p>${message}</p></div></body></html>`;
}

function missingEmailPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribe — ROHI SYSTEMS</title>
<style>body{font-family:system-ui,sans-serif;background:#f5f7fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:12px;padding:48px;max-width:480px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
h1{font-size:24px;margin:8px 0 16px;color:#0B1220}
p{font-size:16px;color:#374151}</style></head>
<body><div class="card"><h1>No email provided.</h1><p>This link is incomplete. Use the unsubscribe link in a ROHI email to unsubscribe.</p></div></body></html>`;
}
