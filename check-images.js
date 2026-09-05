/* Open check-images.html to run this checker. No server or dependencies required. */
const runButton = document.getElementById('run');
const downloadButton = document.getElementById('download');
const onlyProblems = document.getElementById('onlyProblems');
const status = document.getElementById('status');
const resultsBody = document.getElementById('results');
let results = [];

function testImage(src) {
    if (!src) return Promise.resolve('missing');
    return new Promise(resolve => {
        const img = new Image();
        const timer = setTimeout(() => finish('timeout'), 15000);
        function finish(result) {
            clearTimeout(timer);
            img.onload = img.onerror = null;
            if (result === 'timeout') img.src = '';
            resolve(result);
        }
        img.onload = () => finish(img.naturalWidth > 0 ? 'loaded' : 'failed');
        img.onerror = () => finish('failed');
        img.src = src;
    });
}

function renderResults() {
    resultsBody.replaceChildren();
    for (const result of results) {
        if (onlyProblems.checked && result.result === 'loaded') continue;
        const row = document.createElement('tr');
        const name = document.createElement('td');
        name.textContent = `${result.name} (${result.code})`;
        const state = document.createElement('td');
        state.className = result.result;
        state.textContent = result.result;
        const source = document.createElement('td');
        const link = document.createElement('a');
        link.textContent = result.img || '(no image src)';
        // Only make web image URLs clickable.
        if (/^https?:\/\//i.test(result.img)) {
            link.href = result.img;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
        source.append(link);
        row.append(name, state, source);
        resultsBody.append(row);
    }
}

onlyProblems.addEventListener('change', renderResults);
runButton.addEventListener('click', async () => {
    if (!Array.isArray(window.GAME_CARDS)) {
        status.textContent = 'Could not load game-cards.js. Keep it beside this page.';
        return;
    }
    runButton.disabled = true;
    downloadButton.disabled = true;
    results = [];
    renderResults();
    const games = window.GAME_CARDS;
    let next = 0;
    status.textContent = `Testing 0 / ${games.length}…`;
    async function worker() {
        while (next < games.length) {
            const game = games[next++];
            const result = await testImage(game.img);
            results.push({ name: game.name, code: game.code, img: game.img, result });
            const failed = results.filter(r => r.result === 'failed' || r.result === 'missing').length;
            const timedOut = results.filter(r => r.result === 'timeout').length;
            status.textContent = `Tested ${results.length} / ${games.length}: ${failed} failed or missing, ${timedOut} timed out.`;
            renderResults();
        }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    status.textContent = 'Finished. ' + status.textContent;
    runButton.disabled = false;
    downloadButton.disabled = false;
});

downloadButton.addEventListener('click', () => {
    const report = {
        checkedAt: new Date().toISOString(),
        tested: results.length,
        problems: results.filter(r => r.result !== 'loaded')
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'game-image-problems.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});
