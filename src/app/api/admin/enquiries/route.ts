import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-auth";
import { z } from "zod";

/** Check the admin cookie — returns true if authenticated, false otherwise. */
function isAuthenticated(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [k, ...v] = c.split("=");
      return [k, v.join("=")];
    }),
  );
  return verifySessionToken(cookies[COOKIE_NAME]);
}

// GET — list all enquiries (newest first)
export async function GET(req: Request) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const enquiries = await db.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ ok: true, enquiries });
  } catch (err) {
    console.error("[admin] failed to list enquiries", err);
    return NextResponse.json({ ok: false, error: "Failed to load enquiries" }, { status: 500 });
  }
}

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["new", "contacted", "proposal_sent", "won", "lost"]).optional(),
  notes: z.string().max(5000).optional(),
  followUpDate: z.string().nullable().optional(), // ISO date string or null
});

// PATCH — update an enquiry's status/notes/followUpDate
export async function PATCH(req: Request) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { id, status, notes, followUpDate } = parsed.data;

  try {
    const updated = await db.enquiry.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(followUpDate !== undefined && {
          followUpDate: followUpDate ? new Date(followUpDate) : null,
        }),
      },
    });
    return NextResponse.json({ ok: true, enquiry: updated });
  } catch (err) {
    console.error("[admin] failed to update enquiry", err);
    return NextResponse.json({ ok: false, error: "Failed to update enquiry" }, { status: 500 });
  }
}
