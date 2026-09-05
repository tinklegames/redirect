// sw.js - Service Worker with BareMux support
const CACHE_NAME = 'tinkle-baremux-v1';
const APP_CACHE_NAME = 'tinkle-app-v1';
const PROXY_PREFIX = '/proxy/';

// BareMux configuration
const BARE_SERVERS = [
    'https://bare.uv.devgoldy.xyz/',
    'https://bare.alekeagle.me/',
    'https://bare.mathlearning.xyz/',
    'https://bare.flaze.org/'
];

// Install event
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing with BareMux...');
    event.waitUntil(
        Promise.all([
            // Cache main app files
            caches.open(APP_CACHE_NAME)
                .then(cache => {
                    return cache.addAll([
                        '/codes.html',  // Your main HTML file
                        '/',            // Root path
                        // Add any other critical assets
                    ]).catch(err => {
                        console.warn('Failed to cache some resources:', err);
                    });
                }),
            
            // Cache BareMux files if they exist locally
            caches.open(CACHE_NAME)
                .then(cache => {
                    const proxyFiles = [
                        '/baremux/index.js',
                        '/baremux/worker.js',
                        '/uv/uv.bundle.js',
                        '/uv/uv.config.js',
                        '/uv/uv.sw.js',
                        '/uv/uv.handler.js',
                        '/epoxy/index.mjs'
                    ];
                    return Promise.allSettled(
                        proxyFiles.map(file => 
                            cache.add(file).catch(e => 
                                console.log('Optional file not cached:', file)
                            )
                        )
                    );
                })
        ]).then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (![CACHE_NAME, APP_CACHE_NAME].includes(cacheName)) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Fetch event with BareMux support
self.addEventListener('fetch', async event => {
    const url = new URL(event.request.url);
    
    // Handle main page requests
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(serveMainPage());
        return;
    }
    
    // Handle codes.html directly
    if (url.pathname === '/codes.html') {
        event.respondWith(serveCodesPage(event.request));
        return;
    }
    
    // Keep editable site assets fresh so update notices lead to the uploaded version.
    const freshAssets = ['/admin.html', '/admin.css', '/admin.js', '/admin-tools.js', '/admin-data.js', '/card-editor.js', '/admin-image-checker.js', '/game-cards.js', '/codes.json', '/weekly-popularity.js', '/live-notices.js', '/event-core.js', '/live-events.js', '/admin-events.js'];
    if (url.origin === self.location.origin && freshAssets.includes(url.pathname)) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Handle BareMux requests
    if (url.pathname.startsWith('/baremux/')) {
        event.respondWith(handleBareMuxRequest(event));
        return;
    }
    
    // Handle UV requests
    if (url.pathname.startsWith('/uv/')) {
        event.respondWith(handleUVRequest(event));
        return;
    }
    
    // Handle Epoxy requests
    if (url.pathname.startsWith('/epoxy/')) {
        event.respondWith(handleEpoxyRequest(event));
        return;
    }
    
    // Handle proxy requests
    if (url.pathname.startsWith(PROXY_PREFIX)) {
        event.respondWith(handleProxyRequest(event));
        return;
    }
    
    // For other requests, try cache then network
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
            .catch(() => new Response('Network error', { status: 408 }))
    );
});

// Retain offline fallback, but check for the uploaded version on each visit.
async function networkFirst(request) {
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok) {
            const cache = await caches.open(APP_CACHE_NAME);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return await caches.match(request) || new Response('Page unavailable offline', { status: 503 });
    }
}
async function serveMainPage() { return networkFirst('/codes.html'); }
async function serveCodesPage(request) { return networkFirst(request || '/codes.html'); }

// Handle BareMux requests
async function handleBareMuxRequest(event) {
    const url = new URL(event.request.url);
    
    // Serve BareMux files from cache or fetch
    if (url.pathname.includes('index.js') || url.pathname.includes('worker.js')) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        
        // Try to fetch from known CDNs if not cached locally
        if (!event.request.url.includes(location.origin)) {
            return fetch(event.request);
        }
    }
    
    // For API requests through BareMux
    if (url.pathname.includes('/baremux/api/')) {
        return handleBareMuxAPI(event);
    }
    
    return fetch(event.request);
}

