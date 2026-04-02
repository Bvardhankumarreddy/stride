import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 100,
});

type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
};

type Storage = Record<string, never>;

type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    initials: string;
  };
};

export const {
  RoomProvider,
  useOthers,
  useSelf,
  useUpdateMyPresence,
} = createRoomContext<Presence, Storage, UserMeta>(client);
