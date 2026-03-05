import React, { useEffect, useState } from 'react';

import { Settings, PenTool, Layout, Zap, Clock, MoreHorizontal } from 'lucide-react';

import { debugService } from '@/core/services/DebugService';
import { StorageKeys } from '@/core/types/common';

// Custom toggle switch component
const Toggle = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
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

// Setting Row component
const SettingRow = ({
    icon: Icon,
    title,
    description,
    checked,
    onChange,
    disabled = false,
    badge = null
}: {
    icon: React.ElementType,
    title: string,
    description: string,
    checked: boolean,
    onChange: (c: boolean) => void,
    disabled?: boolean,
    badge?: string | null
}) => (
    <div className={`flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 ${disabled ? 'opacity-60' : ''}`}>
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

// Slider Component for numeric values
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

const Slider = ({ title, description, value, min, max, step, onChange, disabled = false, icon: Icon }: SliderProps) => (
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

// Section Header component
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-2 px-1">
        <Icon size={14} className="text-blue-400" />
        <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{title}</h2>
        <div className="h-px bg-gradient-to-r from-blue-500/20 to-transparent flex-1 ml-2" />
    </div>
);

export default function Popup() {
    const BUILD_MARK = 'build-20260305-13-watermark-quote';
    // State for 鏂囧瓧淇绫?(Text Repair)
    const [latexEnabled, setLatexEnabled] = useState(true);
    const [markdownEnabled, setMarkdownEnabled] = useState(true);
    const [mermaidEnabled, setMermaidEnabled] = useState(true);

    // State for UI澧炲己绫?(UI Enhancements) - PENDING
    // State for 鍔熻兘澧炲己绫?(Feature Enhancements)
    const [formulaCopyEnabled, setFormulaCopyEnabled] = useState(true);
    const [formulaCopyFormat, setFormulaCopyFormat] = useState<'latex' | 'unicodemath' | 'no-dollar'>('latex');
    const [watermarkRemoverEnabled, setWatermarkRemoverEnabled] = useState(true);
    const [quoteReplyEnabled, setQuoteReplyEnabled] = useState(true);
    const [debugMode, setDebugMode] = useState(false);

    // State for 鏃堕棿绾?(Timeline)
    const [timelineEnabled, setTimelineEnabled] = useState(true);
    const [timelineWidth, setTimelineWidth] = useState(24);
    const [timelineScrollMode, setTimelineScrollMode] = useState('flow');
    const [timelineHideContainer, setTimelineHideContainer] = useState(false);

    // Load initial settings
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

        chrome.storage.local.get([
            StorageKeys.LATEX_FIXER_ENABLED,
            StorageKeys.MARKDOWN_REPAIR_ENABLED,
            'geminimate_mermaid_enabled',
            StorageKeys.FORMULA_COPY_ENABLED,
            StorageKeys.FORMULA_COPY_FORMAT,
            StorageKeys.DEBUG_MODE,
            'geminiWatermarkRemoverEnabled',
            'gvQuoteReplyEnabled',
            StorageKeys.TIMELINE_ENABLED,
            'geminiTimelineScrollMode',
            'geminiTimelineHideContainer',
            StorageKeys.TIMELINE_WIDTH
        ], (result) => {
            setLatexEnabled(result[StorageKeys.LATEX_FIXER_ENABLED] ?? true);
            setMarkdownEnabled(result[StorageKeys.MARKDOWN_REPAIR_ENABLED] ?? true);
            setMermaidEnabled(result.geminimate_mermaid_enabled ?? true);
            setFormulaCopyEnabled(result[StorageKeys.FORMULA_COPY_ENABLED] ?? true);
            const rawFormulaCopyFormat = result[StorageKeys.FORMULA_COPY_FORMAT];
            setFormulaCopyFormat(
                rawFormulaCopyFormat === 'unicodemath' || rawFormulaCopyFormat === 'no-dollar'
                    ? rawFormulaCopyFormat
                    : 'latex',
            );
            setDebugMode(result[StorageKeys.DEBUG_MODE] === true);
            setWatermarkRemoverEnabled(result.geminiWatermarkRemoverEnabled ?? true);
            setQuoteReplyEnabled(result.gvQuoteReplyEnabled ?? true);
            setTimelineEnabled(result[StorageKeys.TIMELINE_ENABLED] ?? true);
            setTimelineWidth(result[StorageKeys.TIMELINE_WIDTH] ?? 24);
            setTimelineScrollMode(result.geminiTimelineScrollMode ?? 'flow');
            setTimelineHideContainer(result.geminiTimelineHideContainer ?? false);
        });
        return () => {
            document.removeEventListener('click', clickLogger, true);
        };
    }, []);

    // Save settings helpers
    const updateSetting = (key: string, value: boolean, setter: (v: boolean) => void) => {
        setter(value);
        chrome.storage.local.set({ [key]: value });
        debugService.log('popup', 'setting-updated', { key, value });
    };

    const updateValueSetting = (key: string, value: unknown): void => {
        chrome.storage.local.set({ [key]: value });
        debugService.log('popup', 'setting-updated', { key, value });
    };

    const updateFormulaCopyFormat = (value: 'latex' | 'unicodemath' | 'no-dollar'): void => {
        setFormulaCopyFormat(value);
        updateValueSetting(StorageKeys.FORMULA_COPY_FORMAT, value);
    };

    return (
        <div className="w-[360px] max-h-[600px] overflow-y-auto bg-[#0f111a] p-4 text-white font-sans antialiased selection:bg-blue-500/30">
            <div className="w-full relative">
                {/* Background glow effects */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute top-40 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

                {/* Header */}
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

                {/* Main Content Area - Glass Card */}
                <div className="relative z-10 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">

                    {/* Section 1: 鏂囧瓧淇绫?(Text Repair) */}
                    <SectionHeader icon={PenTool} title="鏂囧瓧淇绫? />
                    <div className="space-y-2">
                        <SettingRow
                            icon={PenTool}
                            title="LaTeX 淇ˉ寮曟搸"
                            description="淇鍏紡涔辩爜涓庝腑鏂囬棿璺?
                            checked={latexEnabled}
                            onChange={(v) => updateSetting(StorageKeys.LATEX_FIXER_ENABLED, v, setLatexEnabled)}
                            badge="Active"
                        />
                        <SettingRow
                            icon={PenTool}
                            title="Markdown 淇"
                            description="淇鍔犵矖鏍囩鐮存崯"
                            checked={markdownEnabled}
                            onChange={(v) => updateSetting(StorageKeys.MARKDOWN_REPAIR_ENABLED, v, setMarkdownEnabled)}
                            badge="Active"
                        />
                        <SettingRow
                            icon={PenTool}
                            title="Mermaid 鍥捐〃娓叉煋"
                            description="灏嗕唬鐮佸潡杞负鍙鍖栨祦绋嬪浘"
                            checked={mermaidEnabled}
                            onChange={(v) => updateSetting('geminimate_mermaid_enabled', v, setMermaidEnabled)}
                            disabled={true}
                        />
                    </div>

                    {/* Section 2: UI澧炲己绫?(UI Enhancements) */}
                    <SectionHeader icon={Layout} title="UI澧炲己绫? />
                    <div className="space-y-2">
                        <SettingRow
                            icon={Layout}
                            title="Layout 甯冨眬浼樺寲"
                            description="璋冩暣鑱婂ぉ銆佺紪杈戙€佷晶杈规爮瀹藉害"
                            checked={false}
                            onChange={() => { }}
                            disabled={true}
                            badge="Coming Soon"
                        />
                    </div>

                    {/* Section 3: 鍔熻兘澧炲己绫?(Feature Enhancements) */}
                    <SectionHeader icon={Zap} title="鍔熻兘澧炲己绫? />
                    <div className="space-y-2">
                        <SettingRow
                            icon={Zap}
                            title="鍏紡鐐瑰嚮澶嶅埗"
                            description="鏀寔 LaTeX/MathML/绾枃鏈?
                            checked={formulaCopyEnabled}
                            onChange={(v) => updateSetting(StorageKeys.FORMULA_COPY_ENABLED, v, setFormulaCopyEnabled)}
                        />
                        <div
                            className={`p-3 rounded-xl bg-white/5 border border-white/5 transition-all ${!formulaCopyEnabled ? 'opacity-60' : ''}`}
                        >
                            <p className="text-sm font-medium text-white/90">鍏紡澶嶅埗鏍煎紡</p>
                            <p className="text-xs text-white/50 mt-1 mb-3">閫夋嫨鐐瑰嚮鍏紡鏃跺鍒剁殑鏍煎紡</p>
                            <div className="space-y-2">
                                {[
                                    { value: 'latex' as const, title: 'LaTeX', desc: '鑷姩鎸夎鍐?鍧楃骇琛?$ 绗﹀彿' },
                                    { value: 'unicodemath' as const, title: 'MathML (Word)', desc: '閫傚悎 Word 绮樿创锛屼繚鐣欏叕寮忕粨鏋? },
                                    { value: 'no-dollar' as const, title: '绾枃鏈?LaTeX', desc: '浠呭鍒跺叕寮忔枃鏈紝涓嶅姞瀹氱晫绗? },
                                ].map((option) => {
                                    const active = formulaCopyFormat === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            disabled={!formulaCopyEnabled}
                                            onClick={() => updateFormulaCopyFormat(option.value)}
                                            className={`w-full text-left p-2.5 rounded-lg border transition-all ${active
                                                ? 'border-blue-400/60 bg-blue-500/15'
                                                : 'border-white/10 bg-white/5 hover:bg-white/10'} ${!formulaCopyEnabled ? 'cursor-not-allowed' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-white/90 font-medium">{option.title}</p>
                                                {active ? <span className="text-blue-300 text-xs font-bold">宸查€変腑</span> : null}
                                            </div>
                                            <p className="text-xs text-white/50 mt-1">{option.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <SettingRow
                            icon={Zap}
                            title="姘村嵃绉婚櫎 (NanoBanana)"
                            description="鏃犳崯绉婚櫎鑳屾櫙闅愬舰姘村嵃"
                            checked={watermarkRemoverEnabled}
                            onChange={(v) => updateSetting('geminiWatermarkRemoverEnabled', v, setWatermarkRemoverEnabled)}
                        />
                        <SettingRow
                            icon={Zap}
                            title="寮曠敤鍥炲"
                            description="閫変腑鏂囧瓧鑷姩鍔犲紩鐢ㄦ牸寮忓洖澶?
                            checked={quoteReplyEnabled}
                            onChange={(v) => updateSetting('gvQuoteReplyEnabled', v, setQuoteReplyEnabled)}
                        />
                        <SettingRow
                            icon={Zap}
                            title="楂樼骇鏂囦欢澶瑰姛鑳?
                            description="鏍戝舰鐩綍绠＄悊瀵硅瘽"
                            checked={false}
                            onChange={() => { }}
                            disabled={true}
                        />
                    </div>

                    {/* Section 4: 鏃堕棿绾?(Timeline) */}
                    <SectionHeader icon={Clock} title="鏃堕棿绾?(Timeline)" />
                    <div className="space-y-2">
                        <SettingRow
                            icon={Clock}
                            title="渚ц竟鏃堕棿绾?
                            description="瀵硅瘽娴佸揩閫熷鑸?
                            checked={timelineEnabled}
                            onChange={(v) => updateSetting(StorageKeys.TIMELINE_ENABLED, v, setTimelineEnabled)}
                        />
                        <SettingRow
                            icon={Layout}
                            title="骞虫粦婊氬姩妯″紡"
                            description="鍏抽棴浠ヤ娇鐢ㄧ灛闂磋烦杞?
                            checked={timelineScrollMode === 'flow'}
                            onChange={(v) => {
                                const val = v ? 'flow' : 'jump';
                                setTimelineScrollMode(val);
                                chrome.storage.local.set({ 'geminiTimelineScrollMode': val });
                            }}
                        />
                        <SettingRow
                            icon={Layout}
                            title="闅愯棌鍘熺敓瀹瑰櫒"
                            description="闃查棯璺虫満鍒?(閫傚悎闀垮璇?"
                            checked={timelineHideContainer}
                            onChange={(v) => updateSetting('geminiTimelineHideContainer', v, setTimelineHideContainer)}
                        />
                        <Slider
                            icon={Layout}
                            title="鏃堕棿绾跨矖缁嗚皟鑺?
                            description="鎷栧姩婊戝潡鏃犵骇璋冭妭鐐瑰嚮鐑尯灏哄"
                            value={timelineWidth}
                            min={8}
                            max={32}
                            step={2}
                            onChange={(v: number) => {
                                setTimelineWidth(v);
                                chrome.storage.local.set({ [StorageKeys.TIMELINE_WIDTH]: v });
                            }}
                        />
                    </div>

                    {/* Section 5: 鍏朵粬 (Others) */}
                    <SectionHeader icon={MoreHorizontal} title="鍏跺畠" />
                    <div className="space-y-2">
                        <SettingRow
                            icon={Settings}
                            title="璋冭瘯妯″紡"
                            description="璁板綍鐐瑰嚮浜嬩欢涓庢墽琛屾棩蹇?
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
                            className={`w-full text-left p-3 rounded-xl border transition-all ${debugMode
                                ? 'border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200'
                                : 'border-white/10 bg-white/5 text-white/40 cursor-not-allowed'}`}
                        >
                            娓呯┖鏈湴璋冭瘯鏃ュ織
                        </button>
                        <SettingRow
                            icon={MoreHorizontal}
                            title="Word 涓€閿鍑?
                            description="瀹岀編鍚叕寮忔帓鐗?(寮€鍙戜腑...)"
                            checked={false}
                            onChange={() => { }}
                            disabled={true}
                            badge="WIP"
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-white/30 font-medium tracking-wider font-mono">
                        GEMINIMATE_V1.0_STABLE | {BUILD_MARK}
                    </p>
                </div>
            </div>
        </div>
    );
}

