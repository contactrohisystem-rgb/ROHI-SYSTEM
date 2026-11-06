import { NextResponse } from "next/server";
import { verifyPassword, createSessionToken, COOKIE_NAME, SESSION_DURATION_MS, isAdminConfigured } from "@/lib/admin-auth";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Admin password not configured. Set ADMIN_PASSWORD in .env" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Password is required" }, { status: 422 });
  }

  if (!verifyPassword(parsed.data.password)) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const token = createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
  return response;
}
