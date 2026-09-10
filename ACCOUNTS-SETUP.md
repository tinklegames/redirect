# Firebase Spark setup

The account system now uses Firebase's free **Spark** plan: Authentication and Cloud Firestore only. No Cloud Functions, Blaze upgrade, billing account, or Cloudflare service is required. Free-plan quotas still apply; reaching a quota can temporarily stop account saves or leaderboard reads.

## In Firebase

Open project `mostpopular-39c60` in the Firebase console.

1. Keep the project on **Spark**.
2. In **Authentication → Sign-in method**, enable **Anonymous** and **Email/Password** (not Email Link). Players still enter only a username. A random recovery code supplies a private generated login identifier and password behind the scenes; no real email is requested or sent.
3. In **Firestore Database**, create the default **Standard** database in **Production mode**, if it does not already exist.
4. Deploy the account rules using the terminal commands below. If the project already has Firestore rules for other applications, merge these account collection rules into them first. Do not leave broader rules that grant access to the player collections. Existing Realtime Database admin features are separate and unchanged.

```sh
cd /Users/zdodson/Downloads/redirect
npm ci --prefix functions
functions/node_modules/.bin/firebase login
functions/node_modules/.bin/firebase deploy --project mostpopular-39c60 --config firebase.accounts.json --only firestore:rules
```

The `functions/` directory now contains development tooling only; it does not deploy any functions. The deployment configuration contains only Firestore rules. Then publish the updated frontend files through the site's usual hosting process. Keep development tooling and tests out of static hosting.

## Local testing, also free

```sh
cd /Users/zdodson/Downloads/redirect
functions/node_modules/.bin/firebase emulators:start --project demo-tinkle --config firebase.accounts.json --only auth,firestore
```

In a second terminal:

```sh
cd /Users/zdodson/Downloads/redirect
python3 -m http.server 8000
```

Open `http://localhost:8000/rewards.html?emulator=1`. The local account system uses the isolated demo project. Keep both terminals open. The older analytics/admin code in `codes.html` has its own Firebase connection, so Rewards, Account and Leaderboard are the fully isolated account preview pages.

Tests:

```sh
node --test tests/accounts.test.cjs
node --test tests/spark.test.cjs
```

The second command requires the local Auth and Firestore emulators. Tests create disposable local users, never production accounts.

## Accounts and tokens

- Usernames are permanent and case-insensitive. The claim and initial wallet are created in one transaction, so two players cannot claim the same username.
- The browser stays signed in. Recovery codes use Firebase's password authentication instead of a paid custom-token function. A code restores the same account on another browser.
- Code replacement requires the current code, as Firebase requires recent authentication to change a password. No recovery secret is stored in Firestore. The old 64-character codes from the undeployed Functions prototype do not work with this version.
- New accounts start with 1,000 tokens. Old editable browser-local saves are left untouched and are not imported.
- Rules restrict players to their own account; reserve usernames; enforce catalog purchase prices and equipment ownership; require leaderboard values to match the wallet; and enforce the five-minute card cooldown and once-per-day login with server timestamps.
- Daily challenge progress advances only on card clicks eligible for the 50-token reward. Lifetime game-discovery achievements can still count other clicks.
- Games and their outcomes run in the browser on Spark. A determined player can falsify wins in their own wallet, so this is a casual leaderboard, not a cheat-proof competition. Concealing unrevealed tiles in the UI does not make client-owned game data secret. Tokens have no cash value.
- The top three appear only on the podium; positions 4–50 appear below. The leaderboard refreshes hourly, and catches up when an overdue hidden tab becomes visible.
- Fifteen permanent cosmetics cost 250–1,500 tokens. Selecting a free theme in Settings unequips a shop theme; owned themes remain available.

If changing reward amounts/codes, game categories, or shop prices, update the matching Firestore rules and deploy them along with the frontend. Client-only catalog edits cannot change rule-enforced prices or reward amounts. The free plan's rule evaluation limit is why the game-category lookup is split by code prefix.
