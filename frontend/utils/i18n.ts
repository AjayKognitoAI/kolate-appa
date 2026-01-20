import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// English translations
import enCommon from "../locales/en/common.json";
import enSettings from "../locales/en/settings.json";

// French translations
import frCommon from "../locales/fr/common.json";
import frSettings from "../locales/fr/settings.json";

// German translations
import deCommon from "../locales/de/common.json";
import deSettings from "../locales/de/settings.json";

// Spanish translations
import esCommon from "../locales/es/common.json";
import esSettings from "../locales/es/settings.json";

// Storage key for language preference
export const LANGUAGE_STORAGE_KEY = "kolate_language";

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "US", nativeName: "English" },
  { code: "fr", name: "French", flag: "FR", nativeName: "Francais" },
  { code: "de", name: "German", flag: "DE", nativeName: "Deutsch" },
  { code: "es", name: "Spanish", flag: "ES", nativeName: "Espanol" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
  },
  fr: {
    common: frCommon,
    settings: frSettings,
  },
  de: {
    common: deCommon,
    settings: deSettings,
  },
  es: {
    common: esCommon,
    settings: esSettings,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "settings"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  });

export default i18n;
