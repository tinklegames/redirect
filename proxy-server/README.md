# Tinkle Browser setup

This folder runs a real Ultraviolet browser with an Epoxy transport and a Wisp relay. It needs Node.js 24 or newer. It does not use Firebase or require a paid software subscription.

## Test on your computer

From this folder:

```sh
npm ci
npm start
```

Open http://localhost:8080. Keep the server running while browsing. Stop it with Ctrl+C.

## Connect the Browser tab

### Render free-plan candidate

The repository's `render.yaml` prepares a Free Node web service. It has not been deployed. Render supports Node and WebSockets, but explicit approval for a public browsing proxy has not been confirmed. Its free plan can suspend services generating unusually high outbound traffic, so this is a trial option rather than a guarantee of ongoing free proxy hosting.

For manual setup:

1. Upload this `proxy-server` folder (including `package-lock.json` and `public`, excluding `node_modules`) to your GitHub repository.
2. Create your account at https://dashboard.render.com/ and choose **New → Web Service**. Select the repository containing this folder.
3. Set **Root Directory** to `proxy-server`, **Language/Runtime** to `Node`, **Build Command** to `npm ci`, **Start Command** to `npm start`, and **Instance Type** to `Free`.
4. Add environment variables `HOST=0.0.0.0` and `NODE_VERSION=24.11.1`. Set the health check path to `/health`.
5. Deploy, then copy the HTTPS `onrender.com` address. Use that address in the next section's `browser-config.js` step.

To stay within the no-payment requirement, do not select a paid instance or add a payment method. If account verification requires a card, stop and reassess. With no payment method, Render documents suspension instead of bandwidth overage billing. Free services sleep after 15 idle minutes and take about a minute to wake. Do not create artificial keep-alive traffic to defeat these limits.

References: https://render.com/docs/free and https://render.com/docs/websocket .

### General hosting steps

1. Run this folder on a Node.js host that supports persistent WebSocket connections. Use `npm ci` to install and `npm start` to run. Set `HOST=0.0.0.0` on the host; `PORT` defaults to 8080 and can be supplied by the host.
2. Give the proxy its own HTTPS origin, separate from your game site and admin panel. Forward `/wisp/` WebSocket upgrades as well as HTTP traffic. Static hosting such as GitHub Pages cannot run this server.
3. Put that HTTPS URL in `window.TINKLE_BROWSER_URL` in the game site's `browser-config.js`.
4. Upload the updated `codes.html`, `browser-config.js`, `browser-tab.js`, and `sw.js` to your game site. Do not upload `node_modules` to the game site.

The Browser tab embeds the separate server and offers a new-tab option for browsers that restrict service workers or shared workers in third-party frames. The proxy must not be hosted on the same origin as your Firebase admin UI. The server deliberately serves only its public files and installed browser libraries.

The old top-level `uv`, `baremux`, and `epoxy` folders are not used by this new Browser tab. They have been left alone in case another page uses them.

Hosting is not included or activated. Free hosting availability and usage limits depend on the provider; a computer running this locally is not an always-on public endpoint. Not every website supports proxying (logins, streaming, CAPTCHAs, and some scripts can still fail). Only public HTTP/HTTPS destinations on ports 80 and 443 are enabled, and private/loopback destinations remain blocked.

Upstream projects: https://github.com/titaniumnetwork-dev/Ultraviolet and https://github.com/MercuryWorkshop/wisp-js . Ultraviolet is deprecated upstream in favor of Scramjet; it is included here as requested. Dependency versions are locked in package-lock.json.

## Verification

Locally verified in a real Chromium browser: Example Domain loaded through `/service/`, its link to IANA loaded, Back returned to Example Domain, and DuckDuckGo returned search results. Google returned a CAPTCHA during testing, so the default search uses DuckDuckGo. Public hosting and cross-site embedding have not been verified until a server URL is configured.
