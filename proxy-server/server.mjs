import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
wisp.options.allow_udp_streams = false;
wisp.options.port_whitelist = [80, 443];
wisp.options.stream_limit_total = 100;

const app = express();
app.disable('x-powered-by');
app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url)), { etag: false, maxAge: 0 }));
app.use('/uv/', express.static(uvPath));
app.use('/epoxy/', express.static(epoxyPath));
app.use('/baremux/', express.static(baremuxPath));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).send('Not found'));
const server = createServer(app);
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/wisp/') wisp.routeRequest(req, socket, head);
  else socket.end();
});
server.listen(Number(process.env.PORT || 8080), process.env.HOST || '127.0.0.1', () => {
  console.log(`Browser server listening on port ${server.address().port}`);
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
