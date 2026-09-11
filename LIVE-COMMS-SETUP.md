# Announcements, polls, and player messages

Upload these files to the same locations in your GitHub Pages repository:

- `codes.html`
- `admin.html`
- `admin.js`
- `admin-tools.js`
- `admin-players.js`
- `admin-comms.js` (new)
- `live-notices.js`
- `player-account.js`
- `player-comms.js` (new)

In Firebase Console, open **Firestore Database → Rules**, replace the rules with the full contents of `firestore.accounts.rules`, and click **Publish**. These are Firestore rules, not Realtime Database rules. Uploading the rules file to GitHub does not publish it to Firebase. The existing `tinkleAdmins/{admin UID}` document must have `enabled: true` for polls and private messages, as with the existing player controls.

Refresh the admin page and player site after uploading.

## Use

- **Live controls → Live announcement:** announcements fill the browser viewport with large centered text. They fade in and out, with the chosen duration. There is no dismiss button; Escape and backdrop clicks do not close announcements. They end when the timer expires or the admin clears them. “Send saved announcement” uses this presentation too. Reduced-motion preferences remove the transition.
- **Live controls → Live poll:** enter a question and 2–6 options, one per line, plus a duration. Publish starts a new poll and ends voting on the previous poll. View live vote totals below the form; Close voting ends it early. Each account gets one vote. Players see live totals and percentages after voting. The poll is a wide top banner without a screen overlay. Hidden polls stay hidden after refresh, and closed/expired polls disappear. Publish a new poll after this update to enable the shared totals; older polls retain their existing votes.
- **Players → select/search a player → Message this player:** send a private message to that account. Unread messages remain in Firestore for offline players. They appear as fullscreen centered text over a faded black screen for 10 seconds, then fade out and are automatically marked read. There is no caption or dismiss button. Messages are plain text and only admins and the recipient can read them. This is an admin-to-player inbox, not two-way chat.

The features run on pages loading `player-account.js` (including the codes page). They do not inject UI into independently hosted games.

The **Refresh everyone now** button silently reloads connected codes pages. Existing commands are ignored when a page first loads to prevent refresh loops. Upload files first; already-open older versions need a manual refresh once to load this behavior.

Republish `firestore.accounts.rules` to enable live results.

## Verification

Local Firestore emulator checks passed for admin-only publishing, private inbox reads, acknowledging messages, one vote per account, invalid choices, and closed voting. Automated announcement checks passed for fullscreen presentation, fade-out, and dismissal. Existing online-player tests passed. No production messages or polls were sent; verify presentation and delivery after publishing the files and rules.
