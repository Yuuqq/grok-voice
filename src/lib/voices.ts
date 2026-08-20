export const DEFAULT_SPEED = 0.82;
export const MIN_SPEED = 0.7;
export const MAX_SPEED = 1.5;
export const SPEED_STEP = 0.01;
export const MAX_CHARS = 1200;
export const DEFAULT_VOICE = "eve";

export type VoiceGender = "female" | "male";

export type GrokVoice = {
  id: string;
  name: string;
  gender: VoiceGender;
  blurb: string;
};

export const GROK_VOICES: readonly GrokVoice[] = [
  { id: "eve", name: "Eve", gender: "female", blurb: "默认音色，清晰温柔" },
  { id: "ara", name: "Ara", gender: "female", blurb: "明亮亲和，适合对话" },
  { id: "luna", name: "Luna", gender: "female", blurb: "沉静夜声，从容舒缓" },
  { id: "liora", name: "Liora", gender: "female", blurb: "柔和叙述，适合朗读" },
  { id: "celeste", name: "Celeste", gender: "female", blurb: "空灵干净" },
  { id: "iris", name: "Iris", gender: "female", blurb: "清亮利落" },
  { id: "aurora", name: "Aurora", gender: "female", blurb: "暖而开阔" },
  { id: "carina", name: "Carina", gender: "female", blurb: "轻快自然" },
  { id: "ursa", name: "Ursa", gender: "female", blurb: "低一些的女声" },
  { id: "leo", name: "Leo", gender: "male", blurb: "沉稳男声，适合讲述" },
  { id: "sal", name: "Sal", gender: "male", blurb: "叙事感强" },
  { id: "rex", name: "Rex", gender: "male", blurb: "低沉有力" },
  { id: "helix", name: "Helix", gender: "male", blurb: "清朗干净" },
  { id: "orion", name: "Orion", gender: "male", blurb: "沉着可靠" },
  { id: "atlas", name: "Atlas", gender: "male", blurb: "厚实稳重" },
  { id: "cosmo", name: "Cosmo", gender: "male", blurb: "轻松随性" },
  { id: "kepler", name: "Kepler", gender: "male", blurb: "知性克制" },
  { id: "sirius", name: "Sirius", gender: "male", blurb: "明亮利落" },
  { id: "lumen", name: "Lumen", gender: "male", blurb: "温和清晰" },
  { id: "castor", name: "Castor", gender: "male", blurb: "中性偏暖" },
  { id: "altair", name: "Altair", gender: "male", blurb: "干脆直接" },
  { id: "zenith", name: "Zenith", gender: "male", blurb: "高而清晰" },
  { id: "perseus", name: "Perseus", gender: "male", blurb: "坚定有力" },
  { id: "helios", name: "Helios", gender: "male", blurb: "开阔明亮" },
  { id: "lux", name: "Lux", gender: "male", blurb: "精致干净" },
  { id: "rigel", name: "Rigel", gender: "male", blurb: "冷一点的男声" },
  { id: "naksh", name: "Naksh", gender: "male", blurb: "有个性的讲述" },
  { id: "zagan", name: "Zagan", gender: "male", blurb: "低沉沙哑" },
] as const;

export const VOICE_IDS = new Set(GROK_VOICES.map((v) => v.id));

export const FEATURED_VOICE_IDS = ["eve", "ara", "luna", "leo", "sal", "rex"] as const;

export function detectLanguage(text: string): "zh" | "ja" | "ko" | "en" {
  const sample = text.slice(0, 120);
  const kana = (sample.match(/[\u3040-\u30ff]/g) ?? []).length;
  const hangul = (sample.match(/[\uac00-\ud7af]/g) ?? []).length;
  const han = (sample.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (kana > 2) return "ja";
  if (hangul > 2) return "ko";
  if (han > 2) return "zh";
  if (latin > 8) return "en";
  return "zh";
}

export const SAMPLE_SCRIPT =
  "这段话用的是 Grok 自己的语音，不是浏览器里那种生硬的合成腔。句子语速已经设在 0.82，听起来会更从容一些。";
