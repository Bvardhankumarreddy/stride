import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

const COLORS = ["#1a73e8", "#6b38d4", "#d93025", "#e37400", "#0f9d58", "#00796b"];

function getUserColor(id: string) {
  const hash = id.split("").reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      console.error("[liveblocks-auth] LIVEBLOCKS_SECRET_KEY is not set");
      return new Response("Liveblocks not configured", { status: 503 });
    }

    const body = await request.json() as { room?: string };
    const room = body.room;
    if (!room) {
      return new Response("Missing room", { status: 400 });
    }

    const liveblocks = new Liveblocks({ secret });

    const userId = session.user.id ?? session.user.email ?? "anonymous";
    const name = session.user.name ?? "Anonymous";

    const lb = liveblocks.prepareSession(userId, {
      userInfo: {
        name,
        color: getUserColor(userId),
        initials: getInitials(name),
      },
    });

    lb.allow(room, lb.FULL_ACCESS);

    const { body: lbBody, status } = await lb.authorize();
    return new Response(lbBody, { status });
  } catch (err) {
    console.error("[liveblocks-auth] error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
