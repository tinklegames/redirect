(() => {
  const $ = id => document.getElementById(id);
  const frame = $('view');
  let setup;
  let timeout;
  let current = '';
  function destination(value) {
    value = value.trim();
    if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) throw new Error('Enter an HTTP or HTTPS website address.');
    const candidate = /^https?:\/\//i.test(value) ? value : !/\s/.test(value) && (value.includes('.') || value.startsWith('localhost')) ? `https://${value}` : `https://duckduckgo.com/?q=${encodeURIComponent(value)}`;
    return new URL(candidate).href;
  }
  function bounded(promise, label) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), 15000); })]).finally(() => clearTimeout(timer));
  }
  async function initialize() {
    if (!isSecureContext || !('serviceWorker' in navigator)) throw new Error('Open this browser over HTTPS (or localhost).');
    if (!window.BareMux || !window.__uv$config) throw new Error('Browser files did not load. Reload and try again.');
    await navigator.serviceWorker.register('/sw.js', { scope: '/service/' });
    const registration = await navigator.serviceWorker.getRegistration('/service/');
    if (!registration.active) await new Promise((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) return reject(new Error('Browser worker did not start.'));
      if (worker.state === 'activated') return resolve();
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
        if (worker.state === 'redundant') reject(new Error('Browser worker could not activate.'));
      });
    });
    const connection = new BareMux.BareMuxConnection('/baremux/worker.js');
    await connection.setTransport('/epoxy/index.mjs', [{ wisp: `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/wisp/` }]);
  }
  $('addressForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('go').disabled = true;
    try {
      const url = destination($('address').value);
      $('status').textContent = 'Connecting…';
      setup ||= bounded(initialize(), 'Browser setup timed out. Try opening the browser in a new tab.').catch(error => { setup = null; throw error; });
      await setup;
      current = url;
      frame.hidden = false;
      $('welcome').hidden = true;
      frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
      clearTimeout(timeout);
      timeout = setTimeout(() => { $('status').textContent = 'This page is taking too long. Try another website or reload.'; }, 25000);
    } catch (error) { $('status').textContent = error.message; }
    finally { $('go').disabled = false; }
  });
  frame.addEventListener('load', () => {
    if (!current) return;
    clearTimeout(timeout);
    try {
      const path = frame.contentWindow.location.pathname;
      if (path.startsWith(__uv$config.prefix)) {
        current = __uv$config.decodeUrl(path.slice(__uv$config.prefix.length));
        $('address').value = current;
      }
    } catch {}
    $('status').textContent = 'Navigation finished. If the page shows an error, try another website.';
  });
  for (const direction of ['back', 'forward']) $(direction).addEventListener('click', () => {
    try { frame.contentWindow.history[direction](); } catch { $('status').textContent = 'History is unavailable for this page.'; }
  });
  $('reload').addEventListener('click', () => {
    if (!current) return;
    try { frame.contentWindow.location.reload(); } catch { frame.src = __uv$config.prefix + __uv$config.encodeUrl(current); }
  });
})();
