import { describe, expect, it } from 'vitest';

import { StorageKeys } from '@/core/types/common';

import {
  createDefaultLocalSettings,
  createDefaultSyncSettings,
  createSettingsExportPayload,
  normalizeImportedSettingsPayload,
} from './settingsConfig';

describe('settingsConfig', () => {
  it('exports a complete normalized settings payload', () => {
    const payload = createSettingsExportPayload(
      {
        [StorageKeys.LATEX_FIXER_ENABLED]: 'false',
        [StorageKeys.TIMELINE_SCROLL_MODE]: 'jump',
      },
      {
        [StorageKeys.GV_FOLDER_FILTER_USER_ONLY]: 1,
      },
    );

    expect(payload.local[StorageKeys.LATEX_FIXER_ENABLED]).toBe(false);
    expect(payload.local[StorageKeys.TIMELINE_SCROLL_MODE]).toBe('jump');
    expect(payload.local[StorageKeys.GEMINI_FONT_SIZE_SCALE]).toBe(100);
    expect(payload.sync[StorageKeys.GV_FOLDER_FILTER_USER_ONLY]).toBe(true);
    expect(payload.sync[StorageKeys.GV_ACCOUNT_ISOLATION_ENABLED]).toBe(false);
  });

  it('normalizes imported settings from a plain object payload', () => {
    const result = normalizeImportedSettingsPayload({
      [StorageKeys.TIMELINE_SCROLL_MODE]: 'jump',
      [StorageKeys.TIMELINE_WIDTH]: '31',
      [StorageKeys.DEBUG_MODE]: '1',
      [StorageKeys.GEMINI_CUSTOM_FONTS]: [
        { name: 'Font A', data: 'data:font/ttf;base64,AAA' },
        { name: ' ', data: 'ignored' },
      ],
      unknownKey: true,
    });

    expect(result.local).toEqual({
      [StorageKeys.TIMELINE_SCROLL_MODE]: 'jump',
      [StorageKeys.TIMELINE_WIDTH]: 32,
      [StorageKeys.DEBUG_MODE]: true,
      [StorageKeys.GEMINI_CUSTOM_FONTS]: [{ name: 'Font A', data: 'data:font/ttf;base64,AAA' }],
    });
    expect(result.sync).toEqual({});
    expect(result.ignoredKeys).toContain('local:unknownKey');
  });

  it('mirrors imported language between local and sync settings', () => {
    const result = normalizeImportedSettingsPayload({
      sync: {
        [StorageKeys.LANGUAGE]: 'zh',
      },
    });

    expect(result.local[StorageKeys.LANGUAGE]).toBe('zh');
    expect(result.sync[StorageKeys.LANGUAGE]).toBe('zh');
  });

  it('creates default settings objects for both areas', () => {
    const localDefaults = createDefaultLocalSettings();
    const syncDefaults = createDefaultSyncSettings();

    expect(localDefaults[StorageKeys.NETWORK_QUALITY_ENABLED]).toBe(true);
    expect(localDefaults[StorageKeys.TIMELINE_HIDE_CONTAINER]).toBe(false);
    expect(syncDefaults[StorageKeys.FOLDER_ENABLED]).toBe(true);
    expect(syncDefaults[StorageKeys.GV_FOLDER_TREE_INDENT]).toBe(-8);
  });
});
