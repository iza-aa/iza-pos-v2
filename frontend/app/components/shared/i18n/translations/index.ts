import type { Language } from "../types";
import { commonTranslations } from "./common";
import { managerTranslations } from "./manager";
import { ownerTranslations } from "./owner";

const mergeTranslations = (language: Language) => ({
  ...commonTranslations[language],
  ...ownerTranslations[language],
  ...managerTranslations[language],
});

export const translations: Record<Language, Record<string, string>> = {
  en: mergeTranslations("en"),
  id: mergeTranslations("id"),
};
