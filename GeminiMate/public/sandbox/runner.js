(() => {
  const frame = document.getElementById('preview');

  if (!(frame instanceof HTMLIFrameElement)) {
    return;
  }

  const injectBase = (html) => {
    if (/<base\s/i.test(html)) return html;
    return html.replace(/<head([^>]*)>/i, `<head$1><base href="${location.href}">`);
  };

  const normalizeHtmlDocument = (html) => {
    const trimmed = String(html || '').trim();
    if (!trimmed) return '';
    if (/<\s*(?:!doctype|html|head|body)\b/i.test(trimmed)) {
      return injectBase(trimmed);
    }

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <base href="${location.href}">
  </head>
  <body>${trimmed}</body>
</html>`;
  };

  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'PREVIEW_HTML') return;
    const html = normalizeHtmlDocument(event.data.html || '');
    if (!html) return;
    document.title = typeof event.data.title === 'string' && event.data.title.trim()
      ? event.data.title.trim()
      : 'GeminiMate Preview Runner';
    frame.srcdoc = html;
  });

  try {
    window.opener?.postMessage({ type: 'RUNNER_READY' }, '*');
  } catch {
    // ignore
  }
})();
