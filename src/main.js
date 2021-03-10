import {Ted} from './ted.js';

if ('serviceWorker'in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/src/sw.js').then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, (err) => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
