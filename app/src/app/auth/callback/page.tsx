"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    if (!accessToken) {
      setError(true);
      return;
    }

    signIn("credentials", {
      token: accessToken,
      redirect: false,
    }).then((result) => {
      if (result?.ok) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        setError(true);
      }
    });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="light-page min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Authentication failed. Please try again.</p>
          <a href="/login" className="text-primary font-bold hover:underline text-sm">Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="light-page min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant">Signing you in…</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallback />
    </Suspense>
  );
}
