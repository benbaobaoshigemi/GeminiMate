import { StorageKeys } from '@/core/types/common';
import {
  clampLayoutScale,
  DEFAULT_LAYOUT_SCALE,
  SIDEBAR_EXPANDED_BASELINE_PX,
} from '@/features/layout/layoutScale';
import {
  DEFAULT_NETWORK_QUALITY_THRESHOLDS,
  normalizeNetworkQualityThresholds,
} from '@/features/networkQuality/model';
import type { NetworkQualityThresholds } from '@/features/networkQuality/types';
import type { ThoughtTranslationMode } from '@/features/thoughtTranslation/settings';
import { isAppLanguage, type AppLanguage } from '@/utils/language';

type ConfigArea = 'local' | 'sync';

type SettingsExportPayload = {
  app: 'GeminiMate';
  kind: 'settings';
  schemaVersion: 1;
  exportedAt: string;
  local: Record<string, unknown>;
  sync: Record<string, unknown>;
};

type ImportResult = {
  local: Record<string, unknown>;
  sync: Record<string, unknown>;
  ignoredKeys: string[];
};

type SettingDescriptor<T = unknown> = {
  area: ConfigArea;
  key: string;
  defaultValue: T | (() => T);
  normalize: (value: unknown) => T | undefined;
};

const DEFAULT_SANS_PRESET = 'sans-apple';
const DEFAULT_SERIF_PRESET = 'serif-source';
const DEFAULT_ZOOM_LEVEL = 110;
const MIN_ZOOM_LEVEL = 90;
const MAX_ZOOM_LEVEL = 120;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 540;
const MIN_FONT_SIZE_SCALE = 80;
const MAX_FONT_SIZE_SCALE = 130;
const MIN_FONT_WEIGHT = 200;
const MAX_FONT_WEIGHT = 900;
const MIN_LETTER_SPACING = 0;
const MAX_LETTER_SPACING = 15;
const MIN_LINE_HEIGHT = 0;
const MAX_LINE_HEIGHT = 8;
const MIN_PARAGRAPH_BLOCK_GAP_EM = 0;
const MAX_PARAGRAPH_BLOCK_GAP_EM = 1.2;
const MIN_EXPORT_SCALE = 50;
const MAX_EXPORT_SCALE = 200;
const MIN_FOLDER_TREE_INDENT = -8;
const MAX_FOLDER_TREE_INDENT = 32;
const THOUGHT_TRANSLATION_MODES: ThoughtTranslationMode[] = ['compare', 'replace'];
const FORMULA_COPY_FORMATS = ['latex', 'unicodemath', 'no-dollar', 'png'] as const;
const TIMELINE_SCROLL_MODES = ['flow', 'jump'] as const;
const EMPHASIS_MODES = ['bold', 'underline'] as const;
const WORD_RESPONSE_EXPORT_MODES = ['default', 'academic'] as const;
const SANS_PRESETS = [
  'sans-apple',
  'sans-sys',
  'sans-harmony',
  'sans-modern',
  'sans-grotesk',
  'sans-humanist',
  'sans-tech',
] as const;
const SERIF_PRESETS = [
  'serif-source',
  'serif-traditional',
  'serif-fangsong',
  'serif-kaiti',
  'serif-newspaper',
  'serif-editorial',
  'serif-georgia',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resolveBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 0) return false;
    if (value === 1) return true;
    return undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
};

const resolveRoundedNumber = (
  value: unknown,
  min: number,
  max: number,
  step = 1,
): number | undefined => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const rounded = Math.round(numeric / step) * step;
  return Math.min(max, Math.max(min, rounded));
};

const resolveEnumValue = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): T | undefined => {
  if (typeof value !== 'string') return undefined;
  return allowedValues.includes(value as T) ? (value as T) : undefined;
};

const resolveNullableLanguage = (value: unknown): AppLanguage | null | undefined => {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' && isAppLanguage(value) ? value : undefined;
};

const resolveFontFamily = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveFontWeight = (value: unknown): number | undefined => {
  const numeric = resolveRoundedNumber(value, MIN_FONT_WEIGHT, MAX_FONT_WEIGHT, 50);
  return numeric === undefined ? undefined : numeric;
};

const resolveLayoutScale = (value: unknown): number | undefined => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return clampLayoutScale(numeric);
};

const resolveSidebarWidth = (value: unknown): number | undefined =>
  resolveRoundedNumber(value, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, 2);

