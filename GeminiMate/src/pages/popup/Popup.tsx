import React, { useEffect, useRef, useState } from 'react';
import { Settings, PenTool, Layout, Zap, Clock, Type, ChevronLeft, Upload, Trash2 } from 'lucide-react';

import { StorageKeys } from '@/core/types/common';
import type { CustomFont } from '@/features/layout/customFont';

type FormulaCopyFormat = 'latex' | 'unicodemath' | 'no-dollar';

const SANS_PRESET_OPTIONS = [
  {
    value: 'sans-apple',
    label: '苹果生态',
    description: 'PingFang SC / San Francisco',
    fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif",
  },
  {
    value: 'sans-sys',
    label: '系统默认',
    description: 'Segoe UI / 微软雅黑',
    fontFamily: "'Segoe UI', 'Microsoft YaHei UI', sans-serif",
  },
  {
    value: 'sans-harmony',
    label: '鸿蒙 OS',
    description: 'HarmonyOS Sans SC',
    fontFamily: "'HarmonyOS Sans SC', sans-serif",
  },
  {
    value: 'sans-modern',
    label: '现代开源',
    description: 'MiSans / 阿里普惠体',
    fontFamily: "'MiSans', sans-serif",
  },
  {
    value: 'sans-grotesk',
    label: '经典无衬线',
    description: 'Helvetica / Arial',
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  {
    value: 'sans-humanist',
    label: '人文阅读',
    description: 'Source Sans 3',
    fontFamily: "'Source Sans 3', sans-serif",
  },
  {
    value: 'sans-tech',
    label: '极客等宽',
    description: 'JetBrains / Fira Code',
    fontFamily: "'JetBrains Mono', monospace",
  },
] as const;

const SERIF_PRESET_OPTIONS = [
  {
    value: 'serif-source',
    label: '思源宋体',
    description: 'Source Han Serif SC',
    fontFamily: "'Source Han Serif SC', serif",
  },
  {
    value: 'serif-traditional',
    label: '经典明体',
    description: 'SimSun / Songti',
    fontFamily: "'Songti SC', SimSun, serif",
  },
  {
    value: 'serif-fangsong',
    label: '公文仿宋',
    description: 'FangSong / STFangsong',
    fontFamily: "FangSong, serif",
  },
  {
    value: 'serif-kaiti',
    label: '手写楷体',
    description: 'KaiTi / Kaiti SC',
    fontFamily: "KaiTi, serif",
  },
  {
    value: 'serif-newspaper',
    label: '报纸排版',
    description: 'Constantia / STSong',
    fontFamily: "Constantia, 'Times New Roman', serif",
  },
  {
    value: 'serif-editorial',
    label: '优雅英文',
    description: 'Baskerville / 经典组合',
    fontFamily: "Baskerville, serif",
  },
  {
    value: 'serif-georgia',
    label: 'Web 经典',
    description: 'Georgia / Cambria',
    fontFamily: "Georgia, serif",
  },
] as const;

const DEFAULT_SANS_PRESET = 'sans-apple';
const DEFAULT_SERIF_PRESET = 'serif-source';

const normalizeFontFamilyValue = (value: unknown): string => {
  const next = String(value || 'default');
  if (next === 'monospace') return 'sans';
  return next;
};

const normalizeSansPresetValue = (fontFamilyValue: unknown, presetValue: unknown): string => {
  if (String(fontFamilyValue || '') === 'monospace') return 'sans-tech';
  return String(presetValue || DEFAULT_SANS_PRESET);
};

const normalizeSerifPresetValue = (value: unknown): string => String(value || DEFAULT_SERIF_PRESET);

const resolveToggleValue = (value: unknown, fallback = true): boolean => {
  if (value === undefined) return fallback;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    if (normalized === '0') return false;
    if (normalized === '1') return true;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return value !== false;
};

const Toggle = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`
      relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full px-0.5
      transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2
      focus-visible:ring-white/75 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${checked ? 'justify-end' : 'justify-start'}
      ${checked ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/20'}
    `}
  >
    <span className="sr-only">Toggle</span>
    <span
      aria-hidden="true"
      className={`
        pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0
        transition duration-200 ease-in-out
      `}
    />
  </button>
);

