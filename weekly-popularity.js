// Shared by codes.html and admin.html. No scheduler or paid function needed.
(function (root) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    });
    let serverOffset = 0;
    function weekKey(now = Date.now() + serverOffset) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(now)).map(p => [p.type, p.value]));
        // Calendar arithmetic in UTC avoids DST's 23/25-hour local days.
        const date = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
        let daysBack = date.getUTCDay();
        if (daysBack === 0 && +parts.hour < 12) daysBack = 7;
        date.setUTCDate(date.getUTCDate() - daysBack);
        return date.toISOString().slice(0, 10);
    }
    root.WeeklyPopularity = {
        weekKey,
        path: () => 'weeklyClickData/' + weekKey(),
        setServerOffset: value => { serverOffset = Number(value) || 0; }
    };
})(globalThis);
