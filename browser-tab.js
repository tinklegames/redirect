(() => {
  const status = document.getElementById('browserStatus');
  const open = document.getElementById('browserOpen');
  const frame = document.getElementById('browserFrame');
  let loaded = false;
  document.querySelector('[data-page="browser"]').addEventListener('click', () => {
    if (loaded) return;
    try {
      if (!window.TINKLE_BROWSER_URL) throw new Error('The browser server has not been connected yet.');
      const url = new URL(window.TINKLE_BROWSER_URL);
      if (url.origin === location.origin) throw new Error('Use a separate address for the browser server.');
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('The browser server needs an HTTPS address.');
      open.href = url.href;
      open.hidden = false;
      frame.src = url.href;
      frame.hidden = false;
      status.textContent = 'If the embedded browser does not load, use Open browser in new tab.';
      loaded = true;
    } catch (error) { status.textContent = error.message; }
  });
})();
