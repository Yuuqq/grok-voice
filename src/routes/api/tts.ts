import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MAX_CHARS, MAX_SPEED, MIN_SPEED, VOICE_IDS } from "@/lib/voices";

const TtsBody = z.object({
  text: z.string().trim().min(1).max(MAX_CHARS),
  voice_id: z.string().min(1).max(40),
  speed: z.number().min(MIN_SPEED).max(MAX_SPEED),
  language: z.enum(["auto", "zh", "en", "ja", "ko"]).default("auto"),
});

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "语音服务尚未开通" },
            { status: 503 },
          );
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "请求格式不正确" }, { status: 400 });
        }

        const parsed = TtsBody.safeParse(json);
        if (!parsed.success) {
          return Response.json(
            { error: "请检查文本、音色和语速" },
            { status: 400 },
          );
        }

        const { text, voice_id, speed, language } = parsed.data;
        if (!VOICE_IDS.has(voice_id)) {
          return Response.json({ error: "未知音色" }, { status: 400 });
        }

        const res = await fetch("https://api.x.ai/v1/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            text,
            voice_id,
            language,
            speed,
          }),
        });

        if (!res.ok) {
          const ct = res.headers.get("content-type") ?? "";
          if (ct.includes("json")) {
            const body = (await res.json().catch(() => null)) as {
              error?: string | { message?: string };
            } | null;
            const message =
              typeof body?.error === "string"
                ? body.error
                : body?.error?.message;
            return Response.json(
              { error: message || "配音失败，请稍后再试" },
              { status: 502 },
            );
          }
          return Response.json(
            { error: `配音失败（${res.status}）` },
            { status: 502 },
          );
        }

        const bytes = await res.arrayBuffer();
        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": res.headers.get("content-type") || "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
