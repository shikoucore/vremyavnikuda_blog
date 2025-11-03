import { ui, defaultLang, type UIKey, type Languages } from './ui';

export function getLangFromUrl(url: URL): Languages {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in ui) return lang as Languages;
  return defaultLang;
}

export function useTranslations(lang: Languages) {
  return function t(key: UIKey): string {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function getLocalizedPath(path: string, lang: Languages): string {
  if (lang === defaultLang) return path;
  return `/${lang}${path}`;
}
