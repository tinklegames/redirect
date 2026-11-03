/* Seasonal decorations respect the site's Normal setting. */
(() => {
  function sync() {
    const normal = window.tinkleDiscoverySettings?.seasonalTheme === 'normal';
    document.documentElement.dataset.season = normal ? 'normal' : 'thanksgiving';
  }

  function mount() {
    if (document.getElementById('harvest-banner')) return;

    const banner = document.createElement('aside');
    banner.id = 'harvest-banner';
    banner.setAttribute('aria-label', 'Thanksgiving event');

    const title = document.createElement('strong');
    title.textContent = 'tinkle';
    banner.append(title);
    for (const [symbol, position] of [['', 'prepend'], ['', 'append']]) {
      const icon = document.createElement('span');
      icon.className = 'harvest-icon';
      icon.textContent = symbol;
      icon.setAttribute('aria-hidden', 'true');
      banner[position](icon);
    }

    const host = document.querySelector('#app,.rewards-shell,.leaderboard-shell,main') || document.body;
    host.prepend(banner);

    const scene = document.createElement('div');
    scene.className = 'harvest-scene';
    scene.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 14; index++) {
      const leaf = document.createElement('span');
      leaf.className = 'harvest-leaf';
      leaf.style.setProperty('--leaf-left', `${(index * 37) % 100}%`);
      leaf.style.setProperty('--leaf-size', `${12 + (index * 7) % 19}px`);
      leaf.style.setProperty('--leaf-duration', `${15 + (index * 3) % 13}s`);
      leaf.style.setProperty('--leaf-delay', `${-2 * index}s`);
      scene.append(leaf);
    }
    document.body.prepend(scene);
    sync();
  }

  window.addEventListener('discovery-settings', sync);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
