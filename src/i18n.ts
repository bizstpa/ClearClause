import type { Severity } from './detectors/types';

export type UiLang = 'en' | 'ar';

export interface Locale {
  htmlLang: string;
  dir: 'ltr' | 'rtl';
  title: string;
  tagline: string;
  privacyNote: string;
  disclaimer: string;
  textareaLabel: string;
  textareaPlaceholder: string;
  analyze: string;
  resultsHeading: string;
  found: string;
  notFound: string;
  /** "{count}" is replaced with the number of matched sentences. */
  matchCount: string;
  severity: Record<Severity, string>;
  switchLabel: string;
  switchTo: string;
  emptyInput: string;
  arabicCoverageNote: string;
}

// All user-facing strings live here, keyed by language — no hardcoded UI
// copy anywhere else. See CLAUDE.md "i18n is data, not branching".
export const locales: Record<UiLang, Locale> = {
  en: {
    htmlLang: 'en',
    dir: 'ltr',
    title: 'ClearClause',
    tagline: 'Paste a privacy policy. See what it actually says.',
    privacyNote: 'Analysis runs entirely in your browser — the text never leaves your machine.',
    disclaimer:
      'Not legal advice. ClearClause is a screening aid that surfaces candidate language for you to read; it does not interpret documents or assert legal conclusions.',
    textareaLabel: 'Policy text',
    textareaPlaceholder: 'Paste the full privacy policy or terms here…',
    analyze: 'Analyze',
    resultsHeading: 'Readout',
    found: 'Found',
    notFound: 'Not found',
    matchCount: '{count} matched sentence(s)',
    severity: { info: 'Info', caution: 'Caution', warning: 'Warning' },
    switchLabel: 'Language',
    switchTo: 'العربية',
    emptyInput: 'Paste some policy text first.',
    arabicCoverageNote: 'Arabic detection coverage is a starter set and still growing.',
  },
  ar: {
    htmlLang: 'ar',
    dir: 'rtl',
    title: 'ClearClause',
    tagline: 'الصق سياسة الخصوصية واطّلع على ما تقوله فعلاً.',
    privacyNote: 'يتم التحليل بالكامل داخل متصفحك — النص لا يغادر جهازك أبداً.',
    disclaimer:
      'هذه ليست استشارة قانونية. ClearClause أداة فرز تُبرز عبارات مرشّحة لتقرأها بنفسك؛ وهي لا تفسّر المستندات ولا تقدّم استنتاجات قانونية.',
    textareaLabel: 'نص السياسة',
    textareaPlaceholder: 'الصق نص سياسة الخصوصية أو الشروط هنا…',
    analyze: 'حلّل',
    resultsHeading: 'النتائج',
    found: 'موجود',
    notFound: 'غير موجود',
    matchCount: 'عدد الجمل المطابقة: {count}',
    severity: { info: 'معلومة', caution: 'انتباه', warning: 'تحذير' },
    switchLabel: 'اللغة',
    switchTo: 'English',
    emptyInput: 'الصق نص السياسة أولاً.',
    arabicCoverageNote: 'تغطية الكشف بالعربية مجموعة أولية وما زالت تتوسع.',
  },
};
