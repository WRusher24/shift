"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface Toast {
  id: number;
  kind: "ok" | "err";
  text: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((kind: "ok" | "err", text: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  return { toasts, push };
}

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-5 start-1/2 z-[90] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full animate-pop-in items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-bold shadow-pop ${
            t.kind === "ok"
              ? "border-volt-200 bg-volt-50 text-volt-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {t.kind === "ok" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-volt-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
