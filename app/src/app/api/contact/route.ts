import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, email, company, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Log submission — wire to email/CRM service here
  console.log("[contact]", { name, email, company, message, ts: new Date().toISOString() });

  return NextResponse.json({ ok: true });
}
