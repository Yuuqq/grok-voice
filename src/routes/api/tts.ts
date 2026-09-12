import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
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
        let userId: string;
        try {
          assertSameSiteRequest();
          const authHeader = request.headers.get("authorization");
          const bearerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : undefined;
          userId = await requireUserId(bearerToken);
        } catch (err) {
          const status = err instanceof UnauthorizedError ? 401 : 403;
          return Response.json({ error: "未授权" }, { status });
        }

        const sql = await getSql();
        const windowStart = new Date();
        windowStart.setSeconds(0, 0); // start of current minute

        const rateRows = await sql`
          insert into tts_rate_limits (user_id, window_start, request_count)
          values (${userId}, ${windowStart.toISOString()}, 1)
          on conflict (user_id, window_start)
          do update set request_count = tts_rate_limits.request_count + 1
          returning request_count
        `;

        if (rateRows[0] && (rateRows[0] as any).request_count > 10) {
          return Response.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
        }

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
