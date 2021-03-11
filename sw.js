self.addEventListener('install', function(event) {
    event.waitUntil(caches.open('v1').then(function(cache) {
        return cache.addAll(['/ted/index.html',
                             '/ted/src/main.js',
                             '/ted/src/actions.js',
                             '/ted/src/config.js',
                             '/ted/src/cursel.js',
                             '/ted/src/highlight_worker.js',
                             '/ted/src/history.js',
                             '/ted/src/keymap.js',
                             '/ted/src/languages.js',
                             '/ted/src/line.js',
                             '/ted/src/options.js',
                             '/ted/src/scrollbar.js',
                             '/ted/src/state.js',
                             '/ted/src/ted.js',
                             '/ted/style.css',
                             '/ted/manifest.json',
                             '/ted/favicon.ico',
                             '/ted/assets/tedlogo.png']);
    }));
});

self.addEventListener('fetch', function(event) {
    event.respondWith(caches.match(event.request).then(function(response) {
        if (response) return response;
        return fetch(event.request);
    }));
});
