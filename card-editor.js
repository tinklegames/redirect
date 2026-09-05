// Pure file helpers shared by the admin editor and its tests. Never executes imported JS.
(function (root) {
    function validImage(value) {
        try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
    }
    function validate(card) {
        if (typeof card.name !== 'string' || !card.name.trim()) throw new Error('Enter a game name.');
        if (typeof card.code !== 'string' || !card.code.trim()) throw new Error('Enter a code.');
        if (!Array.isArray(card.categories) || !card.categories.length || card.categories.some(c => typeof c !== 'string' || !c.trim())) throw new Error('Select at least one category.');
        if (typeof card.img !== 'string' || !validImage(card.img)) throw new Error('Enter a complete http or https image URL.');
        return card;
    }
    function parse(source) {
        // Accept the existing JSON-formatted assignment or a plain JSON array.
        const trimmed = source.replace(/^\uFEFF/, '').replace(/^(?:\s*\/\/[^\n]*\n)*/, '').trim();
        const match = trimmed.match(/^window\.GAME_CARDS\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
        const data = JSON.parse(match ? match[1] : trimmed);
        if (!Array.isArray(data)) throw new Error('The file must contain a GAME_CARDS array.');
        data.forEach(validate);
        return data;
    }
    function serialize(cards) {
        return '// Add new cards at the end to preserve saved favorites.\nwindow.GAME_CARDS = ' + JSON.stringify(cards, null, 2) + ';\n';
    }
    function upsert(cards, card, index = null) {
        validate(card);
        const code = card.code.trim();
        if (cards.some((g, i) => i !== index && g.code.toUpperCase() === code.toUpperCase())) throw new Error('That code already belongs to another card. Select it from All games to edit.');
        if (index !== null && (!Number.isInteger(index) || index < 0 || index >= cards.length)) throw new Error('Select the card again before saving.');
        const next = cards.map(g => ({ ...g, categories: [...g.categories] }));
        const value = { ...(index === null ? {} : next[index]), ...card, name: card.name.trim(), code, categories: [...new Set(card.categories)], img: card.img.trim() };
        if (index === null) next.push(value); else next[index] = value;
        return next;
    }
    root.CardEditor = { validate, parse, serialize, upsert, validImage };
})(globalThis);
