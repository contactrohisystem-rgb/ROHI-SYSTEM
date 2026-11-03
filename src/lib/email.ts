/**
 * Email notifications via Resend.
 * Uses dynamic import so the build doesn't fail if resend isn't installed.
 * Only fires if RESEND_API_KEY is set in .env.
 *
 * SECURITY: All user-provided fields are HTML-escaped before interpolation
 * into the email body to prevent injection (XSS-in-email) via crafted form
 * submissions (e.g. a visitor submitting `<img src=x onerror=...>` as their
 * name). The team's email client must not execute attacker-controlled HTML.
 */

type EnquiryData = {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  whatNeeded?: string | null;
  improving?: string | null;
  budgetRange?: string | null;
  preferredContact?: string | null;
};

const FROM = process.env.RESEND_FROM || "ROHI SYSTEMS <onboarding@resend.dev>";

/** HTML-escape a string for safe interpolation into HTML email bodies. */
function esc(s: string | null | undefined): string {
  if (!s) return "—";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const { Resend } = await import("resend");
    return new Resend(process.env.RESEND_API_KEY);
  } catch {
    return null; // resend not installed — silently skip
  }
}

export async function notifyTeamOfEnquiry(data: EnquiryData) {
  const resend = await getResend();
  if (!resend) return;
  const teamEmail = process.env.TEAM_EMAIL || "onboarding@resend.dev";
  try {
    await resend.emails.send({
      from: FROM,
      to: teamEmail,
      subject: `New enquiry — ${data.name}${data.company ? ` (${data.company})` : ""}`,
      html: `<h2>New enquiry received</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#667085;">Name</td><td><strong>${esc(data.name)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667085;">Company</td><td>${esc(data.company)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667085;">Email</td><td>${esc(data.email)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667085;">Phone / WhatsApp</td><td>${esc(data.phone)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667085;">What they need</td><td>${esc(data.whatNeeded)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667085;">Budget</td><td>${esc(data.budgetRange)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667085;">Preferred contact</td><td>${esc(data.preferredContact)}</td></tr>
        </table>
        <h3 style="margin-top:20px;">What they're trying to improve</h3>
        <p style="white-space:pre-wrap;background:#f5f7fa;padding:12px;border-radius:8px;">${esc(data.improving)}</p>`,
    });
  } catch (err) {
    console.error("[email] team notification failed", err);
  }
}

export async function sendAutoReply(data: EnquiryData) {
  const resend = await getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: data.email,
      subject: "We received your message — ROHI SYSTEMS",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#20C7C9;">ROHI SYSTEMS</p>
          <h1 style="font-size:24px;margin:8px 0 16px;">Thank you, ${esc(data.name)}.</h1>
          <p style="font-size:16px;line-height:1.6;color:#374151;">We received your message and a member of the ROHI team will follow up${data.preferredContact ? ` via ${esc(data.preferredContact)}` : ""} shortly.</p>
          <p style="font-size:16px;line-height:1.6;color:#374151;">We start by understanding the problem — not by sending a quote.</p>
          <p style="font-size:14px;color:#667085;margin-top:24px;">Technology That Moves Business.<br>Built in Mozambique.</p>
        </div>`,
    });
  } catch (err) {
    console.error("[email] auto-reply failed", err);
  }
}

/**
 * Welcome email sent to new newsletter subscribers.
 * Includes an unsubscribe link (required by Mozambique Lei 3/2017 Art 40(6)
 * for commercial/marketing electronic communications).
 *
 * The unsubscribe URL uses the site's own /api/unsubscribe endpoint.
 * In production, BASE_URL should be set to the real domain (e.g., https://rohi.systems).
 */
export async function sendNewsletterWelcome(email: string) {
  const resend = await getResend();
  if (!resend) return;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || "https://rohi.systems";
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(email)}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Welcome to ROHI Insights",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#20C7C9;">ROHI SYSTEMS</p>
          <h1 style="font-size:24px;margin:8px 0 16px;">Welcome to ROHI Insights.</h1>
          <p style="font-size:16px;line-height:1.6;color:#374151;">Thank you for subscribing. You'll hear from us when we publish something worth your time — practical perspectives on systems, AI, automation, and data, written for people who build and run organizations.</p>
          <p style="font-size:16px;line-height:1.6;color:#374151;">No spam. No fluff. Just signal.</p>
          <p style="font-size:14px;color:#667085;margin-top:24px;">Technology That Moves Business.<br>Built in Mozambique.</p>
          <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;">
          <p style="font-size:12px;color:#9ca3af;margin-top:16px;">You're receiving this because you subscribed at ${esc(baseUrl)}. <a href="${unsubscribeUrl}" style="color:#20C7C9;">Unsubscribe</a>.</p>
        </div>`,
    });
  } catch (err) {
    console.error("[email] newsletter welcome failed", err);
  }
}
