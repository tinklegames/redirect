(() => {
  function sync() {
    try {
      const theme=localStorage.getItem('tinkleTheme');
      if(['midnight','neon','aurora'].includes(theme))document.documentElement.dataset.theme=theme;
      else delete document.documentElement.dataset.theme;
    } catch {}
  }
  sync();window.addEventListener('storage',event=>{if(event.key==='tinkleTheme')sync();});
})();
