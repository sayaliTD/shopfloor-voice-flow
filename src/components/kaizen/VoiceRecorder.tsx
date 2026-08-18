import { Mic, Square, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  lang: Lang;
  onRecorded: (blob: Blob) => void;
  onReset: () => void;
  disabled?: boolean;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({ lang, onRecorded, onReset, disabled }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setState("done");
        onRecorded(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        setSeconds((value) => {
          if (value >= 119) stop();
          return value + 1;
        });
      }, 1000);
    } catch {
      setError(t("micDenied", lang));
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSeconds(0);
    setState("idle");
    onReset();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {state !== "done" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={state === "recording" ? stop : start}
          aria-label={state === "recording" ? t("stop", lang) : t("tapToRecord", lang)}
          className={cn(
            "relative flex size-40 flex-col items-center justify-center gap-1 rounded-full text-lg font-bold tap-3d tap-3d-active disabled:opacity-50",
            state === "recording"
              ? "bg-destructive text-destructive-foreground rec-pulse"
              : "bg-primary text-primary-foreground",
          )}
        >
          {state === "recording" ? (
            <>
              <Square className="size-10" strokeWidth={2.5} />
              <span className="font-mono text-2xl">{formatTime(seconds)}</span>
              <span className="text-xs uppercase tracking-wide">{t("stop", lang)}</span>
            </>
          ) : (
            <>
              <Mic className="size-14" strokeWidth={2.5} />
              <span className="text-sm uppercase tracking-wide">{t("tapToRecord", lang)}</span>
            </>
          )}
        </button>
      ) : (
        <div className="w-full space-y-3">
          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full" preload="metadata" />
          ) : null}
          <button
            type="button"
            onClick={reset}
            disabled={disabled}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-input bg-secondary px-4 py-3 text-base font-semibold text-secondary-foreground disabled:opacity-50"
          >
            <RotateCcw className="size-5" />
            {t("reRecord", lang)}
          </button>
        </div>
      )}

      {state === "recording" ? (
        <p className="text-base font-semibold text-destructive">{t("recording", lang)}</p>
      ) : null}
      {error ? <p className="text-base font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
