"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    fetch(`${API}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(data.message ?? "This link is invalid or has expired.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl cta-gradient flex items-center justify-center text-white shadow-lg shadow-primary/25 mb-8 mx-auto">
          <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-on-surface-variant">Verifying your email…</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h1 className="text-xl font-black text-on-surface">Email verified!</h1>
            <p className="text-sm text-on-surface-variant">Your email has been confirmed. You can now sign in.</p>
            <Link
              href="/login"
              className="inline-block mt-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20"
            >
              Sign in
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-error" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
            </div>
            <h1 className="text-xl font-black text-on-surface">Verification failed</h1>
            <p className="text-sm text-on-surface-variant">{message}</p>
            <Link
              href="/login"
              className="inline-block mt-2 text-primary font-bold hover:underline text-sm"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
