export type LangCode = "en" | "hi" | "bn" | "mr" | "ta" | "te" | "gu" | "kn" | "ml" | "pa";

export type Language = { code: LangCode; native: string; english: string; font: string };

/** Languages offered in the switcher. `native` is always shown in its own script so people can find it. */
export const LANGUAGES: readonly Language[] = [
  { code: "en", native: "English", english: "English", font: "" },
  { code: "hi", native: "हिन्दी", english: "Hindi", font: "Noto Sans Devanagari" },
  { code: "bn", native: "বাংলা", english: "Bengali", font: "Noto Sans Bengali" },
  { code: "mr", native: "मराठी", english: "Marathi", font: "Noto Sans Devanagari" },
  { code: "ta", native: "தமிழ்", english: "Tamil", font: "Noto Sans Tamil" },
  { code: "te", native: "తెలుగు", english: "Telugu", font: "Noto Sans Telugu" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", font: "Noto Sans Gujarati" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", font: "Noto Sans Kannada" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", font: "Noto Sans Malayalam" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", font: "Noto Sans Gurmukhi" },
];

export const DEFAULT_LANG: LangCode = "en";
export const STORAGE_KEY = "saarthix:lang";

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === "string" && LANGUAGES.some((l) => l.code === value);
}

/** Best guess from the browser's language list (e.g. "hi-IN" -> "hi"). */
export function detectLang(preferred: readonly string[]): LangCode {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLangCode(base)) return base;
  }
  return DEFAULT_LANG;
}

/** Google Fonts URL covering every script we ship, loaded lazily with display=swap. */
export const INDIC_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&family=Noto+Sans+Kannada:wght@400;500;600;700&family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Noto+Sans+Gurmukhi:wght@400;500;600;700&display=swap";
