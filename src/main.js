import {Ted} from './ted.js';

const ted = document.getElementById('ted');

if (ted.state.instances.length === 1 && ted.state.current.handle === undefined) {
    ted.state.input(`
# Welcome to the Ted Editor

## How to get started ?
Open a file with \`ctrl + o\` or create a new one with \`alt + n\`.
Save it with \`ctrl + s\`.

## How to close a tab ?
Middle click on it or drag it out of the tab container.
`);
}
// navigator.permissions.query({
//     name: 'clipboard-read'
// });


// if ('serviceWorker'in navigator) {
//     window.addEventListener('load', function() {
//         navigator.serviceWorker.register('/sw.js').then(function(registration) {
//             // Registration was successful
//             console.log('ServiceWorker registration successful with scope: ', registration.scope);
//         }, function(err) {
//             // registration failed :(
//             console.log('ServiceWorker registration failed: ', err);
//         });
//     });
// }
