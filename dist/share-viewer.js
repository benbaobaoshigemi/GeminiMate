(() => {
  const statusEl = document.getElementById('status');
  const viewer = document.getElementById('viewer');
  let objectUrl = null;

  if (!(statusEl instanceof HTMLElement) || !(viewer instanceof HTMLIFrameElement)) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    statusEl.textContent = '缺少分享内容 ID';
    return;
  }

  const storageKey = `gm_share_payload_${id}`;
  const storage = chrome.storage.session ?? chrome.storage.local;
  storage.get([storageKey], (result) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = `读取分享数据失败: ${chrome.runtime.lastError.message}`;
      return;
    }

    const payload = result[storageKey];
    if (!payload || typeof payload !== 'object') {
      statusEl.textContent = '分享内容不存在或已过期';
      return;
    }

    const html = typeof payload.html === 'string' ? payload.html : '';
    const title = typeof payload.title === 'string' ? payload.title : 'GeminiMate Share Viewer';
    document.title = title;
    if (!html.trim()) {
      statusEl.textContent = '分享内容为空';
      storage.remove([storageKey]);
      return;
    }

    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      objectUrl = URL.createObjectURL(blob);
      viewer.src = objectUrl;
      statusEl.textContent = `已加载: ${title}`;
      window.setTimeout(() => {
        statusEl.style.display = 'none';
      }, 1200);
      storage.remove([storageKey]);
    } catch (error) {
      statusEl.textContent = `渲染失败: ${String(error)}`;
    }
  });

  window.addEventListener('beforeunload', () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  });
})();
