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
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { room } = await request.json() as { room: string };

  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

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

  const { body, status } = await lb.authorize();
  return new Response(body, { status });
}