// Handle BareMux API requests
async function handleBareMuxAPI(event) {
    try {
        const request = event.request;
        const url = new URL(request.url);
        
        // Extract target URL from BareMux request
        const targetUrl = url.searchParams.get('url') || 
                         url.searchParams.get('target') ||
                         await extractUrlFromBody(request);
        
        if (!targetUrl) {
            return new Response('Missing target URL', { status: 400 });
        }
        
        // Select a Bare server (round-robin)
        const bareServer = BARE_SERVERS[Math.floor(Math.random() * BARE_SERVERS.length)];
        
        // Forward request to Bare server
        const bareRequest = new Request(`${bareServer}${targetUrl}`, {
            method: request.method,
            headers: request.headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().body : null,
            redirect: 'manual'
        });
        
        const response = await fetch(bareRequest);
        
        // Create response with CORS headers
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
        headers.set('Access-Control-Allow-Headers', '*');
        headers.set('Access-Control-Expose-Headers', '*');
        headers.set('X-Bare-Server', bareServer);
        
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
        });
        
    } catch (error) {
        console.error('BareMux API error:', error);
        return new Response(`BareMux error: ${error.message}`, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Extract URL from request body for POST requests
async function extractUrlFromBody(request) {
    if (request.method === 'POST' || request.method === 'PUT') {
        try {
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const body = await request.clone().json();
                return body.url || body.target || body.destination;
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                const text = await request.clone().text();
                const params = new URLSearchParams(text);
                return params.get('url') || params.get('target');
            }
        } catch (error) {
            console.warn('Failed to extract URL from body:', error);
        }
    }
    return null;
}

// Handle UV requests
async function handleUVRequest(event) {
    const url = new URL(event.request.url);
    
    // Serve UV files from cache
    const cached = await caches.match(event.request);
    if (cached) return cached;
    
    // For UV service worker
    if (url.pathname.includes('sw.js')) {
        return fetch('/uv/uv.sw.js');
    }
    
    return fetch(event.request);
}

// Handle Epoxy requests
async function handleEpoxyRequest(event) {
    const url = new URL(event.request.url);
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
        return new Response('Missing URL parameter for Epoxy', { status: 400 });
    }
    
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            redirect: 'follow'
        });
        
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        
        return new Response(response.body, {
            status: response.status,
            headers: headers
        });
    } catch (error) {
        return new Response(`Epoxy error: ${error.message}`, { status: 500 });
    }
}

// Handle general proxy requests
async function handleProxyRequest(event) {
    const url = new URL(event.request.url);
    const targetUrl = url.pathname.replace(PROXY_PREFIX, '');
    
    if (!targetUrl) {
        return new Response('Please provide a URL', { status: 400 });
    }
    
    try {
        const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            redirect: 'follow'
        });
        
        // Rewrite HTML content
        if (response.headers.get('content-type')?.includes('text/html')) {
            const text = await response.text();
            const rewritten = rewriteUrls(text, fullUrl);
            
            return new Response(rewritten, {
                status: response.status,
                headers: {
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // Pass through other content
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        
        return new Response(response.body, {
            status: response.status,
            headers: headers
        });
    } catch (error) {
        return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
}

// Rewrite URLs in HTML
function rewriteUrls(html, baseUrl) {
    const base = new URL(baseUrl);
    
    // Rewrite various URL attributes
    const attrPatterns = [
        'href', 'src', 'action', 'data', 'poster', 'srcset',
        'cite', 'formaction', 'icon', 'manifest', 'archive'
    ];
    
    attrPatterns.forEach(attr => {
        const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'gi');
        html = html.replace(regex, (match, url) => {
            if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
                return match;
            }
            
            let absoluteUrl;
            try {
                absoluteUrl = new URL(url, baseUrl).href;
            } catch {
                return match;
            }
            
            return `${attr}="${PROXY_PREFIX}${absoluteUrl}"`;
        });
    });
    
    // Rewrite CSS URLs
    html = html.replace(/url\(["']?([^"')]*)["']?\)/gi, (match, url) => {
        if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
            return match;
        }
        
        let absoluteUrl;
        try {
            absoluteUrl = new URL(url, baseUrl).href;
        } catch {
            return match;
        }
        
        return `url("${PROXY_PREFIX}${absoluteUrl}")`;
    });
    
    // Add base tag
    if (!html.includes('<base')) {
        html = html.replace(
            /<head[^>]*>/i,
            `$&<base href="${baseUrl}">`
        );
    }
    
    return html;
}

// Handle messages
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'GET_BARE_SERVERS') {
        event.source.postMessage({
            type: 'BARE_SERVERS',
            servers: BARE_SERVERS
        });
    }
});
