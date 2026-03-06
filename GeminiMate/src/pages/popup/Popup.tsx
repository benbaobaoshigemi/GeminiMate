import React, { useEffect, useRef, useState } from 'react';
import { Settings, PenTool, Layout, Zap, Clock, ZoomIn, Type, ChevronLeft, Upload, Trash2 } from 'lucide-react';

import { StorageKeys } from '@/core/types/common';
import type { CustomFont } from '@/features/layout/customFont';

type FormulaCopyFormat = 'latex' | 'unicodemath' | 'no-dollar';

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
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`
      relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full
      transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2
      focus-visible:ring-white/75 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${checked ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/20'}
    `}
  >
    <span className="sr-only">Toggle</span>
    <span
      aria-hidden="true"
      className={`
        pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0
        transition duration-200 ease-in-out
        ${checked ? 'translate-x-2' : '-translate-x-2'}
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
          style={{ left: '5px', right: '5px', top: 0, bottom: 0, background: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.3)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)' }}
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
  const BUILD_MARK = 'build-20260306-18-timeline-overlap-cleanup';

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

  // Page zoom
  const [pageZoom, setPageZoom] = useState(110);

  // Typography
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontFamily, setFontFamily] = useState('default');

  useEffect(() => {
    chrome.storage.local.get(
      [
        StorageKeys.LATEX_FIXER_ENABLED,
        StorageKeys.MARKDOWN_REPAIR_ENABLED,
        'geminimate_mermaid_enabled',
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
        StorageKeys.GEMINI_ZOOM_LEVEL,
        StorageKeys.GEMINI_FONT_SIZE_SCALE,
        StorageKeys.GEMINI_FONT_WEIGHT,
        StorageKeys.GEMINI_FONT_FAMILY,
        StorageKeys.GEMINI_CUSTOM_FONTS,
      ],
      (result) => {
        setLatexEnabled(result[StorageKeys.LATEX_FIXER_ENABLED] ?? true);
        setMarkdownEnabled(result[StorageKeys.MARKDOWN_REPAIR_ENABLED] ?? true);
        setMermaidEnabled(result.geminimate_mermaid_enabled ?? true);

        setFormulaCopyEnabled(result[StorageKeys.FORMULA_COPY_ENABLED] ?? true);
        const rawFormat = result[StorageKeys.FORMULA_COPY_FORMAT];
        setFormulaCopyFormat(
          rawFormat === 'unicodemath' || rawFormat === 'no-dollar' ? rawFormat : 'latex',
        );

        setWatermarkRemoverEnabled(result[StorageKeys.WATERMARK_REMOVER_ENABLED] ?? true);
        setQuoteReplyEnabled(result[StorageKeys.QUOTE_REPLY_ENABLED] ?? true);
        setBottomCleanupEnabled(result[StorageKeys.BOTTOM_CLEANUP_ENABLED] === true);

        setTimelineEnabled(result[StorageKeys.TIMELINE_ENABLED] ?? true);
        setTimelineWidth(result[StorageKeys.TIMELINE_WIDTH] ?? 24);
        setTimelineScrollMode(result.geminiTimelineScrollMode ?? 'flow');
        setTimelineHideContainer(result.geminiTimelineHideContainer ?? false);
        setTimelineAutoHide(result[StorageKeys.TIMELINE_AUTO_HIDE] ?? false);

        setChatWidth(result[StorageKeys.GEMINI_CHAT_WIDTH] ?? 70);
        setEditInputWidth(result[StorageKeys.GEMINI_EDIT_INPUT_WIDTH] ?? 60);
        setSidebarWidth(result[StorageKeys.GEMINI_SIDEBAR_WIDTH] ?? 312);
        setSidebarAutoHide(result[StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE] ?? false);

        setPageZoom(result[StorageKeys.GEMINI_ZOOM_LEVEL] ?? 110);
        setFontSizeScale(result[StorageKeys.GEMINI_FONT_SIZE_SCALE] ?? 100);
        setFontWeight(result[StorageKeys.GEMINI_FONT_WEIGHT] ?? 400);
        setFontFamily(result[StorageKeys.GEMINI_FONT_FAMILY] ?? 'default');
        setCustomFonts(result[StorageKeys.GEMINI_CUSTOM_FONTS] ?? []);
      },
    );
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
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute top-40 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative z-10 px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
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

        <div className="relative z-10 bg-white dark:bg-white/[0.02] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl dark:shadow-black/50">
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
              onChange={(v) => updateSetting('geminimate_mermaid_enabled', v, setMermaidEnabled)}
              disabled={true}
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
            <Slider
              icon={ZoomIn}
              title="页面缩放比例"
              description="整体缩放 Gemini 页面 (90%–120%，每档 10%)"
              value={pageZoom}
              min={90}
              max={120}
              step={10}
              unit="%"
              defaultValue={110}
              onChange={(v) => {
                setPageZoom(v);
                chrome.storage.local.set({ [StorageKeys.GEMINI_ZOOM_LEVEL]: v });
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
              <p className="text-[11px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1.5">字重</p>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {([
                  { value: 300, label: '细' },
                  { value: 400, label: '正常' },
                  { value: 500, label: '中' },
                  { value: 700, label: '粗' },
                ] as { value: number; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setFontWeight(opt.value);
                      chrome.storage.local.set({ [StorageKeys.GEMINI_FONT_WEIGHT]: opt.value });
                    }}
                    style={{ fontWeight: opt.value }}
                    className={`py-1.5 rounded-lg border text-xs transition-all ${
                      fontWeight === opt.value
                        ? 'border-blue-400/60 bg-blue-500/15 text-blue-400'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1.5">字体族</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: 'default', label: '默认', fontFamily: 'inherit' },
                  { value: 'monospace', label: '等宽', fontFamily: 'monospace' },
                  { value: 'serif', label: '衬线', fontFamily: 'serif' },
                  ...customFonts.map((f) => ({ value: f.name, label: f.name, fontFamily: f.name })),
                ] as { value: string; label: string; fontFamily: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setFontFamily(opt.value);
                      chrome.storage.local.set({ [StorageKeys.GEMINI_FONT_FAMILY]: opt.value });
                    }}
                    style={{ fontFamily: opt.fontFamily }}
                    className={`py-1.5 rounded-lg border text-xs transition-all ${
                      fontFamily === opt.value
                        ? 'border-blue-400/60 bg-blue-500/15 text-blue-400'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
