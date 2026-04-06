import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const apiUrl = process.env.API_URL ?? "http://localhost:4000";

  try {
    const res = await fetch(`${apiUrl}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[contact]", err.message);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
