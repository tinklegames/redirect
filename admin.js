'use strict';
const $ = id => document.getElementById(id);
const firebaseConfig = {
    apiKey: 'AIzaSyC-IDS2wfF3ZgVzjwf0cHUazNGolLFhXVQ',
    authDomain: 'mostpopular-39c60.firebaseapp.com',
    databaseURL: 'https://mostpopular-39c60-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'mostpopular-39c60', storageBucket: 'mostpopular-39c60.appspot.com',
    messagingSenderId: '939775132675', appId: '1:939775132675:web:7d40bd8fff497c53553a36'
};
const app = firebase.initializeApp(firebaseConfig);
const db = app.database();
const auth = app.auth();
let cards = JSON.parse(JSON.stringify(window.GAME_CARDS || []));
let editingIndex = null;
let fileHandle = null;
let loadedFileText = null;
let formDirty = false;
let stopUsers = null;
let searchController;
let imageTimer;
let toastTimer;
let resolveWeeklyClock;
const weeklyClockReady = new Promise(resolve => { resolveWeeklyClock = resolve; });
db.ref('.info/serverTimeOffset').on('value', snap => {
    WeeklyPopularity.setServerOffset(snap.val());
    $('weekly-period').textContent = 'Current week: ' + WeeklyPopularity.weekKey();
    resolveWeeklyClock();
});
function notify(message, error = false) {
    clearTimeout(toastTimer);
    const box = $('status-message');
    box.textContent = message; box.classList.toggle('error', error); box.hidden = false;
    toastTimer = setTimeout(() => { box.hidden = true; }, error ? 12000 : 6000);
}
async function action(button, work, success) {
    button.disabled = true;
    try { await work(); if (success) notify(success); }
    catch (error) { if (error.name !== 'AbortError') notify(error.message || 'Something went wrong. Please try again.', true); }
    finally { button.disabled = false; }
}
function requireAdmin() {
    if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error('Sign in with your admin account first.');
}
function switchTab(name) {
    document.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === name;
        button.classList.toggle('active', active);
        if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => { panel.hidden = panel.id !== 'panel-' + name; });
    $('section-label').textContent = 'Workspace / ' + ({ games: 'Games', settings: 'Site settings', live: 'Live controls' }[name]);
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
$('login-form').addEventListener('submit', async event => {
    event.preventDefault(); $('login-btn').disabled = true; $('login-status').textContent = 'Signing in…';
    try { await auth.signInWithEmailAndPassword($('admin-email').value.trim(), $('admin-pass').value); $('admin-pass').value = ''; $('login-status').textContent = ''; }
    catch (error) { $('login-status').textContent = error.message; }
    finally { $('login-btn').disabled = false; }
});
$('logout').addEventListener('click', () => action($('logout'), async () => {
    if (formDirty && !confirm('Discard unsaved card edits and sign out?')) return;
    await auth.signOut(); clearForm();
}));
auth.onAuthStateChanged(user => {
    const signedIn = user && !user.isAnonymous;
    $('login-box').hidden = !!signedIn; $('admin-content').hidden = !signedIn;
    if (stopUsers) { stopUsers(); stopUsers = null; }
    if (!signedIn) return;
    $('account-email').textContent = user.email;
    db.ref('siteSettings').once('value').then(snap => {
        const settings = snap.val() || {};
        $('bgColor').value = /^#[0-9a-f]{6}$/i.test(settings.backgroundColor) ? settings.backgroundColor : '#0a0a0a';
        $('announcement').value = settings.announcement || '';
        $('jumpscareImage').value = settings.jumpscareImage || '';
    }).catch(error => notify('Could not load settings: ' + error.message, true));
    const users = db.ref('connectedUsers');
    const callback = snap => { $('user-count').textContent = snap.numChildren() + ' online'; };
    users.on('value', callback, () => { $('user-count').textContent = 'Count unavailable'; });
    stopUsers = () => users.off('value', callback);
});

