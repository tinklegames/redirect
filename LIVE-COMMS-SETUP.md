# Announcements, polls, and player messages

Upload these files to the same locations in your GitHub Pages repository:

- `codes.html`
- `admin.html`
- `admin.js`
- `admin-players.js`
- `admin-comms.js` (new)
- `live-notices.js`
- `player-account.js`
- `player-comms.js` (new)

In Firebase Console, open **Firestore Database → Rules**, replace the rules with the full contents of `firestore.accounts.rules`, and click **Publish**. These are Firestore rules, not Realtime Database rules. Uploading the rules file to GitHub does not publish it to Firebase. The existing `tinkleAdmins/{admin UID}` document must have `enabled: true` for polls and private messages, as with the existing player controls.

Refresh the admin page and player site after uploading.

## Use

- **Live controls → Live announcement:** announcements fill the browser viewport with large centered text. They fade in and out, with the chosen duration and a Dismiss button. “Send saved announcement” uses this presentation too. Reduced-motion preferences remove the transition.
- **Live controls → Live poll:** enter a question and 2–6 options, one per line, plus a duration. Publish starts a new poll and ends voting on the previous poll. View live vote totals below the form; Close voting ends it early. Each account gets one vote. Results are visible in the admin panel; players see confirmation of their own vote.
- **Players → select/search a player → Message this player:** send a private message to that account. Unread messages remain in Firestore for offline players. They appear when the player returns; Got it marks them read across devices. Messages are plain text and only admins and the recipient can read them. This is an admin-to-player inbox, not two-way chat.

The features run on pages loading `player-account.js` (including the codes page). They do not inject UI into independently hosted games.

## Verification

Local Firestore emulator checks passed for admin-only publishing, private inbox reads, acknowledging messages, one vote per account, invalid choices, and closed voting. Automated announcement checks passed for fullscreen presentation, fade-out, and dismissal. Existing online-player tests passed. No production messages or polls were sent; verify presentation and delivery after publishing the files and rules.
