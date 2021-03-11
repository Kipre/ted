self.addEventListener('install', function(event) {
    event.waitUntil(caches.open('v1').then(function(cache) {
        return cache.addAll(['/index.html',
                             '/src/main.js',
                             '/src/actions.js',
                             '/src/config.js',
                             '/src/cursel.js',
                             '/src/highlight_worker.js',
                             '/src/history.js',
                             '/src/keymap.js',
                             '/src/languages.js',
                             '/src/line.js',
                             '/src/options.js',
                             '/src/scrollbar.js',
                             '/src/state.js',
                             '/src/ted.js',
                             '/style.css',
                             '/manifest.json',
                             '/favicon.ico',
                             '/assets/tedlogo.png']);
    }));
});

self.addEventListener('fetch', function(event) {
    event.respondWith(caches.match(event.request).then(function(response) {
        if (response) return response;
        return fetch(event.request);
    }));
});
