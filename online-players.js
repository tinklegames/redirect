/* Shared presence helpers. Presence is for discovery; moderation still resolves
   the account through the protected Firestore username index. */
(() => {
  function names(records) {
    const players = new Map();
    for (const record of Object.values(records || {})) {
      const name = record && typeof record.username === 'string' ? record.username.trim() : '';
      if (/^[a-z0-9_]{3,20}$/i.test(name) && !players.has(name.toLowerCase())) players.set(name.toLowerCase(), name);
    }
    return [...players.values()].sort((a, b) => a.localeCompare(b));
  }
  function track({ db, ref, push, onValue, onDisconnect, set, getProfile, events }) {
    const entry = push(ref(db, 'connectedUsers'));
    let connected = false, ready = false, epoch = 0, last = null;
    let writes = Promise.resolve();
    function publish() {
      if (!connected || !ready) return;
      const username = getProfile()?.username || '';
      if (username === last) return;
      last = username;
      const version = epoch;
      writes = writes.then(async () => {
        if (version !== epoch || !connected) return;
        try { await set(entry, username ? { username } : true); }
        catch (error) { last = null; console.warn('Could not update online presence:', error); }
      });
    }
    onValue(ref(db, '.info/connected'), async snapshot => {
      const version = ++epoch;
      connected = snapshot.val() === true; ready = false; last = null;
      if (!connected) return;
      try {
        // Register cleanup before publishing, and re-register after reconnects.
        await onDisconnect(entry).remove();
        if (version !== epoch || !connected) return;
        ready = true; publish();
      } catch (error) { console.warn('Could not start online presence:', error); }
    });
    events.addEventListener('tinkle-player-change', publish);
  }
  window.TinkleOnlinePlayers = { names, track };
})();
