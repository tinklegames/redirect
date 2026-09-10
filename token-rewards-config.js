/* Site-owner settings. Codes are public client-side data, not secrets.
 * On Firebase Spark, update and deploy the matching Firestore reward rules too.
 * Keep each code's id stable so editing its amount never allows a second claim.
 * To add a code, add { id, code, amount, expiresAt } below. Use an ISO UTC date
 * such as '2026-12-31T23:59:59Z' for expiry, or null for no expiry.
 */
window.TINKLE_REWARD_CONFIG = Object.freeze({
  loginAmount: 25,
  cardAmount: 50,
  cardCooldownMs: 5 * 60 * 1000,
  codes: [
    { id: 'welcome-100-v1', code: 'TINKLE100', amount: 100, expiresAt: null }
    { id: 'admin-v1', code: 'D1TINKLER', amount: 100000, expiresAt: null }
  ]
});
