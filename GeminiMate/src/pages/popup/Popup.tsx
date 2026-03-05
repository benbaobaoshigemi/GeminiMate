import React, { useEffect, useState } from 'react';
import { Settings, PenTool, Layout, Zap, Clock, MoreHorizontal } from 'lucide-react';

import { debugService } from '@/core/services/DebugService';
import { StorageKeys } from '@/core/types/common';

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
      ${checked ? 'bg-blue-500' : 'bg-white/20'}
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
    className={`flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 ${disabled ? 'opacity-60' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${checked ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/70'}`}>
        <Icon size={16} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white/90">{title}</p>
          {badge && (
            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50">{description}</p>
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
}: SliderProps) => (
  <div className={`p-3 rounded-xl bg-white/5 border border-white/5 transition-all ${disabled ? 'opacity-60' : ''}`}>
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${!disabled ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/70'}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-sm font-medium text-white/90">{title}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
      <div className="ml-auto text-xs font-bold text-blue-400">{value}px</div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => !disabled && onChange(Number(e.target.value))}
      disabled={disabled}
      className={`w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer mt-2
      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
      [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    />
  </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-3 mt-6 first:mt-2 px-1">
    <Icon size={14} className="text-blue-400" />
    <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{title}</h2>
    <div className="h-px bg-gradient-to-r from-blue-500/20 to-transparent flex-1 ml-2" />
  </div>
);

export default function Popup() {
  const BUILD_MARK = 'build-20260305-13-watermark-quote';

  const [latexEnabled, setLatexEnabled] = useState(true);
  const [markdownEnabled, setMarkdownEnabled] = useState(true);
  const [mermaidEnabled, setMermaidEnabled] = useState(true);

  const [formulaCopyEnabled, setFormulaCopyEnabled] = useState(true);
  const [formulaCopyFormat, setFormulaCopyFormat] = useState<FormulaCopyFormat>('latex');
  const [watermarkRemoverEnabled, setWatermarkRemoverEnabled] = useState(true);
  const [quoteReplyEnabled, setQuoteReplyEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  const [timelineEnabled, setTimelineEnabled] = useState(true);
  const [timelineWidth, setTimelineWidth] = useState(24);
  const [timelineScrollMode, setTimelineScrollMode] = useState('flow');
  const [timelineHideContainer, setTimelineHideContainer] = useState(false);

  useEffect(() => {
    void debugService.init('popup');

    const clickLogger = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      debugService.log('click', 'popup-click', {
        tag: target.tagName.toLowerCase(),
        id: target.id || null,
        className: target.className || null,
        text: (target.textContent ?? '').trim().slice(0, 60) || null,
      });
    };

    document.addEventListener('click', clickLogger, true);

    chrome.storage.local.get(
      [
        StorageKeys.LATEX_FIXER_ENABLED,
        StorageKeys.MARKDOWN_REPAIR_ENABLED,
        'geminimate_mermaid_enabled',
        StorageKeys.FORMULA_COPY_ENABLED,
        StorageKeys.FORMULA_COPY_FORMAT,
        StorageKeys.DEBUG_MODE,
        StorageKeys.WATERMARK_REMOVER_ENABLED,
        StorageKeys.QUOTE_REPLY_ENABLED,
        StorageKeys.TIMELINE_ENABLED,
        'geminiTimelineScrollMode',
        'geminiTimelineHideContainer',
        StorageKeys.TIMELINE_WIDTH,
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

        setDebugMode(result[StorageKeys.DEBUG_MODE] === true);
        setWatermarkRemoverEnabled(result[StorageKeys.WATERMARK_REMOVER_ENABLED] ?? true);
        setQuoteReplyEnabled(result[StorageKeys.QUOTE_REPLY_ENABLED] ?? true);

        setTimelineEnabled(result[StorageKeys.TIMELINE_ENABLED] ?? true);
        setTimelineWidth(result[StorageKeys.TIMELINE_WIDTH] ?? 24);
        setTimelineScrollMode(result.geminiTimelineScrollMode ?? 'flow');
        setTimelineHideContainer(result.geminiTimelineHideContainer ?? false);
      },
    );

    return () => {
      document.removeEventListener('click', clickLogger, true);
    };
  }, []);

  const updateSetting = (key: string, value: boolean, setter: (v: boolean) => void): void => {
    setter(value);
    chrome.storage.local.set({ [key]: value });
    debugService.log('popup', 'setting-updated', { key, value });
  };

  const updateValueSetting = (key: string, value: unknown): void => {
    chrome.storage.local.set({ [key]: value });
    debugService.log('popup', 'setting-updated', { key, value });
  };

  const updateFormulaCopyFormat = (value: FormulaCopyFormat): void => {
    setFormulaCopyFormat(value);
    updateValueSetting(StorageKeys.FORMULA_COPY_FORMAT, value);
  };

  return (
    <div className="w-[360px] max-h-[600px] overflow-y-auto bg-[#0f111a] p-4 text-white font-sans antialiased selection:bg-blue-500/30">
      <div className="w-full relative">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute top-40 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative z-10 px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                GeminiMate
              </h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">GeminiMate Core</p>
            </div>
          </div>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white">
            <Settings size={18} />
          </button>
        </div>

        <div className="relative z-10 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
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
          <div className="space-y-2">
            <SettingRow
              icon={Layout}
              title="Layout 布局优化"
              description="调整聊天、编辑、侧栏宽度"
              checked={false}
              onChange={() => {}}
              disabled={true}
              badge="Coming Soon"
            />
          </div>

          <SectionHeader icon={Zap} title="功能增强类" />
          <div className="space-y-2">
            <SettingRow
              icon={Zap}
              title="公式点击复制"
              description="支持 LaTeX/MathML/纯文本"
              checked={formulaCopyEnabled}
              onChange={(v) => updateSetting(StorageKeys.FORMULA_COPY_ENABLED, v, setFormulaCopyEnabled)}
            />
            <div className={`p-3 rounded-xl bg-white/5 border border-white/5 transition-all ${!formulaCopyEnabled ? 'opacity-60' : ''}`}>
              <p className="text-sm font-medium text-white/90">公式复制格式</p>
              <p className="text-xs text-white/50 mt-1 mb-3">选择点击公式时复制的格式</p>
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
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        active ? 'border-blue-400/60 bg-blue-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      } ${!formulaCopyEnabled ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white/90 font-medium">{option.title}</p>
                        {active ? <span className="text-blue-300 text-xs font-bold">已选中</span> : null}
                      </div>
                      <p className="text-xs text-white/50 mt-1">{option.desc}</p>
                    </button>
                  );
                })}
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
              onChange={() => {}}
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
            <Slider
              icon={Layout}
              title="时间线粗细调节"
              description="拖动滑块无级调整点击热区"
              value={timelineWidth}
              min={8}
              max={32}
              step={2}
              onChange={(v) => {
                setTimelineWidth(v);
                chrome.storage.local.set({ [StorageKeys.TIMELINE_WIDTH]: v });
              }}
            />
          </div>

          <SectionHeader icon={MoreHorizontal} title="其他" />
          <div className="space-y-2">
            <SettingRow
              icon={Settings}
              title="调试模式"
              description="记录点击事件与执行日志"
              checked={debugMode}
              onChange={(v) => updateSetting(StorageKeys.DEBUG_MODE, v, setDebugMode)}
              badge={debugMode ? 'ON' : null}
            />
            <button
              type="button"
              disabled={!debugMode}
              onClick={() => {
                void debugService.clearLogs();
                debugService.log('popup', 'debug-logs-cleared');
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                debugMode
                  ? 'border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200'
                  : 'border-white/10 bg-white/5 text-white/40 cursor-not-allowed'
              }`}
            >
              清空本地调试日志
            </button>
            <SettingRow
              icon={MoreHorizontal}
              title="Word 一键导出"
              description="保留公式排版（开发中）"
              checked={false}
              onChange={() => {}}
              disabled={true}
              badge="WIP"
            />
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] text-white/30 font-medium tracking-wider font-mono">
            GEMINIMATE_V1.0_STABLE | {BUILD_MARK}
          </p>
        </div>
      </div>
    </div>
  );
}