const resolveCustomFonts = (
  value: unknown,
): Array<{ name: string; data: string }> | undefined => {
  if (!Array.isArray(value)) return undefined;

  const deduped = new Map<string, { name: string; data: string }>();
  value.forEach((entry) => {
    if (!isRecord(entry)) return;
    if (typeof entry.name !== 'string' || typeof entry.data !== 'string') return;
    const name = entry.name.trim();
    const data = entry.data.trim();
    if (!name || !data) return;
    deduped.set(name, { name, data });
  });

  return Array.from(deduped.values());
};

const resolveNetworkQualityThresholds = (
  value: unknown,
): NetworkQualityThresholds | undefined => {
  if (!isRecord(value)) return undefined;
  return normalizeNetworkQualityThresholds(value);
};

const resolveFolderTreeIndent = (value: unknown): number | undefined =>
  resolveRoundedNumber(value, MIN_FOLDER_TREE_INDENT, MAX_FOLDER_TREE_INDENT);

const settingsDescriptors: SettingDescriptor[] = [
  {
    area: 'local',
    key: StorageKeys.LATEX_FIXER_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.MARKDOWN_REPAIR_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.GRAPH_EXPORT_QUALITY,
    defaultValue: 3,
    normalize: (value) => resolveRoundedNumber(value, 1, 5),
  },
  {
    area: 'local',
    key: StorageKeys.THOUGHT_TRANSLATION_ENABLED,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.THOUGHT_TRANSLATION_MODE,
    defaultValue: 'compare',
    normalize: (value) => resolveEnumValue(value, THOUGHT_TRANSLATION_MODES),
  },
  {
    area: 'local',
    key: StorageKeys.YOUTUBE_RECOMMENDATION_BLOCKER_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.FORMULA_COPY_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.FORMULA_COPY_FORMAT,
    defaultValue: 'latex',
    normalize: (value) => resolveEnumValue(value, FORMULA_COPY_FORMATS),
  },
  {
    area: 'local',
    key: StorageKeys.NETWORK_QUALITY_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.NETWORK_QUALITY_THRESHOLDS,
    defaultValue: () => ({ ...DEFAULT_NETWORK_QUALITY_THRESHOLDS }),
    normalize: resolveNetworkQualityThresholds,
  },
  {
    area: 'local',
    key: StorageKeys.WATERMARK_REMOVER_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.QUOTE_REPLY_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.BOTTOM_CLEANUP_ENABLED,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.DEBUG_MODE,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.DEBUG_FILE_LOG_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.DEBUG_CACHE_CAPTURE_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.TIMELINE_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.TIMELINE_WIDTH,
    defaultValue: 24,
    normalize: (value) => resolveRoundedNumber(value, 8, 32, 2),
  },
  {
    area: 'local',
    key: StorageKeys.TIMELINE_AUTO_HIDE,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.TIMELINE_SEARCH_INCLUDE_REPLIES,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.TIMELINE_SCROLL_MODE,
    defaultValue: 'flow',
    normalize: (value) => resolveEnumValue(value, TIMELINE_SCROLL_MODES),
  },
  {
    area: 'local',
    key: StorageKeys.TIMELINE_HIDE_CONTAINER,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_CHAT_WIDTH,
    defaultValue: DEFAULT_LAYOUT_SCALE,
    normalize: resolveLayoutScale,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_EDIT_INPUT_WIDTH,
    defaultValue: DEFAULT_LAYOUT_SCALE,
    normalize: resolveLayoutScale,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_SIDEBAR_WIDTH,
    defaultValue: SIDEBAR_EXPANDED_BASELINE_PX,
    normalize: resolveSidebarWidth,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_ZOOM_LEVEL,
    defaultValue: DEFAULT_ZOOM_LEVEL,
    normalize: (value) => resolveRoundedNumber(value, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL),
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_FONT_SIZE_SCALE,
    defaultValue: 100,
    normalize: (value) => resolveRoundedNumber(value, MIN_FONT_SIZE_SCALE, MAX_FONT_SIZE_SCALE),
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_FONT_WEIGHT,
    defaultValue: 400,
    normalize: resolveFontWeight,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_FONT_FAMILY,
    defaultValue: 'default',
    normalize: resolveFontFamily,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_SANS_PRESET,
    defaultValue: DEFAULT_SANS_PRESET,
    normalize: (value) => resolveEnumValue(value, SANS_PRESETS),
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_SERIF_PRESET,
    defaultValue: DEFAULT_SERIF_PRESET,
    normalize: (value) => resolveEnumValue(value, SERIF_PRESETS),
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_CUSTOM_FONTS,
    defaultValue: () => [],
    normalize: resolveCustomFonts,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_LETTER_SPACING,
    defaultValue: 0,
    normalize: (value) => resolveRoundedNumber(value, MIN_LETTER_SPACING, MAX_LETTER_SPACING),
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_LINE_HEIGHT,
    defaultValue: 0,
    normalize: (value) => resolveRoundedNumber(value, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT),
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_PARAGRAPH_BLOCK_GAP_EM,
    defaultValue: 0,
    normalize: (value) =>
      resolveRoundedNumber(value, MIN_PARAGRAPH_BLOCK_GAP_EM, MAX_PARAGRAPH_BLOCK_GAP_EM, 0.01),
  },
  {
    area: 'local',
    key: StorageKeys.GEMINI_EMPHASIS_MODE,
    defaultValue: 'bold',
    normalize: (value) => resolveEnumValue(value, EMPHASIS_MODES),
  },
  {
    area: 'local',
    key: StorageKeys.WORD_RESPONSE_EXPORT_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.WORD_RESPONSE_EXPORT_MODE,
    defaultValue: 'default',
    normalize: (value) => resolveEnumValue(value, WORD_RESPONSE_EXPORT_MODES),
  },
  {
    area: 'local',
    key: StorageKeys.WORD_RESPONSE_EXPORT_PURE_BODY,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'local',
    key: StorageKeys.WORD_RESPONSE_EXPORT_FONT_SIZE_SCALE,
    defaultValue: 100,
    normalize: (value) => resolveRoundedNumber(value, MIN_EXPORT_SCALE, MAX_EXPORT_SCALE),
  },
  {
    area: 'local',
    key: StorageKeys.WORD_RESPONSE_EXPORT_LINE_HEIGHT_SCALE,
    defaultValue: 100,
    normalize: (value) => resolveRoundedNumber(value, MIN_EXPORT_SCALE, MAX_EXPORT_SCALE),
  },
  {
    area: 'local',
    key: StorageKeys.WORD_RESPONSE_EXPORT_LETTER_SPACING_SCALE,
    defaultValue: 100,
    normalize: (value) => resolveRoundedNumber(value, MIN_EXPORT_SCALE, MAX_EXPORT_SCALE),
  },
  {
    area: 'local',
    key: StorageKeys.LANGUAGE,
    defaultValue: null,
    normalize: resolveNullableLanguage,
  },
  {
    area: 'sync',
    key: StorageKeys.LANGUAGE,
    defaultValue: null,
    normalize: resolveNullableLanguage,
  },
  {
    area: 'sync',
    key: StorageKeys.FOLDER_ENABLED,
    defaultValue: true,
    normalize: resolveBoolean,
  },
  {
    area: 'sync',
    key: StorageKeys.FOLDER_HIDE_ARCHIVED_CONVERSATIONS,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'sync',
    key: StorageKeys.GV_FOLDER_FILTER_USER_ONLY,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'sync',
    key: StorageKeys.GV_FOLDER_TREE_INDENT,
    defaultValue: MIN_FOLDER_TREE_INDENT,
    normalize: resolveFolderTreeIndent,
  },
  {
    area: 'sync',
    key: StorageKeys.GV_ACCOUNT_ISOLATION_ENABLED,
    defaultValue: false,
    normalize: resolveBoolean,
  },
  {
    area: 'sync',
    key: StorageKeys.GV_ACCOUNT_ISOLATION_ENABLED_GEMINI,
    defaultValue: false,
    normalize: resolveBoolean,
  },
];

