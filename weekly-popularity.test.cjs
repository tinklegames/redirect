const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./weekly-popularity.js');
const { weekKey } = globalThis.WeeklyPopularity;
test('switches exactly at Sunday noon Eastern in summer', () => {
    assert.equal(weekKey(Date.parse('2026-09-06T15:59:59Z')), '2026-08-30');
    assert.equal(weekKey(Date.parse('2026-09-06T16:00:00Z')), '2026-09-06');
});
test('handles winter, both DST transitions, and year boundaries', () => {
    for (const [instant, expected] of [
        ['2026-01-04T16:59:59Z', '2025-12-28'],
        ['2026-01-04T17:00:00Z', '2026-01-04'],
        ['2026-03-08T15:59:59Z', '2026-03-01'],
        ['2026-03-08T16:00:00Z', '2026-03-08'],
        ['2026-11-01T16:59:59Z', '2026-10-25'],
        ['2026-11-01T17:00:00Z', '2026-11-01'],
        ['2027-01-01T12:00:00Z', '2026-12-27']
    ]) assert.equal(weekKey(Date.parse(instant)), expected);
});
test('all days before next Sunday noon share the same bucket', () => {
    assert.equal(weekKey(Date.parse('2026-09-12T23:00:00Z')), '2026-09-06');
    assert.equal(weekKey(Date.parse('2026-09-13T15:59:59Z')), '2026-09-06');
});
test('uses Firebase offset for clients with an incorrect clock', () => {
    const originalNow = Date.now;
    try {
        Date.now = () => Date.parse('2026-09-06T15:59:00Z');
        WeeklyPopularity.setServerOffset(120000);
        assert.equal(WeeklyPopularity.path(), 'weeklyClickData/2026-09-06');
    } finally {
        Date.now = originalNow;
        WeeklyPopularity.setServerOffset(0);
    }
});
test('migrates flat legacy counts and preserves existing weeks without double counting', () => {
    const input = { Game: 20, Other: 3, '2026-08-30': { Game: 2 }, '2026-08-23': { Game: 100 } };
    const migrated = WeeklyPopularity.migrateLegacy(input, '2026-08-30');
    assert.deepEqual(migrated, {
        '2026-08-30': { Game: 22, Other: 3 },
        '2026-08-23': { Game: 100 }, __legacyMigrated: true
    });
    assert.equal(input.Game, 20);
    assert.equal(WeeklyPopularity.migrateLegacy(migrated, '2026-08-30'), undefined);
    assert.equal(WeeklyPopularity.migrateLegacy(migrated, '2026-09-06'), undefined);
});
test('empty databases are marked migrated without inventing counts', () => {
    assert.deepEqual(WeeklyPopularity.migrateLegacy(null, '2026-08-30'), { __legacyMigrated: true });
});
