# Weekly popularity without a paid scheduler

Upload these files together to your existing host:

- `codes.html`
- `admin.html`
- `weekly-popularity.js`

No Cloud Function, Cloud Scheduler, billing upgrade, or scheduled job is needed for this implementation. Normal Firebase database usage still applies.

Each week has its own counts at `weeklyClickData/YYYY-MM-DD/GAME_NAME`. The date is the Sunday that starts the current week at **12 PM Eastern (America/New_York)**. The page switches to the new week automatically. Previous weeks remain stored but do not appear in the current rankings. All-time counts are unchanged.

If nobody has the website open at noon, nothing needs to run: the next visit selects the correct week. Open pages check every second and when returning to the tab. Background browser throttling may defer the visible update until the tab is active. Firebase's server-time offset corrects the browser clock once connected; before connection, the local clock is the fallback.

## First upload

On the first ranking load or game click after upload, the page migrates old flat counters into the current week using a Firebase transaction. Existing counts in that week are added to, other dated weeks are preserved, and a `__legacyMigrated` marker prevents repeat imports. Future weeks start fresh. Existing tabs running the previous code should reload. The admin reset button migrates first if needed, then clears only the current week.

## Firebase rules

The rules you supplied grant authenticated reads/writes beneath `weeklyClickData`, which cover the new paths and one-time migration. If rules validate each immediate child as a number, adapt their game-count validation to the new `weeklyClickData/$week/$game` depth, retaining existing authentication/access restrictions. Game counts are still numbers, and their reads and transaction writes must be permitted. Do not make the database publicly writable to fix a permission error.

## Checks

Run `node --test weekly-popularity.test.cjs`. Tests cover Sunday noon in summer and winter, both DST transitions, year boundaries, and server clock correction.

After uploading, click a game and verify that Firebase receives a numeric count under the current Sunday's date, then select Popular. The existing public weekly data was read to validate migration and ranking locally. No live Firebase writes or deployment were made from this workspace.