const localDescriptors = settingsDescriptors.filter((descriptor) => descriptor.area === 'local');
const syncDescriptors = settingsDescriptors.filter((descriptor) => descriptor.area === 'sync');
const localDescriptorMap = new Map(localDescriptors.map((descriptor) => [descriptor.key, descriptor]));
const syncDescriptorMap = new Map(syncDescriptors.map((descriptor) => [descriptor.key, descriptor]));

const resolveDefaultValue = (descriptor: SettingDescriptor): unknown =>
  typeof descriptor.defaultValue === 'function'
    ? (descriptor.defaultValue as () => unknown)()
    : descriptor.defaultValue;

const sanitizeAreaRecord = (
  areaName: ConfigArea,
  raw: Record<string, unknown>,
  fillDefaults: boolean,
  ignoredKeys: string[],
): Record<string, unknown> => {
  const descriptors = areaName === 'local' ? localDescriptors : syncDescriptors;
  const descriptorMap = areaName === 'local' ? localDescriptorMap : syncDescriptorMap;
  const output: Record<string, unknown> = {};

  if (fillDefaults) {
    descriptors.forEach((descriptor) => {
      const hasValue = Object.prototype.hasOwnProperty.call(raw, descriptor.key);
      const normalized = hasValue ? descriptor.normalize(raw[descriptor.key]) : undefined;
      output[descriptor.key] =
        normalized === undefined ? resolveDefaultValue(descriptor) : normalized;
    });
    return output;
  }

  Object.entries(raw).forEach(([key, value]) => {
    const descriptor = descriptorMap.get(key);
    if (!descriptor) {
      ignoredKeys.push(`${areaName}:${key}`);
      return;
    }
    const normalized = descriptor.normalize(value);
    if (normalized === undefined) {
      ignoredKeys.push(`${areaName}:${key}`);
      return;
    }
    output[key] = normalized;
  });

  return output;
};

