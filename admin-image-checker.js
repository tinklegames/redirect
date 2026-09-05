// Tests browser image loads against the card editor's current saved list.
(function (root) {
    function probe(src, signal, timeout = 15000) {
        if (signal?.aborted) return Promise.resolve('canceled');
        if (!src) return Promise.resolve('missing');
        return new Promise(resolve => {
            const img = new Image();
            let done = false;
            const cancel = () => finish('canceled');
            const timer = setTimeout(() => finish('timeout'), timeout);
            function finish(result) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                signal?.removeEventListener('abort', cancel);
                img.onload = img.onerror = null;
                if (result === 'timeout' || result === 'canceled') img.src = '';
                resolve(result);
            }
            signal?.addEventListener('abort', cancel, { once: true });
            img.onload = () => finish(img.naturalWidth > 0 ? 'loaded' : 'failed');
            img.onerror = () => finish('failed');
            img.src = src;
        });
    }
    function mount({ getCards, editCard }) {
        const $ = id => document.getElementById(id);
        let results = [];
        let controller = null;
        let generation = 0;
        let total = 0;
        let state = 'Ready';
        let checkedAt = null;
        const rows = $('image-check-results');
        const matches = result => {
            const card = getCards()[result.index];
            return card && card.name === result.name && card.code === result.code && card.img === result.img;
        };
        function render() {
            rows.replaceChildren();
            let failed = 0, timedOut = 0, loaded = 0, changed = 0;
            for (const result of [...results].sort((a,b) => a.index - b.index)) {
                const current = matches(result);
                const status = current ? result.result : 'changed';
                if (status === 'loaded') loaded++;
                if (status === 'failed' || status === 'missing') failed++;
                if (status === 'timeout') timedOut++;
                if (status === 'changed') changed++;
                if ($('image-check-problems').checked && status === 'loaded') continue;
                const row = document.createElement('tr');
                const name = document.createElement('td'); name.textContent = result.name + ' (' + result.code + ')';
                const outcome = document.createElement('td'); outcome.className = 'check-' + status;
                outcome.textContent = status === 'changed' ? 'Changed · retest' : status;
                const source = document.createElement('td');
                const link = document.createElement('a'); link.textContent = result.img || '(missing URL)';
                if (/^https?:\/\//i.test(result.img)) { link.href = result.img; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
                source.append(link);
                const actions = document.createElement('td');
                const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit card';
                edit.addEventListener('click', () => editCard(result.index));
                const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Retest'; retry.disabled = !!controller;
                retry.addEventListener('click', () => run([result.index], false));
                actions.append(edit, retry); row.append(name, outcome, source, actions); rows.append(row);
            }
            $('image-check-status').textContent = `${state}. ${results.length} / ${total} checked · ${loaded} loaded · ${failed} failed or missing · ${timedOut} timed out${changed ? ' · ' + changed + ' changed' : ''}.`;
            $('image-check-run').disabled = !!controller;
            $('image-check-stop').disabled = !controller;
            $('image-check-download').disabled = !!controller || !results.length;
            $('image-check-empty').hidden = rows.children.length > 0;
            $('image-check-empty').textContent = results.length ? 'No problems in the images checked so far.' : 'Run a check to see image results here.';
        }
        async function run(indices, clear) {
            if (controller) return;
            const token = ++generation;
            const batch = indices.map(index => ({ ...getCards()[index], index })).filter(card => card.name);
            if (clear) { results = []; total = batch.length; }
            const active = new AbortController(); controller = active; state = 'Testing'; checkedAt = new Date().toISOString();
            let next = 0;
            render();
            async function worker() {
                while (!active.signal.aborted && next < batch.length) {
                    const card = batch[next++];
                    const outcome = await probe(card.img, active.signal);
                    if (token !== generation || outcome === 'canceled') return;
                    const result = { index: card.index, name: card.name, code: card.code, img: card.img, result: outcome };
                    const existing = results.findIndex(r => r.index === card.index);
                    if (existing < 0) results.push(result); else results[existing] = result;
                    render();
                }
            }
            try { await Promise.all(Array.from({ length: Math.min(6, batch.length) }, worker)); }
            finally {
                if (token === generation) { controller = null; state = active.signal.aborted ? 'Stopped' : 'Finished'; render(); }
            }
        }
        $('image-check-run').addEventListener('click', () => run(getCards().map((_, index) => index), true));
        $('image-check-stop').addEventListener('click', () => controller?.abort());
        $('image-check-problems').addEventListener('change', render);
        $('image-check-download').addEventListener('click', () => {
            const report = { checkedAt, state, total, tested: results.length, problems: results.filter(r => !matches(r) || r.result !== 'loaded').map(r => ({ ...r, result: matches(r) ? r.result : 'changed-retest-needed' })) };
            const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
            const link = document.createElement('a'); link.href = url; link.download = 'game-image-problems.json'; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
        render();
        return {
            changed: render,
            reset() { generation++; controller?.abort(); controller = null; results = []; total = 0; state = 'Ready'; render(); }
        };
    }
    root.AdminImageChecker = { probe, mount };
})(globalThis);
