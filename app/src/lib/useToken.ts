"use client";
import { useSession } from "next-auth/react";

export function useToken(): string | undefined {
  const { data: session } = useSession();
  return (session?.user as any)?.accessToken as string | undefined;
}