const resolveRawSettingsSections = (
  payload: unknown,
): { local: Record<string, unknown>; sync: Record<string, unknown> } => {
  if (!isRecord(payload)) {
    return { local: {}, sync: {} };
  }

  const hasAreaSections = isRecord(payload.local) || isRecord(payload.sync);
  if (hasAreaSections) {
    return {
      local: isRecord(payload.local) ? payload.local : {},
      sync: isRecord(payload.sync) ? payload.sync : {},
    };
  }

  return {
    local: payload,
    sync: {},
  };
};

const mirrorLanguageAcrossAreas = (
  local: Record<string, unknown>,
  sync: Record<string, unknown>,
): void => {
  const localLanguage = resolveNullableLanguage(local[StorageKeys.LANGUAGE]);
  const syncLanguage = resolveNullableLanguage(sync[StorageKeys.LANGUAGE]);
  const languageToUse =
    localLanguage !== undefined && localLanguage !== null
      ? localLanguage
      : syncLanguage !== undefined && syncLanguage !== null
        ? syncLanguage
        : null;

  if (languageToUse === null) {
    if (StorageKeys.LANGUAGE in local) {
      local[StorageKeys.LANGUAGE] = null;
    }
    if (StorageKeys.LANGUAGE in sync) {
      sync[StorageKeys.LANGUAGE] = null;
    }
    return;
  }

  local[StorageKeys.LANGUAGE] = languageToUse;
  sync[StorageKeys.LANGUAGE] = languageToUse;
};

export const SETTINGS_CONFIG_SCHEMA_VERSION = 1 as const;
export const EXPORTABLE_LOCAL_SETTINGS_KEYS = localDescriptors.map((descriptor) => descriptor.key);
export const EXPORTABLE_SYNC_SETTINGS_KEYS = syncDescriptors.map((descriptor) => descriptor.key);
export const POPUP_LOCAL_SETTINGS_KEYS = Array.from(
  new Set([
    ...EXPORTABLE_LOCAL_SETTINGS_KEYS,
    StorageKeys.TIMELINE_SCROLL_MODE,
    StorageKeys.TIMELINE_HIDE_CONTAINER,
  ]),
);

export const createDefaultLocalSettings = (): Record<string, unknown> =>
  sanitizeAreaRecord('local', {}, true, []);

export const createDefaultSyncSettings = (): Record<string, unknown> =>
  sanitizeAreaRecord('sync', {}, true, []);

export const createSettingsExportPayload = (
  localRaw: Record<string, unknown>,
  syncRaw: Record<string, unknown>,
): SettingsExportPayload => {
  const local = sanitizeAreaRecord('local', localRaw, true, []);
  const sync = sanitizeAreaRecord('sync', syncRaw, true, []);
  mirrorLanguageAcrossAreas(local, sync);

  return {
    app: 'GeminiMate',
    kind: 'settings',
    schemaVersion: SETTINGS_CONFIG_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    local,
    sync,
  };
};

export const normalizeImportedSettingsPayload = (payload: unknown): ImportResult => {
  const ignoredKeys: string[] = [];
  const rawSections = resolveRawSettingsSections(payload);
  const local = sanitizeAreaRecord('local', rawSections.local, false, ignoredKeys);
  const sync = sanitizeAreaRecord('sync', rawSections.sync, false, ignoredKeys);

  if (StorageKeys.LANGUAGE in local || StorageKeys.LANGUAGE in sync) {
    mirrorLanguageAcrossAreas(local, sync);
  }

  return {
    local,
    sync,
    ignoredKeys,
  };
};

export const createSettingsExportFileName = (date = new Date()): string => {
  const timestamp = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-');
  return `geminimate-settings-${timestamp}.json`;
};
