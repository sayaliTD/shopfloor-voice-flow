import { createServerFn } from "@tanstack/react-start";

type TranscribeInput = { audioBase64: string; format: string };

const MAX_BASE64_LENGTH = 8_000_000; // ~6 MB of audio

export const transcribeKaizenAudio = createServerFn({ method: "POST" })
  .inputValidator((input: TranscribeInput) => {
    if (!input || typeof input.audioBase64 !== "string" || input.audioBase64.length < 100) {
      throw new Error("Missing audio data");
    }
    if (input.audioBase64.length > MAX_BASE64_LENGTH) {
      throw new Error("Recording is too long. Please keep it under 2 minutes.");
    }
    const format = typeof input.format === "string" ? input.format : "webm";
    return { audioBase64: input.audioBase64, format };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const prompt = [
      "You are a manufacturing Kaizen (continuous improvement) assistant in an Indian factory.",
      "The audio is a shopfloor operator speaking in Marathi, Hindi or English.",
      "Return ONLY a JSON object with these keys:",
      '{"language":"Marathi|Hindi|English","transcript":"verbatim transcript in the spoken language","summary":"clear 1-3 sentence English Kaizen summary covering the problem and the suggested improvement","title":"max 8 word English title"}',
      "If the audio has no intelligible speech, set summary to an empty string.",
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "input_audio",
                input_audio: { data: data.audioBase64, format: data.format },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("AI transcription failed", response.status, detail);
      if (response.status === 429) throw new Error("AI is busy. Please try again in a moment.");
      throw new Error("Could not process the voice note. Please try again.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const jsonText = raw.replace(/```json|```/g, "").trim();

    let parsed: { language?: string; transcript?: string; summary?: string; title?: string } = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = { transcript: jsonText, summary: jsonText };
    }

    const transcript = (parsed.transcript ?? "").trim();
    const summary = (parsed.summary ?? "").trim();

    return {
      language: (parsed.language ?? "").trim() || null,
      title: (parsed.title ?? "").trim() || null,
      transcript,
      summary,
      text: [summary, transcript && summary !== transcript ? `\n\n— ${transcript}` : ""]
        .join("")
        .trim(),
    };
  });
