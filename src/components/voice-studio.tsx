import { useEffect, useMemo, useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { AuthChip } from "@/components/auth-chip";
import { Waveform } from "@/components/waveform";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SPEED,
  DEFAULT_VOICE,
  FEATURED_VOICE_IDS,
  GROK_VOICES,
  MAX_CHARS,
  MAX_SPEED,
  MIN_SPEED,
  SAMPLE_SCRIPT,
  SPEED_STEP,
  detectLanguage,
  type GrokVoice,
  type VoiceGender,
} from "@/lib/voices";

const SPEED_KEY = "grok-voice-speed";
const VOICE_KEY = "grok-voice-id";

type Status = "idle" | "loading" | "playing" | "paused";

function roundSpeed(n: number) {
  return Math.round(n * 100) / 100;
}

export function VoiceStudio() {
  const [text, setText] = useState(SAMPLE_SCRIPT);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE);
  const [gender, setGender] = useState<"all" | VoiceGender>("all");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fingerprintRef = useRef<string>("");

  const voice = GROK_VOICES.find((v) => v.id === voiceId) ?? GROK_VOICES[0];
  const visibleVoices = useMemo(
    () => GROK_VOICES.filter((v) => gender === "all" || v.gender === gender),
    [gender],
  );
  const featured = FEATURED_VOICE_IDS.map(
    (id) => GROK_VOICES.find((v) => v.id === id)!,
  );
  const chars = [...text].length;
  const overLimit = chars > MAX_CHARS;
  const fingerprint = `${voiceId}|${roundSpeed(speed)}|${text}`;
  const isRecommended = Math.round(speed * 100) === 82;

  useEffect(() => {
    try {
      const storedSpeed = localStorage.getItem(SPEED_KEY);
      const storedVoice = localStorage.getItem(VOICE_KEY);
      if (storedSpeed) {
        const n = Number(storedSpeed);
        if (n >= MIN_SPEED && n <= MAX_SPEED) setSpeed(roundSpeed(n));
      }
      if (storedVoice && GROK_VOICES.some((item) => item.id === storedVoice)) {
        setVoiceId(storedVoice);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SPEED_KEY, String(speed));
      localStorage.setItem(VOICE_KEY, voiceId);
    } catch {
      /* ignore */
    }
  }, [speed, voiceId]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTime = () => {
      if (!audio.duration || Number.isNaN(audio.duration)) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setStatus("idle");
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      void ctxRef.current?.close();
    };
  }, []);

  function attachGraph(el: HTMLAudioElement) {
    if (!window.AudioContext) return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    if (!sourceRef.current) {
      sourceRef.current = ctxRef.current.createMediaElementSource(el);
      const node = ctxRef.current.createAnalyser();
      node.fftSize = 128;
      sourceRef.current.connect(node);
      node.connect(ctxRef.current.destination);
      setAnalyser(node);
    }
  }

  async function speak() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("先写一点要朗读的句子");
      return;
    }
    if (overLimit) {
      toast.error(`最多 ${MAX_CHARS} 字`);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (status === "playing") {
      audio.pause();
      setStatus("paused");
      return;
    }
    if (
      status === "paused" &&
      fingerprintRef.current === fingerprint &&
      audio.src
    ) {
      attachGraph(audio);
      void audio.play();
      setStatus("playing");
      return;
    }

    setStatus("loading");
    setProgress(0);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          voice_id: voiceId,
          speed: roundSpeed(speed),
          language: detectLanguage(trimmed),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "配音失败");
      }
      const blob = await res.blob();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      audio.src = url;
      fingerprintRef.current = fingerprint;
      attachGraph(audio);
      await audio.play();
      setStatus("playing");
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : "配音失败");
    }
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setStatus("idle");
    setProgress(0);
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div
        aria-hidden
        className="studio-glow pointer-events-none absolute inset-x-0 top-0 h-80"
      />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="font-serif text-2xl tracking-wide text-fg">语声</p>
          <p className="text-xs tracking-widest text-muted uppercase">
            Grok Voice
          </p>
        </div>
        <AuthChip />
      </header>

      <main className="relative mx-auto grid w-full max-w-6xl gap-6 px-4 pb-36 sm:px-6 lg:grid-cols-2 lg:pb-32">
        <section className="flex flex-col rounded-xl bg-surface p-4 shadow-border sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl text-fg sm:text-4xl">
                用 Grok 的声音读出来
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                不再用浏览器那种生硬合成腔。这里走的是 Grok
                语音，句子语速默认 0.82。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setText(SAMPLE_SCRIPT)}
              className="hidden h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-muted hover:text-fg sm:inline-flex"
            >
              <RotateCcw className="size-3.5" />
              示例
            </button>
          </div>
          <label className="sr-only" htmlFor="script">
            要朗读的文字
          </label>
          <textarea
            id="script"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="min-h-52 flex-1 resize-y rounded-md bg-elevated p-4 font-serif text-lg leading-relaxed text-fg shadow-border outline-none focus:shadow-border-hover sm:min-h-72 sm:text-xl"
            placeholder="写下要朗读的句子…"
          />
          <div className="mt-3 flex items-center justify-between text-xs tabular-nums text-muted">
            <span>Grok TTS · {voice.name}</span>
            <span className={overLimit ? "text-danger" : undefined}>
              {chars} / {MAX_CHARS}
            </span>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="rounded-xl bg-surface p-4 shadow-border sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-fg">句子语速</h2>
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl tabular-nums text-primary">
                  {speed.toFixed(2)}
                </span>
                {!isRecommended && (
                  <button
                    type="button"
                    onClick={() => setSpeed(DEFAULT_SPEED)}
                    className="h-11 px-2 text-xs text-muted hover:text-fg"
                  >
                    回到 0.82
                  </button>
                )}
              </div>
            </div>
            <Slider.Root
              className="relative flex h-11 w-full touch-none items-center"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={SPEED_STEP}
              value={[speed]}
              onValueChange={([v]) => v !== undefined && setSpeed(roundSpeed(v))}
              aria-label="句子语速"
            >
              <Slider.Track className="relative h-1.5 grow rounded-full bg-border">
                <Slider.Range className="absolute h-full rounded-full bg-primary" />
              </Slider.Track>
              <Slider.Thumb className="block size-5 rounded-full bg-primary shadow outline-none ring-4 ring-primary/20" />
            </Slider.Root>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>从容 0.70</span>
              <span className={isRecommended ? "text-primary" : undefined}>
                推荐 0.82
              </span>
              <span>轻快 1.50</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              语速写进 Grok 的发音里，不是把音频快进慢放。
            </p>
          </section>

          <section className="rounded-xl bg-surface p-4 shadow-border sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-fg">Grok 音色</h2>
              <div className="flex rounded-full bg-elevated p-1">
                {(
                  [
                    ["all", "全部"],
                    ["female", "女声"],
                    ["male", "男声"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGender(id)}
                    className={cn(
                      "h-11 rounded-full px-3 text-xs",
                      gender === id
                        ? "bg-primary text-primary-fg"
                        : "text-muted hover:text-fg",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              {featured.map((item) => (
                <VoiceCard
                  key={item.id}
                  voice={item}
                  selected={item.id === voiceId}
                  onSelect={() => setVoiceId(item.id)}
                />
              ))}
            </div>

            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {visibleVoices.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVoiceId(item.id)}
                  className={cn(
                    "h-11 rounded-full px-3 text-sm shadow-border",
                    item.id === voiceId
                      ? "bg-primary text-primary-fg"
                      : "bg-elevated text-muted hover:text-fg",
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </section>

        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur-md">
        <PlayerDock
          status={status}
          voice={voice}
          progress={progress}
          analyser={analyser}
          onSpeak={() => void speak()}
          onStop={stop}
          disabled={overLimit || !text.trim()}
        />
      </div>
    </div>
  );
}

function VoiceCard({
  voice,
  selected,
  onSelect,
}: {
  voice: GrokVoice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-16 flex-col items-start rounded-md px-3 py-2 text-left transition-shadow duration-150",
        selected
          ? "bg-elevated shadow-border-hover"
          : "bg-elevated/60 shadow-border hover:shadow-border-hover",
      )}
    >
      <span
        className={cn(
          "text-sm font-medium",
          selected ? "text-primary" : "text-fg",
        )}
      >
        {voice.name}
      </span>
      <span className="text-xs text-muted">{voice.blurb}</span>
    </button>
  );
}

function PlayerDock({
  status,
  voice,
  progress,
  analyser,
  onSpeak,
  onStop,
  disabled,
}: {
  status: Status;
  voice: GrokVoice;
  progress: number;
  analyser: AnalyserNode | null;
  onSpeak: () => void;
  onStop: () => void;
  disabled: boolean;
}) {
  const playing = status === "playing";
  const loading = status === "loading";
  const label = loading
    ? "正在用 Grok 配音…"
    : playing
      ? "暂停"
      : status === "paused"
        ? "继续"
        : "用 Grok 朗读";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onSpeak}
        disabled={disabled || loading}
        className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-primary-fg shadow-play transition-transform duration-150 enabled:hover:scale-105 disabled:opacity-50"
        aria-label={label}
      >
        {loading ? (
          <span className="size-5 animate-spin rounded-full border-2 border-primary-fg/30 border-t-primary-fg" />
        ) : playing ? (
          <Pause className="size-6" fill="currentColor" />
        ) : (
          <Play className="ml-0.5 size-6" fill="currentColor" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-fg">{label}</p>
          <p className="shrink-0 text-xs text-muted">{voice.name}</p>
        </div>
        <Waveform analyser={analyser} active={playing} />
        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onStop}
        disabled={status === "idle" || loading}
        className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-fg disabled:opacity-30"
        aria-label="停止"
      >
        <Square className="size-4" fill="currentColor" />
      </button>
    </div>
  );
}
