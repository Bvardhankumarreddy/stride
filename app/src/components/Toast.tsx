"use client";

import { useEffect, useState } from "react";

type ToastState = { msg: string; id: number } | null;

let _dispatch: ((s: ToastState) => void) | null = null;

export function toast(msg: string) {
  _dispatch?.({ msg, id: Date.now() });
}

export function ToastProvider() {
  const [state, setState] = useState<ToastState>(null);
  _dispatch = setState;

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setState(null), 2500);
    return () => clearTimeout(t);
  }, [state]);

  if (!state) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl shadow-2xl pointer-events-none">
      {state.msg}
    </div>
  );
}
