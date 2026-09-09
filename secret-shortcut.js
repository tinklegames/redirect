(() => {
  const held = new Set();
  let opening = false;
  const clear = () => held.clear();
  document.addEventListener('keydown', event => {
    if (event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
        event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
        (typeof isSettingKey !== 'undefined' && isSettingKey)) { clear(); return; }
    if (event.repeat || opening) return;
    held.add(event.code);
    if (['KeyB', 'KeyE', 'KeyT'].every(key => held.has(key))) {
      event.preventDefault();
      opening = true;
      clear();
      window.location.assign(new URL('lounge.html', document.baseURI).href);
    }
  });
  document.addEventListener('keyup', event => held.delete(event.code));
  document.addEventListener('focusin', clear);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
})();