// FILE-BASED CARD EDITOR — cards never go to Firebase.
function selectedCategories() { return [...document.querySelectorAll('#categories input:checked')].map(input => input.value); }
function buildCategories(selected = []) {
    const categories = [...new Set(['action','adventure','arcade','horror','multiplayer','puzzle','simulator', ...cards.flatMap(g => g.categories), ...selected])].sort();
    $('categories').replaceChildren();
    categories.forEach(category => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox'; input.value = category; input.checked = selected.includes(category);
        label.append(input, document.createTextNode(category)); $('categories').append(label);
    });
}
function updatePreview() {
    $('preview-name').textContent = $('game-name').value || 'Your next game';
    $('preview-code').textContent = $('game-code').value || 'CODE';
    $('preview-categories').textContent = selectedCategories().join(' · ') || 'Select categories';
    const query = $('image-query').value.trim() || $('game-name').value.trim();
    $('duckduckgo-link').href = 'https://duckduckgo.com/?q=' + encodeURIComponent(query + ' game') + '&iax=images&ia=images';
    clearTimeout(imageTimer);
    imageTimer = setTimeout(() => {
        const src = $('game-image').value.trim();
        const image = $('preview-image');
        if (image.getAttribute('src') === src) return;
        image.hidden = true; $('preview-placeholder').hidden = false;
        if (!CardEditor.validImage(src)) { image.removeAttribute('src'); $('image-status').textContent = 'Choose a cover or enter an image URL.'; return; }
        $('image-status').textContent = 'Loading cover…';
        image.onload = () => { image.hidden = false; $('preview-placeholder').hidden = true; $('image-status').textContent = 'Cover loaded.'; };
        image.onerror = () => { image.hidden = true; $('preview-placeholder').hidden = false; $('image-status').textContent = 'This image could not load. Try another cover.'; };
        image.src = src;
    }, 250);
}
function clearForm() {
    editingIndex = null; $('game-form').reset(); buildCategories(); formDirty = false;
    $('editor-title').textContent = 'New game'; $('save-game').textContent = 'Save card →';
    $('image-query').value = ''; updatePreview();
}
$('new-game').addEventListener('click', () => { if (!formDirty || confirm('Discard unsaved edits?')) clearForm(); });
$('game-form').addEventListener('input', () => { formDirty = true; updatePreview(); });
$('game-code').addEventListener('input', () => { $('game-code').value = $('game-code').value.toUpperCase(); });
function renderCatalog() {
    $('catalog-count').textContent = cards.length + ' games';
    $('catalog-list').replaceChildren();
    const query = $('catalog-search').value.toLowerCase().trim();
    let count = 0;
    cards.forEach((card, index) => {
        if (!`${card.name} ${card.code}`.toLowerCase().includes(query)) return;
        count++;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'catalog-item';
        const img = document.createElement('img'); img.src = card.img; img.alt = ''; img.loading = 'lazy'; img.onerror = () => { img.style.visibility = 'hidden'; };
        const info = document.createElement('span'); const name = document.createElement('strong'); name.textContent = card.name;
        const meta = document.createElement('small'); meta.textContent = card.categories.join(' · '); info.append(name, meta);
        const code = document.createElement('span'); code.className = 'tag'; code.textContent = card.code;
        button.append(img, info, code);
        button.addEventListener('click', () => {
            if (formDirty && !confirm('Discard unsaved edits and open this card?')) return;
            editingIndex = index; $('game-name').value = card.name; $('game-code').value = card.code; $('game-image').value = card.img;
            $('image-query').value = card.name; buildCategories(card.categories); formDirty = false;
            $('editor-title').textContent = 'Edit game'; $('save-game').textContent = 'Save changes →'; updatePreview();
            $('game-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('game-name').focus({ preventScroll: true });
        });
        $('catalog-list').append(button);
    });
    if (!count) $('catalog-list').textContent = 'No games match your search.';
}
$('catalog-search').addEventListener('input', renderCatalog);
function download(cardsToSave) {
    const url = URL.createObjectURL(new Blob([CardEditor.serialize(cardsToSave)], { type: 'text/javascript' }));
    const link = document.createElement('a'); link.href = url; link.download = 'game-cards.js'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('download-cards').addEventListener('click', () => {
    download(cards);
    notify(formDirty ? 'Downloaded the saved list. Use Save card to include your current form edits.' : 'Downloaded game-cards.js. Upload it to your website.');
});
async function loadFile(file, handle = null) {
    const text = await file.text();
    const imported = CardEditor.parse(text); // Fully validate before replacing the current list.
    cards = imported; fileHandle = handle; loadedFileText = text; clearForm(); renderCatalog();
    $('file-name').textContent = file.name;
    $('file-status').textContent = handle ? 'Local file connected. Save card writes back to this file.' : 'Local file loaded. Saving will download an updated game-cards.js.';
    notify('Opened ' + cards.length + ' game cards.');
}
$('open-cards').addEventListener('click', () => action($('open-cards'), async () => {
    if (formDirty && !confirm('Discard unsaved edits and open another file?')) return;
    if (!window.showOpenFilePicker) { $('file-upload').click(); return; }
    const [handle] = await window.showOpenFilePicker({ multiple: false, types: [{ description: 'Game cards', accept: { 'text/javascript': ['.js'] } }] });
    await loadFile(await handle.getFile(), handle);
}));
$('file-upload').addEventListener('change', () => {
    const file = $('file-upload').files[0];
    if (file) action($('open-cards'), () => loadFile(file));
    $('file-upload').value = '';
});
$('game-form').addEventListener('submit', event => {
    event.preventDefault();
    action($('save-game'), async () => {
        const card = { name: $('game-name').value.trim(), code: $('game-code').value.trim(), categories: selectedCategories(), img: $('game-image').value.trim() };
        const next = CardEditor.upsert(cards, card, editingIndex);
        const source = CardEditor.serialize(next);
        let handle = fileHandle;
        let pickedNew = false;
        // Must ask for a file from this user gesture, before unrelated async work.
        if (!handle && window.showSaveFilePicker) {
            handle = await window.showSaveFilePicker({ suggestedName: 'game-cards.js', types: [{ description: 'Game cards JavaScript', accept: { 'text/javascript': ['.js'] } }] });
            pickedNew = true;
        }
        if (handle) {
            if (!pickedNew && loadedFileText !== null && await (await handle.getFile()).text() !== loadedFileText) {
                throw new Error('This file changed outside the editor. Open it again before saving so those changes are preserved.');
            }
            const writable = await handle.createWritable();
            try { await writable.write(source); await writable.close(); }
            catch (error) { await writable.abort().catch(() => {}); throw error; }
            fileHandle = handle; loadedFileText = source; $('file-name').textContent = handle.name;
            $('file-status').textContent = 'Saved locally. Upload game-cards.js to update your website.';
        } else {
            download(next); $('file-status').textContent = 'Updated file downloaded. Replace game-cards.js on your website.';
        }
        const isNew = editingIndex === null;
        cards = next; editingIndex = isNew ? next.length - 1 : editingIndex; formDirty = false;
        $('editor-title').textContent = 'Edit game'; $('save-game').textContent = 'Save changes →'; renderCatalog();
        notify(handle ? 'Card saved to ' + handle.name + '.' : 'Updated game-cards.js downloaded.');
    });
});
window.addEventListener('beforeunload', event => { if (formDirty) { event.preventDefault(); event.returnValue = ''; } });

// IMAGE SEARCH — browser-supported public Wikimedia endpoints, with no API key.
$('image-query').addEventListener('input', updatePreview);
$('image-search-form').addEventListener('submit', async event => {
    event.preventDefault();
    const query = $('image-query').value.trim();
    if (!query) return;
    if (searchController) searchController.abort();
    const controller = new AbortController(); searchController = controller;
    $('search-images').disabled = true; $('image-results').replaceChildren(); $('image-search-status').textContent = 'Searching images…';
    updatePreview();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
        const provider = $('image-source').value;
        let images;
        if (provider === 'catalog') {
            images = cards.filter(g => `${g.name} ${g.code}`.toLowerCase().includes(query.toLowerCase())).slice(0, 24).map(g => ({ title: g.name, url: g.img, thumb: g.img }));
        } else {
            const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: query, gsrlimit: '16' });
            if (provider === 'commons') {
                params.set('gsrnamespace', '6'); params.set('prop', 'imageinfo'); params.set('iiprop', 'url|mime'); params.set('iiurlwidth', '400');
            } else {
                params.set('prop', 'pageimages|info'); params.set('piprop', 'thumbnail|original'); params.set('pithumbsize', '400'); params.set('pilicense', 'any'); params.set('inprop', 'url');
            }
            const host = provider === 'commons' ? 'commons.wikimedia.org' : 'en.wikipedia.org';
            const response = await fetch('https://' + host + '/w/api.php?' + params, { signal: controller.signal });
            if (!response.ok) throw new Error('Image search is unavailable. Try another source or use the DuckDuckGo link.');
            const data = await response.json();
            if (data.error) throw new Error(data.error.info || 'Image search failed.');
            images = Object.values(data.query?.pages || {}).sort((a,b) => (a.index || 0) - (b.index || 0)).map(page => {
                if (provider === 'commons') {
                    const info = page.imageinfo?.[0];
                    return info?.mime?.startsWith('image/') ? { title: page.title.replace(/^File:/, ''), url: info.thumburl || info.url, thumb: info.thumburl || info.url, source: info.descriptionurl } : null;
                }
                return page.thumbnail ? { title: page.title, url: page.original?.source || page.thumbnail.source, thumb: page.thumbnail.source, source: page.fullurl } : null;
            }).filter(Boolean);
        }
        if (searchController !== controller) return;
        images = images.filter(image => CardEditor.validImage(image.url));
        images.forEach(item => {
            const tile = document.createElement('div'); tile.className = 'image-choice';
            const button = document.createElement('button'); button.type = 'button'; button.title = 'Use ' + item.title;
            const img = document.createElement('img'); img.src = item.thumb; img.alt = item.title; img.loading = 'lazy';
            img.onerror = () => { button.disabled = true; label.textContent = 'Image unavailable'; };
            const label = document.createElement('span'); label.textContent = item.title; button.append(img, label);
            button.addEventListener('click', () => {
                $('game-image').value = item.url; formDirty = true; updatePreview();
                document.querySelectorAll('.image-choice button').forEach(b => b.classList.remove('selected'));
                button.classList.add('selected'); notify('Cover selected. Save the card when ready.');
            });
            tile.append(button);
            if (CardEditor.validImage(item.source)) { const link = document.createElement('a'); link.href = item.source; link.textContent = 'Source & usage details ↗'; link.target = '_blank'; link.rel = 'noopener'; tile.append(link); }
            $('image-results').append(tile);
        });
        $('image-search-status').textContent = images.length ? images.length + ' images. Select a cover; check its source for usage details.' : 'No images found. Try a different name, another source, or DuckDuckGo.';
    } catch (error) {
        if (searchController === controller) $('image-search-status').textContent = error.name === 'AbortError' ? 'Search timed out. Try another source or use DuckDuckGo.' : error.message;
    } finally { clearTimeout(timer); if (searchController === controller) $('search-images').disabled = false; }
});

