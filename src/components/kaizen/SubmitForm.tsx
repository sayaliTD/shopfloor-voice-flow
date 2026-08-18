import { useServerFn } from "@tanstack/react-start";
import { Camera, CheckCircle2, ImageUp, Loader2, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { NumPad } from "@/components/kaizen/NumPad";
import { VoiceRecorder } from "@/components/kaizen/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { transcribeKaizenAudio } from "@/lib/kaizen.functions";
import { LANGS, t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const BUCKET = "kaizen-attachments";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the recording"));
    reader.readAsDataURL(blob);
  });
}

function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02 + index * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3 + index * 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.16);
      osc.stop(ctx.currentTime + 0.45 + index * 0.16);
    });
  } catch {
    // audio feedback is optional
  }
}

function SectionHeading({
  index,
  primary,
  secondary,
}: {
  index: number;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-steel text-base font-bold text-steel-foreground">
        {index}
      </span>
      <div className="leading-tight">
        <p className="text-lg font-bold">{primary}</p>
        <p className="text-sm text-muted-foreground">{secondary}</p>
      </div>
    </div>
  );
}

export function SubmitForm() {
  const [lang, setLang] = useState<Lang>("mr");
  const [employeeId, setEmployeeId] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const transcribe = useServerFn(transcribeKaizenAudio);

  useEffect(() => {
    if (!done) return;
    playChime();
    const timeout = setTimeout(() => {
      setEmployeeId("");
      setAudioBlob(null);
      setTranscription("");
      setDetectedLanguage(null);
      setImageFile(null);
      setImagePreview(null);
      setDone(false);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [done]);

  async function handleRecorded(blob: Blob) {
    setAudioBlob(blob);
    setIsTranscribing(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const result = await transcribe({ data: { audioBase64, format: "webm" } });
      setDetectedLanguage(result.language);
      setTranscription(result.text || result.transcript || "");
      if (!result.text && !result.transcript) {
        toast.error(t("needVoice", lang));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transcription failed");
    } finally {
      setIsTranscribing(false);
    }
  }

  function pickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    event.target.value = "";
  }

  async function handleSubmit() {
    if (!/^\d{4}$/.test(employeeId)) {
      toast.error(t("needId", lang));
      return;
    }
    if (!audioBlob || !transcription.trim()) {
      toast.error(t("needVoice", lang));
      return;
    }

    setIsSubmitting(true);
    try {
      const stamp = Date.now();
      const audioPath = `${employeeId}/${stamp}-voice.webm`;
      const audioUpload = await supabase.storage
        .from(BUCKET)
        .upload(audioPath, audioBlob, { contentType: audioBlob.type || "audio/webm" });
      if (audioUpload.error) throw audioUpload.error;

      let imagePath: string | null = null;
      if (imageFile) {
        const extension = imageFile.name.split(".").pop() ?? "jpg";
        imagePath = `${employeeId}/${stamp}-photo.${extension}`;
        const imageUpload = await supabase.storage
          .from(BUCKET)
          .upload(imagePath, imageFile, { contentType: imageFile.type });
        if (imageUpload.error) throw imageUpload.error;
      }

      const insert = await supabase.from("kaizens").insert({
        employee_id: employeeId,
        audio_url: audioPath,
        image_url: imagePath,
        transcription: transcription.trim(),
        language: detectedLanguage,
      });
      if (insert.error) throw insert.error;

      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-success px-6 text-center text-success-foreground">
        <CheckCircle2 className="size-32 animate-in zoom-in duration-500" strokeWidth={2.5} />
        <div>
          <h1 className="text-5xl font-extrabold">{t("thanks", lang)}</h1>
          <p className="mt-3 text-2xl font-semibold">{t("received", lang)}</p>
          <p className="mt-1 text-lg opacity-90">Submission Received!</p>
        </div>
        <p className="text-base opacity-80">{t("nextOperator", lang)}</p>
      </div>
    );
  }

  const busy = isSubmitting || isTranscribing;

  return (
    <div className="min-h-screen pb-32">
      <div className="h-2 hazard-stripe" />
      <header className="bg-steel px-4 pb-5 pt-5 text-steel-foreground">
        <div className="mx-auto flex max-w-md items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">{t("appTitle", lang)}</h1>
            <p className="text-sm opacity-80">{t("appSubtitle", lang)}</p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-sidebar-border">
            {LANGS.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setLang(option.code)}
                className={cn(
                  "px-2.5 py-2 text-sm font-bold",
                  lang === option.code
                    ? "bg-primary text-primary-foreground"
                    : "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 py-5">
        <section className="panel space-y-4 p-4">
          <SectionHeading index={1} primary={t("employeeId", lang)} secondary={t("employeeIdHint", lang)} />
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className={cn(
                  "flex h-16 w-14 items-center justify-center rounded-lg border-2 text-3xl font-extrabold",
                  employeeId.length === slot
                    ? "border-primary bg-card"
                    : "border-input bg-muted text-foreground",
                )}
              >
                {employeeId[slot] ?? ""}
              </div>
            ))}
          </div>
          <input
            inputMode="numeric"
            pattern="\d*"
            maxLength={4}
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="0000"
            aria-label={t("employeeId", lang)}
            className="w-full rounded-lg border-2 border-input bg-card px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary"
          />
          <NumPad value={employeeId} onChange={setEmployeeId} />
        </section>

        <section className="panel space-y-4 p-4">
          <SectionHeading index={2} primary={t("voiceNote", lang)} secondary={t("voiceHint", lang)} />
          <VoiceRecorder
            lang={lang}
            disabled={busy}
            onRecorded={handleRecorded}
            onReset={() => {
              setAudioBlob(null);
              setTranscription("");
              setDetectedLanguage(null);
            }}
          />

          {isTranscribing ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-3 text-base font-semibold text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              {t("processing", lang)}
            </div>
          ) : null}

          {transcription && !isTranscribing ? (
            <div className="space-y-2 rounded-lg border-2 border-success/40 bg-accent/50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-accent-foreground">
                <Sparkles className="size-4" />
                {t("transcript", lang)}
                {detectedLanguage ? (
                  <span className="ml-auto rounded-full bg-steel px-2 py-0.5 text-xs font-semibold text-steel-foreground">
                    {detectedLanguage}
                  </span>
                ) : null}
              </div>
              <textarea
                value={transcription}
                onChange={(event) => setTranscription(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-md border border-input bg-card p-3 text-base leading-relaxed outline-none focus:border-primary"
              />
            </div>
          ) : null}
        </section>

        <section className="panel space-y-4 p-4">
          <SectionHeading index={3} primary={t("photo", lang)} secondary={t("photoHint", lang)} />
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-lg border-2 border-input">
              <img src={imagePreview} alt="Attached Kaizen photo" className="h-56 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                aria-label={t("remove", lang)}
                className="absolute right-2 top-2 rounded-full bg-destructive p-2 text-destructive-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted py-6 text-base font-bold active:bg-secondary"
              >
                <Camera className="size-8" />
                {t("camera", lang)}
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted py-6 text-base font-bold active:bg-secondary"
              >
                <ImageUp className="size-8" />
                {t("gallery", lang)}
              </button>
            </div>
          )}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={pickImage}
            className="hidden"
          />
          <input ref={galleryRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </section>

        <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <ShieldCheck className="size-4" />
          {t("privacyNote", lang)}
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-3 rounded-xl bg-primary py-5 text-xl font-extrabold text-primary-foreground tap-3d tap-3d-active disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="size-6 animate-spin" /> : <Send className="size-6" />}
          {isSubmitting ? t("submitting", lang) : t("submit", lang)}
        </button>
      </div>
    </div>
  );
}
