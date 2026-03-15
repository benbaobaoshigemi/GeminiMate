import { describe, expect, it } from 'vitest';

import { createNetworkQualityProbeRequestInit } from './monitor';

describe('network quality monitor', () => {
  it('uses a HEAD probe request to avoid GET redirect poisoning', () => {
    const controller = new AbortController();
    const requestInit = createNetworkQualityProbeRequestInit(controller.signal);

    expect(requestInit.method).toBe('HEAD');
    expect(requestInit.cache).toBe('no-store');
    expect(requestInit.credentials).toBe('omit');
    expect(requestInit.redirect).toBe('follow');
    expect(requestInit.signal).toBe(controller.signal);
  });
});