const SettingRow = ({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
  badge = null,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (c: boolean) => void;
  disabled?: boolean;
  badge?: string | null;
}) => (
  <div
    className={`flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all hover:bg-slate-100 dark:hover:bg-white/10 ${disabled ? 'opacity-60' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${checked ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/70'}`}>
        <Icon size={16} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800 dark:text-white/90">{title}</p>
          {badge && (
            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-white/50">{description}</p>
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

interface SliderProps {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  icon: React.ElementType;
  unit?: string;
  defaultValue?: number;
}

const Slider = ({
  title,
  description,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  icon: Icon,
  unit = 'px',
  defaultValue,
}: SliderProps) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const isAtDefault = defaultValue !== undefined && value === defaultValue;
  return (
    <div className={`p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg shrink-0 ${!disabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/70'}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-white/90">{title}</p>
          <p className="text-xs text-slate-500 dark:text-white/50">{description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {defaultValue !== undefined && (
            <button
              type="button"
              onClick={() => !disabled && onChange(defaultValue)}
              disabled={disabled || isAtDefault}
              title="恢复默认值"
              className={`w-6 h-6 flex items-center justify-center rounded-md text-base leading-none transition-all
                ${isAtDefault || disabled
                  ? 'text-slate-300 dark:text-white/20 cursor-not-allowed'
                  : 'text-slate-500 dark:text-white/50 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer'
                }`}
            >
              ↺
            </button>
          )}
          <div className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md tabular-nums min-w-[3rem] text-center">
            {value}{unit}
          </div>
        </div>
      </div>
      {/* Ball-in-track slider: track is taller than the thumb so the ball appears embedded */}
      <div className="relative h-[14px] flex items-center mt-1">
        <div
          className="absolute rounded-full overflow-hidden pointer-events-none"
          style={{ left: '5px', right: '5px', top: 0, bottom: 0, background: 'rgba(148,163,184,0.15)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.18)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${percentage}%`, background: '#3b82f6' }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => !disabled && onChange(Number(e.target.value))}
          disabled={disabled}
          className={`relative z-10 w-full h-[14px] appearance-none bg-transparent cursor-pointer outline-none focus:outline-none
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-[10px] [&::-webkit-slider-thumb]:h-[10px]
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-[0_0_0_2.5px_rgba(59,130,246,0.9),0_1px_3px_rgba(0,0,0,0.4)]
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-moz-range-thumb]:w-[10px] [&::-moz-range-thumb]:h-[10px]
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:shadow-[0_0_0_2.5px_rgba(59,130,246,0.9)]
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  )
};

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-3 mt-6 first:mt-2 px-1">
    <Icon size={14} className="text-blue-400" />
    <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{title}</h2>
    <div className="h-px bg-gradient-to-r from-blue-400/30 dark:from-blue-500/20 to-transparent flex-1 ml-2" />
  </div>
);

export default function Popup() {
  const BUILD_MARK = 'build-20260307-s20-mermaid-scan-boost';

  // View routing: 'main' or 'settings'
  const [view, setView] = useState<'main' | 'settings'>('main');

  // Custom fonts state
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [pendingFontName, setPendingFontName] = useState('');
  const [pendingFontData, setPendingFontData] = useState('');
  const [fontFileLabel, setFontFileLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [latexEnabled, setLatexEnabled] = useState(true);
  const [markdownEnabled, setMarkdownEnabled] = useState(true);
  const [mermaidEnabled, setMermaidEnabled] = useState(true);
  const [thoughtTranslationEnabled, setThoughtTranslationEnabled] = useState(false);

  const [formulaCopyEnabled, setFormulaCopyEnabled] = useState(true);
  const [formulaCopyFormat, setFormulaCopyFormat] = useState<FormulaCopyFormat>('latex');
  const [watermarkRemoverEnabled, setWatermarkRemoverEnabled] = useState(true);
  const [quoteReplyEnabled, setQuoteReplyEnabled] = useState(true);
  const [bottomCleanupEnabled, setBottomCleanupEnabled] = useState(false);

  const [timelineEnabled, setTimelineEnabled] = useState(true);
  const [timelineWidth, setTimelineWidth] = useState(24);
  const [timelineScrollMode, setTimelineScrollMode] = useState('flow');
  const [timelineHideContainer, setTimelineHideContainer] = useState(false);
  const [timelineAutoHide, setTimelineAutoHide] = useState(false);

  // Layout features
  const [chatWidth, setChatWidth] = useState(70);
  const [editInputWidth, setEditInputWidth] = useState(60);
  const [sidebarWidth, setSidebarWidth] = useState(312);
  const [sidebarAutoHide, setSidebarAutoHide] = useState(false);

  // Typography
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontFamily, setFontFamily] = useState('default');
  const [sansPreset, setSansPreset] = useState(DEFAULT_SANS_PRESET);
  const [serifPreset, setSerifPreset] = useState(DEFAULT_SERIF_PRESET);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);
  const [paragraphIndentEnabled, setParagraphIndentEnabled] = useState(false);
  const [emphasisMode, setEmphasisMode] = useState<'bold' | 'underline'>('bold');

  useEffect(() => {
    const keys = [
      StorageKeys.LATEX_FIXER_ENABLED,
      StorageKeys.MARKDOWN_REPAIR_ENABLED,
      StorageKeys.MERMAID_RENDER_ENABLED,
      StorageKeys.THOUGHT_TRANSLATION_ENABLED,
      StorageKeys.FORMULA_COPY_ENABLED,
      StorageKeys.FORMULA_COPY_FORMAT,
      StorageKeys.WATERMARK_REMOVER_ENABLED,
      StorageKeys.QUOTE_REPLY_ENABLED,
      StorageKeys.BOTTOM_CLEANUP_ENABLED,
      StorageKeys.TIMELINE_ENABLED,
      'geminiTimelineScrollMode',
      'geminiTimelineHideContainer',
      StorageKeys.TIMELINE_WIDTH,
      StorageKeys.TIMELINE_AUTO_HIDE,
      StorageKeys.GEMINI_CHAT_WIDTH,
      StorageKeys.GEMINI_EDIT_INPUT_WIDTH,
      StorageKeys.GEMINI_SIDEBAR_WIDTH,
      StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE,
      StorageKeys.GEMINI_FONT_SIZE_SCALE,
      StorageKeys.GEMINI_FONT_WEIGHT,
      StorageKeys.GEMINI_FONT_FAMILY,
      StorageKeys.GEMINI_SANS_PRESET,
      StorageKeys.GEMINI_SERIF_PRESET,
      StorageKeys.GEMINI_CUSTOM_FONTS,
      StorageKeys.GEMINI_LETTER_SPACING,
      StorageKeys.GEMINI_LINE_HEIGHT,
      StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED,
      StorageKeys.GEMINI_EMPHASIS_MODE,
    ];

    const applyResult = (result: Record<string, unknown>): void => {
      setLatexEnabled(resolveToggleValue(result[StorageKeys.LATEX_FIXER_ENABLED]));
      setMarkdownEnabled(resolveToggleValue(result[StorageKeys.MARKDOWN_REPAIR_ENABLED]));
      setMermaidEnabled(resolveToggleValue(result[StorageKeys.MERMAID_RENDER_ENABLED]));
      setThoughtTranslationEnabled(resolveToggleValue(result[StorageKeys.THOUGHT_TRANSLATION_ENABLED], false));

      setFormulaCopyEnabled(result[StorageKeys.FORMULA_COPY_ENABLED] ?? true);
      const rawFormat = result[StorageKeys.FORMULA_COPY_FORMAT];
      setFormulaCopyFormat(
        rawFormat === 'unicodemath' || rawFormat === 'no-dollar' ? rawFormat as FormulaCopyFormat : 'latex',
      );

      setWatermarkRemoverEnabled(resolveToggleValue(result[StorageKeys.WATERMARK_REMOVER_ENABLED]));
      setQuoteReplyEnabled(resolveToggleValue(result[StorageKeys.QUOTE_REPLY_ENABLED]));
      setBottomCleanupEnabled(resolveToggleValue(result[StorageKeys.BOTTOM_CLEANUP_ENABLED], false));

      setTimelineEnabled(resolveToggleValue(result[StorageKeys.TIMELINE_ENABLED]));
      setTimelineWidth(Number(result[StorageKeys.TIMELINE_WIDTH]) || 24);
      setTimelineScrollMode((result as Record<string, unknown>)['geminiTimelineScrollMode'] as string ?? 'flow');
      setTimelineHideContainer(resolveToggleValue((result as Record<string, unknown>)['geminiTimelineHideContainer'], false));
      setTimelineAutoHide(resolveToggleValue(result[StorageKeys.TIMELINE_AUTO_HIDE], false));

      setChatWidth(Number(result[StorageKeys.GEMINI_CHAT_WIDTH]) || 70);
      setEditInputWidth(Number(result[StorageKeys.GEMINI_EDIT_INPUT_WIDTH]) || 60);
      setSidebarWidth(Number(result[StorageKeys.GEMINI_SIDEBAR_WIDTH]) || 312);
      setSidebarAutoHide(resolveToggleValue(result[StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE], false));

      setFontSizeScale(Number(result[StorageKeys.GEMINI_FONT_SIZE_SCALE]) || 100);
      const rawFontFamily = result[StorageKeys.GEMINI_FONT_FAMILY];
      setFontWeight(Number(result[StorageKeys.GEMINI_FONT_WEIGHT]) || 400);
      setFontFamily(normalizeFontFamilyValue(rawFontFamily));
      setSansPreset(normalizeSansPresetValue(rawFontFamily, result[StorageKeys.GEMINI_SANS_PRESET]));
      setSerifPreset(normalizeSerifPresetValue(result[StorageKeys.GEMINI_SERIF_PRESET]));
      setCustomFonts(result[StorageKeys.GEMINI_CUSTOM_FONTS] as typeof customFonts ?? []);
      setLetterSpacing(Number(result[StorageKeys.GEMINI_LETTER_SPACING]) || 0);
      setLineHeight(Number(result[StorageKeys.GEMINI_LINE_HEIGHT]) || 0);
      setParagraphIndentEnabled(resolveToggleValue(result[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED], false));
      setEmphasisMode(result[StorageKeys.GEMINI_EMPHASIS_MODE] === 'underline' ? 'underline' : 'bold');
    };

    const applyStorageChanges = (changes: Record<string, chrome.storage.StorageChange>): void => {
      if (changes[StorageKeys.LATEX_FIXER_ENABLED]) {
        setLatexEnabled(resolveToggleValue(changes[StorageKeys.LATEX_FIXER_ENABLED].newValue));
      }
      if (changes[StorageKeys.MARKDOWN_REPAIR_ENABLED]) {
        setMarkdownEnabled(resolveToggleValue(changes[StorageKeys.MARKDOWN_REPAIR_ENABLED].newValue));
      }
      if (changes[StorageKeys.MERMAID_RENDER_ENABLED]) {
        setMermaidEnabled(resolveToggleValue(changes[StorageKeys.MERMAID_RENDER_ENABLED].newValue));
      }
      if (changes[StorageKeys.THOUGHT_TRANSLATION_ENABLED]) {
        setThoughtTranslationEnabled(resolveToggleValue(changes[StorageKeys.THOUGHT_TRANSLATION_ENABLED].newValue, false));
      }
      if (changes[StorageKeys.FORMULA_COPY_ENABLED]) {
        setFormulaCopyEnabled(changes[StorageKeys.FORMULA_COPY_ENABLED].newValue ?? true);
      }
      if (changes[StorageKeys.FORMULA_COPY_FORMAT]) {
        const next = changes[StorageKeys.FORMULA_COPY_FORMAT].newValue;
        setFormulaCopyFormat(next === 'unicodemath' || next === 'no-dollar' ? next : 'latex');
      }
      if (changes[StorageKeys.WATERMARK_REMOVER_ENABLED]) {
        setWatermarkRemoverEnabled(resolveToggleValue(changes[StorageKeys.WATERMARK_REMOVER_ENABLED].newValue));
      }
      if (changes[StorageKeys.QUOTE_REPLY_ENABLED]) {
        setQuoteReplyEnabled(resolveToggleValue(changes[StorageKeys.QUOTE_REPLY_ENABLED].newValue));
      }
      if (changes[StorageKeys.BOTTOM_CLEANUP_ENABLED]) {
        setBottomCleanupEnabled(resolveToggleValue(changes[StorageKeys.BOTTOM_CLEANUP_ENABLED].newValue, false));
      }
      if (changes[StorageKeys.TIMELINE_ENABLED]) {
        setTimelineEnabled(changes[StorageKeys.TIMELINE_ENABLED].newValue ?? true);
      }
      if (changes.geminiTimelineScrollMode) {
        setTimelineScrollMode(changes.geminiTimelineScrollMode.newValue ?? 'flow');
      }
      if (changes.geminiTimelineHideContainer) {
        setTimelineHideContainer(changes.geminiTimelineHideContainer.newValue ?? false);
      }
      if (changes[StorageKeys.TIMELINE_WIDTH]) {
        setTimelineWidth(Number(changes[StorageKeys.TIMELINE_WIDTH].newValue) || 24);
      }
      if (changes[StorageKeys.TIMELINE_AUTO_HIDE]) {
        setTimelineAutoHide(changes[StorageKeys.TIMELINE_AUTO_HIDE].newValue ?? false);
      }
      if (changes[StorageKeys.GEMINI_CHAT_WIDTH]) {
        setChatWidth(Number(changes[StorageKeys.GEMINI_CHAT_WIDTH].newValue) || 70);
      }
      if (changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH]) {
        setEditInputWidth(Number(changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH].newValue) || 60);
      }
      if (changes[StorageKeys.GEMINI_SIDEBAR_WIDTH]) {
        setSidebarWidth(Number(changes[StorageKeys.GEMINI_SIDEBAR_WIDTH].newValue) || 312);
      }
      if (changes[StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE]) {
        setSidebarAutoHide(changes[StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE].newValue ?? false);
      }
      if (changes[StorageKeys.GEMINI_FONT_SIZE_SCALE]) {
        setFontSizeScale(Number(changes[StorageKeys.GEMINI_FONT_SIZE_SCALE].newValue) || 100);
      }
      if (changes[StorageKeys.GEMINI_FONT_WEIGHT]) {
        setFontWeight(Number(changes[StorageKeys.GEMINI_FONT_WEIGHT].newValue) || 400);
      }
      if (changes[StorageKeys.GEMINI_FONT_FAMILY]) {
        const rawFontFamily = changes[StorageKeys.GEMINI_FONT_FAMILY].newValue;
        setFontFamily(normalizeFontFamilyValue(rawFontFamily));
        if (!changes[StorageKeys.GEMINI_SANS_PRESET]) {
          setSansPreset((current) => normalizeSansPresetValue(rawFontFamily, current));
        }
      }
      if (changes[StorageKeys.GEMINI_SANS_PRESET]) {
        const rawFontFamily = changes[StorageKeys.GEMINI_FONT_FAMILY]?.newValue ?? fontFamily;
        setSansPreset(normalizeSansPresetValue(rawFontFamily, changes[StorageKeys.GEMINI_SANS_PRESET].newValue));
      }
      if (changes[StorageKeys.GEMINI_SERIF_PRESET]) {
        setSerifPreset(normalizeSerifPresetValue(changes[StorageKeys.GEMINI_SERIF_PRESET].newValue));
      }
      if (changes[StorageKeys.GEMINI_CUSTOM_FONTS]) {
        setCustomFonts((changes[StorageKeys.GEMINI_CUSTOM_FONTS].newValue as CustomFont[]) ?? []);
      }
      if (changes[StorageKeys.GEMINI_LETTER_SPACING]) {
        setLetterSpacing(Number(changes[StorageKeys.GEMINI_LETTER_SPACING].newValue) || 0);
      }
      if (changes[StorageKeys.GEMINI_LINE_HEIGHT]) {
        setLineHeight(Number(changes[StorageKeys.GEMINI_LINE_HEIGHT].newValue) || 0);
      }
      if (changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED]) {
        setParagraphIndentEnabled(changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue === true);
      }
      if (changes[StorageKeys.GEMINI_EMPHASIS_MODE]) {
        setEmphasisMode(changes[StorageKeys.GEMINI_EMPHASIS_MODE].newValue === 'underline' ? 'underline' : 'bold');
      }
    };

    chrome.storage.local.get(keys, applyResult);

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      if (area !== 'local') return;
      const relevant = Object.keys(changes).some((k) => (keys as string[]).includes(k));
      if (!relevant) return;
      applyStorageChanges(changes);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const updateSetting = (key: string, value: boolean, setter: (v: boolean) => void): void => {
    setter(value);
    chrome.storage.local.set({ [key]: value });
  };

  const updateValueSetting = (key: string, value: unknown): void => {
    chrome.storage.local.set({ [key]: value });
  };

  const updateFormulaCopyFormat = (value: FormulaCopyFormat): void => {
    setFormulaCopyFormat(value);
    updateValueSetting(StorageKeys.FORMULA_COPY_FORMAT, value);
  };

  const currentSansPreset =
    SANS_PRESET_OPTIONS.find((option) => option.value === sansPreset) ?? SANS_PRESET_OPTIONS[0];
  const currentSerifPreset =
    SERIF_PRESET_OPTIONS.find((option) => option.value === serifPreset) ?? SERIF_PRESET_OPTIONS[0];

  const updateSansPreset = (value: string): void => {
    setSansPreset(value);
    chrome.storage.local.set({ [StorageKeys.GEMINI_SANS_PRESET]: value });
  };

  const updateSerifPreset = (value: string): void => {
    setSerifPreset(value);
    chrome.storage.local.set({ [StorageKeys.GEMINI_SERIF_PRESET]: value });
  };

  // ── Custom Font Handlers ─────────────────────────────────────────────────────

  const saveCustomFonts = (fonts: CustomFont[]): void => {
    setCustomFonts(fonts);
    chrome.storage.local.set({ [StorageKeys.GEMINI_CUSTOM_FONTS]: fonts });
  };

  const handleFontFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingFontData(dataUrl);
      setFontFileLabel(file.name);
      if (!pendingFontName) {
        setPendingFontName(file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const addCustomFont = (): void => {
    if (!pendingFontName.trim() || !pendingFontData) return;
    const newFonts = [...customFonts, { name: pendingFontName.trim(), data: pendingFontData }];
    saveCustomFonts(newFonts);
    setPendingFontName('');
    setPendingFontData('');
    setFontFileLabel('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeCustomFont = (name: string): void => {
    const newFonts = customFonts.filter((f) => f.name !== name);
    saveCustomFonts(newFonts);
    if (fontFamily === name) {
      setFontFamily('default');
      chrome.storage.local.set({ [StorageKeys.GEMINI_FONT_FAMILY]: 'default' });
    }
  };

  // ── Settings View ────────────────────────────────────────────────────────────

  if (view === 'settings') {
    return (
      <div className="w-[360px] max-h-[600px] overflow-y-auto bg-slate-50 dark:bg-[#0f111a] text-slate-900 dark:text-white font-sans antialiased selection:bg-blue-500/30">
        <div className="p-4 relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setView('main')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-base font-bold text-slate-800 dark:text-white/90">设置</h1>
          </div>

          <div className="bg-white dark:bg-white/[0.02] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-4">
            <SectionHeader icon={Type} title="预置字体" />
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2 px-0.5">非衬线预设</p>
                <div className="space-y-2">
                  {SANS_PRESET_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateSansPreset(option.value)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        sansPreset === option.value
                          ? 'border-blue-400/60 bg-blue-500/15 text-blue-400'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70'
                      }`}
                    >
                      <span className="block text-sm font-medium" style={{ fontFamily: option.fontFamily }}>{option.label}</span>
                      <span className="block text-[11px] opacity-65 mt-0.5">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2 px-0.5">衬线预设</p>
                <div className="space-y-2">
                  {SERIF_PRESET_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateSerifPreset(option.value)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        serifPreset === option.value
                          ? 'border-blue-400/60 bg-blue-500/15 text-blue-400'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70'
                      }`}
                    >
                      <span className="block text-sm font-medium" style={{ fontFamily: option.fontFamily }}>{option.label}</span>
                      <span className="block text-[11px] opacity-65 mt-0.5">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/[0.02] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <SectionHeader icon={Type} title="本地字体加载" />
            <p className="text-xs text-slate-500 dark:text-white/50 mb-4 px-1">
              加载本地字体文件（.ttf / .woff / .woff2），加载后可在主界面字体族选项中选用。
            </p>

            <div className="space-y-3">
              {/* File picker */}
              <div
                className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer hover:border-blue-400/60 hover:bg-blue-500/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} className="text-slate-400 dark:text-white/40 shrink-0" />
                <span className={`text-sm truncate ${fontFileLabel ? 'text-slate-700 dark:text-white/80' : 'text-slate-400 dark:text-white/40'}`}>
                  {fontFileLabel || '点击选择字体文件 (.ttf / .woff / .woff2)'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.woff,.woff2,.otf"
                className="hidden"
                onChange={handleFontFileSelect}
              />

              {/* Font name input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pendingFontName}
                  onChange={(e) => setPendingFontName(e.target.value)}
                  placeholder="字体名称（用于选择时显示）"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-800 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-blue-400/70 transition-colors"
                />
                <button
                  type="button"
                  onClick={addCustomFont}
                  disabled={!pendingFontName.trim() || !pendingFontData}
                  className="px-4 py-2 rounded-lg bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-400 transition-colors text-white text-sm font-medium shrink-0"
                >
                  添加
                </button>
              </div>

              {/* Loaded fonts list */}
              {customFonts.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[11px] text-slate-400 dark:text-white/40 uppercase tracking-wider px-0.5">已加载字体</p>
                  {customFonts.map((font) => (
                    <div
                      key={font.name}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
                    >
                      <span className="text-sm text-slate-700 dark:text-white/80 truncate" style={{ fontFamily: font.name }}>
                        {font.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCustomFont(font.name)}
                        className="ml-2 p-1.5 rounded-md text-slate-400 dark:text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {customFonts.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-white/30 text-center py-2">暂无已加载字体</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main View ────────────────────────────────────────────────────────────────

  return (
    <div className="w-[360px] max-h-[600px] overflow-y-auto bg-slate-50 dark:bg-[#0f111a] p-4 text-slate-900 dark:text-white font-sans antialiased selection:bg-blue-500/30">
      <div className="w-full relative">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/15 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative z-10 px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/25">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 dark:from-white to-slate-500 dark:to-white/70">
                GeminiMate
              </h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">GeminiMate Core</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView('settings')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-400 dark:text-white/50 hover:text-slate-700 dark:hover:text-white"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="relative z-10 bg-white dark:bg-white/[0.02] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm dark:shadow-none">
          <SectionHeader icon={PenTool} title="文字修复类" />
          <div className="space-y-2">
            <SettingRow
              icon={PenTool}
              title="LaTeX 修补引擎"
              description="修复公式乱码与中文间距"
              checked={latexEnabled}
              onChange={(v) => updateSetting(StorageKeys.LATEX_FIXER_ENABLED, v, setLatexEnabled)}
              badge="Active"
            />
            <SettingRow
              icon={PenTool}
              title="Markdown 修复"
              description="修复加粗标签破损"
              checked={markdownEnabled}
              onChange={(v) => updateSetting(StorageKeys.MARKDOWN_REPAIR_ENABLED, v, setMarkdownEnabled)}
              badge="Active"
            />
            <SettingRow
              icon={PenTool}
              title="Mermaid 图表渲染"
              description="将代码块转为可视化流程图"
              checked={mermaidEnabled}
              onChange={(v) => updateSetting(StorageKeys.MERMAID_RENDER_ENABLED, v, setMermaidEnabled)}
            />
            <SettingRow
              icon={PenTool}
              title="思维链翻译"
              description="仅翻译 reasoning / thoughts 面板为中文"
              checked={thoughtTranslationEnabled}
              onChange={(v) =>
                updateSetting(
                  StorageKeys.THOUGHT_TRANSLATION_ENABLED,
                  v,
                  setThoughtTranslationEnabled,
                )
              }
            />
          </div>

          <SectionHeader icon={Layout} title="UI增强类" />
          <div className="space-y-4">
            <Slider
              icon={Layout}
              title="对话区域宽度"
              description="限制聊天气泡在此宽度内 (窄 <--> 宽)"
              value={chatWidth}
              min={30}
              max={100}
              step={1}
              unit="%"
              defaultValue={70}
              onChange={(v) => {
                setChatWidth(v);
                chrome.storage.local.set({ [StorageKeys.GEMINI_CHAT_WIDTH]: v });
              }}
            />
            <Slider
              icon={Layout}
              title="编辑输入框宽度"
              description="对话修改框的水平伸缩比例 (窄 <--> 宽)"
              value={editInputWidth}
              min={30}
              max={100}
              step={1}
              unit="%"
              defaultValue={60}
              onChange={(v) => {
                setEditInputWidth(v);
                chrome.storage.local.set({ [StorageKeys.GEMINI_EDIT_INPUT_WIDTH]: v });
              }}
            />
            <Slider
              icon={Layout}
              title="侧边栏宽度"
              description="原生菜单导航列的像素宽度"
              value={sidebarWidth}
              min={180}
              max={540}
              step={10}
              unit="px"
              defaultValue={312}
              onChange={(v) => {
                setSidebarWidth(v);
                chrome.storage.local.set({ [StorageKeys.GEMINI_SIDEBAR_WIDTH]: v });
              }}
            />
            <SettingRow
              icon={Layout}
              title="侧栏自动收起"
              description="鼠标离开时自动收起侧边栏，鼠标进入时展开"
              checked={sidebarAutoHide}
              onChange={(v) => updateSetting(StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE, v, setSidebarAutoHide)}
            />
            <SettingRow
              icon={Layout}
              title="全景模式"
              description="隐藏底部免责声明、去除输入区阴影及两侧黑色渐变遮罩"
              checked={bottomCleanupEnabled}
              onChange={(v) =>
                updateSetting(StorageKeys.BOTTOM_CLEANUP_ENABLED, v, setBottomCleanupEnabled)
              }
            />
          </div>

          <SectionHeader icon={Type} title="排版调节" />
          <div className="space-y-4">
            <Slider
              icon={Type}
              title="字体大小"
              description="仅缩放消息内容与公式，UI 尺寸不变"
              value={fontSizeScale}
              min={80}
              max={130}
              step={2}
              unit="%"
              defaultValue={100}
              onChange={(v) => {
                setFontSizeScale(v);
                chrome.storage.local.set({ [StorageKeys.GEMINI_FONT_SIZE_SCALE]: v });
              }}
            />
            <Slider
              icon={Type}
              title="字间距"
              description="字母间距调节 (0 = 默认，每格 +0.01em)"
              value={letterSpacing}
              min={0}
              max={15}
              step={1}
              unit=""
              defaultValue={0}
              onChange={(v) => {
                setLetterSpacing(v);
                chrome.storage.local.set({ [StorageKeys.GEMINI_LETTER_SPACING]: v });
              }}
            />
            <Slider
              icon={Type}
              title="行间距"
              description="行高调节 (0 = 默认，每格 +0.1 倍行高)"
              value={lineHeight}
              min={0}
              max={8}
              step={1}
              unit=""
              defaultValue={0}
              onChange={(v) => {
                setLineHeight(v);
                chrome.storage.local.set({ [StorageKeys.GEMINI_LINE_HEIGHT]: v });
              }}
            />
            <SettingRow
              icon={Type}
              title="首行缩进"
              description="响应区内的非空段落统一应用首行缩进"
              checked={paragraphIndentEnabled}
              onChange={(v) =>
                updateSetting(
                  StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED,
                  v,
                  setParagraphIndentEnabled,
                )
              }
            />
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                  <PenTool size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white/90">强调显示方式</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">Markdown 加粗标记的视觉呈现</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { value: 'bold' as const, label: '加粗', desc: '默认' },
                  { value: 'underline' as const, label: '下划线', desc: '去除加粗，保留虚线' },
                ] as { value: 'bold' | 'underline'; label: string; desc: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setEmphasisMode(opt.value);
                      chrome.storage.local.set({ [StorageKeys.GEMINI_EMPHASIS_MODE]: opt.value });
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs transition-all text-left ${
                      emphasisMode === opt.value
                        ? 'border-blue-400/60 bg-blue-500/15 text-blue-400'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70'
                    }`}
                  >
                    <span className={`block font-medium ${opt.value === 'bold' ? 'font-bold' : ''}`}>{opt.label}</span>
                    <span className="block text-[10px] opacity-60 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                  <Type size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white/90">字重与字体族</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">调整消息文字的粗细与字体风格</p>
                </div>
              </div>
              <Slider
                icon={Type}
                title="字重精细调节"
                description="更细步进地调整正文粗细（25 为一档）"
                value={fontWeight}
                min={250}
                max={800}
                step={25}
                unit=""
                defaultValue={400}
                onChange={(v) => {
                  setFontWeight(v);
                  chrome.storage.local.set({ [StorageKeys.GEMINI_FONT_WEIGHT]: v });
                }}
              />
              <p className="text-[11px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1.5">字体族</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: 'default', label: '默认', fontFamily: 'inherit', description: 'Gemini 原生' },
                  { value: 'sans', label: '非衬线', fontFamily: currentSansPreset.fontFamily, description: currentSansPreset.label },
                  { value: 'serif', label: '衬线', fontFamily: currentSerifPreset.fontFamily, description: currentSerifPreset.label },
                  ...customFonts.map((f) => ({ value: f.name, label: f.name, fontFamily: f.name, description: '本地字体' })),
                ] as { value: string; label: string; fontFamily: string; description: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setFontFamily(opt.value);
                      chrome.storage.local.set({ [StorageKeys.GEMINI_FONT_FAMILY]: opt.value });
                    }}
                    style={{ fontFamily: opt.fontFamily }}
                    className={`py-2 rounded-lg border text-xs transition-all ${
                      fontFamily === opt.value
                        ? 'border-blue-400/60 bg-blue-500/15 text-blue-400'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70'
                    }`}
                  >
                    <span className="block font-medium">{opt.label}</span>
                    <span className="block text-[10px] opacity-60 mt-0.5">{opt.description}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-white/40 mt-2 px-0.5">
                预置字体可在“设置”中继续切换：当前非衬线为 {currentSansPreset.label}，衬线为 {currentSerifPreset.label}。
              </p>
            </div>
          </div>

          <SectionHeader icon={Zap} title="功能增强类" />
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formulaCopyEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/70'}`}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white/90">公式点击复制</p>
                    <p className="text-xs text-slate-500 dark:text-white/50">支持 LaTeX/MathML/纯文本</p>
                  </div>
                </div>
                <Toggle
                  checked={formulaCopyEnabled}
                  onChange={(v) => updateSetting(StorageKeys.FORMULA_COPY_ENABLED, v, setFormulaCopyEnabled)}
                />
              </div>

              <div className={`mt-3 pt-3 border-t border-slate-200 dark:border-white/10 ${!formulaCopyEnabled ? 'opacity-60' : ''}`}>
                <p className="text-sm font-medium text-slate-800 dark:text-white/90">公式复制格式</p>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-1 mb-3">选择点击公式时复制的格式</p>
                <div className="space-y-2">
                  {[
                    { value: 'latex' as const, title: 'LaTeX', desc: '自动按行内/块级补全 $ 符号' },
                    { value: 'unicodemath' as const, title: 'MathML (Word)', desc: '适合 Word 粘贴，保留公式结构' },
                    { value: 'no-dollar' as const, title: '纯文本 LaTeX', desc: '仅复制公式文本，不加定界符' },
                  ].map((option) => {
                    const active = formulaCopyFormat === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={!formulaCopyEnabled}
                        onClick={() => updateFormulaCopyFormat(option.value)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${active ? 'border-blue-400/60 bg-blue-500/15' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                          } ${!formulaCopyEnabled ? 'cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-800 dark:text-white/90 font-medium">{option.title}</p>
                          {active ? <span className="text-blue-400 text-xs font-bold">已选中</span> : null}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-white/50 mt-1">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <SettingRow
              icon={Zap}
              title="水印移除 (NanoBanana)"
              description="无损移除背景隐形水印"
              checked={watermarkRemoverEnabled}
              onChange={(v) => updateSetting(StorageKeys.WATERMARK_REMOVER_ENABLED, v, setWatermarkRemoverEnabled)}
            />
            <SettingRow
              icon={Zap}
              title="引用回复"
              description="选中文本后自动插入引用回复"
              checked={quoteReplyEnabled}
              onChange={(v) => updateSetting(StorageKeys.QUOTE_REPLY_ENABLED, v, setQuoteReplyEnabled)}
            />
            <SettingRow
              icon={Zap}
              title="高级文件夹功能"
              description="树形目录管理对话"
              checked={false}
              onChange={() => { }}
              disabled={true}
            />
          </div>

          <SectionHeader icon={Clock} title="时间线 (Timeline)" />
          <div className="space-y-2">
            <SettingRow
              icon={Clock}
              title="侧边时间线"
              description="对话流快速导航"
              checked={timelineEnabled}
              onChange={(v) => updateSetting(StorageKeys.TIMELINE_ENABLED, v, setTimelineEnabled)}
            />
            <SettingRow
              icon={Layout}
              title="平滑滚动模式"
              description="关闭后使用瞬间跳转"
              checked={timelineScrollMode === 'flow'}
              onChange={(v) => {
                const mode = v ? 'flow' : 'jump';
                setTimelineScrollMode(mode);
                chrome.storage.local.set({ geminiTimelineScrollMode: mode });
              }}
            />
            <SettingRow
              icon={Layout}
              title="隐藏原生容器"
              description="防闪跳机制（适合长对话）"
              checked={timelineHideContainer}
              onChange={(v) => updateSetting('geminiTimelineHideContainer', v, setTimelineHideContainer)}
            />
            <SettingRow
              icon={Layout}
              title="侧栏自动隐藏"
              description="平时贴边缩小，悬浮时展开"
              checked={timelineAutoHide}
              onChange={(v) => updateSetting(StorageKeys.TIMELINE_AUTO_HIDE, v, setTimelineAutoHide)}
            />
            <Slider
              icon={Layout}
              title="时间线粗细调节"
              description="拖动滑块无级调整点击热区"
              value={timelineWidth}
              min={8}
              max={32}
              step={2}
              unit="px"
              defaultValue={24}
              onChange={(v) => {
                setTimelineWidth(v);
                chrome.storage.local.set({ [StorageKeys.TIMELINE_WIDTH]: v });
              }}
            />
          </div>

          <SectionHeader icon={Settings} title="其他" />
          <div className="space-y-2">
            <SettingRow
              icon={Zap}
              title="Word 一键导出"
              description="保留公式排版（开发中）"
              checked={false}
              onChange={() => { }}
              disabled={true}
              badge="WIP"
            />
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-400 dark:text-white/30 font-medium tracking-wider font-mono">
            GEMINIMATE_V1.0_STABLE | {BUILD_MARK}
          </p>
        </div>
      </div>
    </div>
  );
}