// EXISTING FIREBASE SITE CONTROLS
$('settings-form').addEventListener('submit', event => {
    event.preventDefault(); action($('save'), async () => {
        requireAdmin();
        await db.ref('siteSettings').update({ backgroundColor: $('bgColor').value, announcement: $('announcement').value, jumpscareImage: $('jumpscareImage').value });
    }, 'Settings saved.');
});
$('revert-bg').onclick = () => { $('bgColor').value = '#0a0a0a'; };
$('revert-ann').onclick = () => { $('announcement').value = ''; };
$('revert-jumpimg').onclick = () => { $('jumpscareImage').value = ''; };
$('trigger-announcement').onclick = () => action($('trigger-announcement'), async () => {
    requireAdmin(); const text = $('announcement').value.trim(); if (!text) throw new Error('Enter an announcement in Site settings first.');
    await db.ref('announcementTriggerNow').set({ text, timestamp: Date.now() });
}, 'Announcement sent.');
$('trigger-jumpscare').onclick = () => action($('trigger-jumpscare'), async () => {
    requireAdmin(); const image = $('jumpscareImage').value.trim(); if (!CardEditor.validImage(image)) throw new Error('Enter a valid jumpscare URL in Site settings first.');
    await db.ref('jumpscareTriggerNow').set({ image, timestamp: Date.now() });
}, 'Jumpscare sent.');
for (const [id, name] of Object.entries({ 'cursor-chaos': 'cursorChaos', flashbang: 'flashbang', 'reverse-controls': 'reverseControls' })) {
    $(id).onclick = () => action($(id), async () => { requireAdmin(); await db.ref('trollTriggers/' + name).set({ active: true, timestamp: Date.now() }); }, 'Effect sent.');
}
const sounds = ['clashintro.mp3','rainingtacos.mp3','brainrot.mp3','wideputin.mp3','crabrave.mp3','sodapop.mp3','galaxy.mp3','67.mp3','smokedetector.mp3'];
sounds.forEach(file => { const option = document.createElement('option'); option.value = file; option.textContent = file.replace('.mp3', ''); $('sound-select').append(option); });
$('play-sound').onclick = () => action($('play-sound'), async () => { requireAdmin(); await db.ref('trollTriggers/creepySound').set({ url: $('sound-select').value, timestamp: Date.now() }); }, 'Sound sent.');
$('stop-sound').onclick = () => action($('stop-sound'), async () => { requireAdmin(); await db.ref('trollTriggers/creepySound').set(null); }, 'Audio stopped.');
$('reset-clickData').onclick = () => action($('reset-clickData'), async () => {
    requireAdmin(); if (!confirm('Reset this week’s popularity counts? All-time counts will stay.')) return;
    await weeklyClockReady; const week = WeeklyPopularity.weekKey();
    await db.ref('weeklyClickData').transaction(current => WeeklyPopularity.migrateLegacy(current, week));
    await db.ref('weeklyClickData/' + week).remove(); notify('Weekly popularity reset.');
});
buildCategories(); renderCatalog(); updatePreview(); switchTab('games');
