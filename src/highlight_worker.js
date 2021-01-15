const space = ' '.charCodeAt(0) - 9;

const window_size = 256;

const categories = ['nothing', "property", "variable-builtin", "variable", "string", "function-method", "variable-parameter", "operator", "keyword", "function", 'number', 'comment', 'constant-builtin', "string-special", "embedded", "punctuation-special", "constructor", "constant", "function-builtin", "escape", "keyword-argument", "type"];

const languages = ['javascript'];

let models = {};

importScripts('../models/tfjs.js');

async function loadModels() {
    for (const lang of languages) {
        models[lang] = await tf.loadGraphModel(`../models/${lang}/model.json`);
//         console.log(models[lang].predict(tf.zeros([1, window_size], 'int32')));
    }
}

const busy = loadModels();

onmessage = async e=>{
    await busy;
    if (languages.includes(e.data.language))
        this.handleMessage(e.data);
}

function handleMessage(message) {
    if (message.type == "everything") {
        postMessage({
            type: 'everything',
            categories: wholeText(message.text, message.language)
        });
    } else if (message.type == 'line') {
        postMessage({
            type: 'line',
            line: message.line,
            categories: wholeText(message.text, message.language)
        })
    }
}

function highlightLine(line) {
    return;
}

function wholeText(text, language) {

    const lines = text.split('\n');
    let letters = Array.from(text).map(c=>c.charCodeAt(0) - 9);
    const nbChunks = Math.ceil(letters.length / window_size) || 1;
    letters = letters.concat(Array(nbChunks * window_size - letters.length).fill(space));
    const batch = [];
    for (let i = 0; i < nbChunks; i++) {
        batch.push(letters.slice(i * window_size, (i + 1) * window_size));
    }
    
    const classes = tf.argMax(models[language].predict(tf.tensor(batch, [nbChunks, window_size], 'int32')), -1).dataSync();

    let currentPos = 0;
    let result = [];
    lines.forEach(l=>{
        result.push(new Uint8Array(classes.slice(currentPos, currentPos + l.length)));
        currentPos += l.length + 1;
    }
    );
    return result;
}

//         let html = '';
//         let currentCategory = 0;
//         for (let i = currentPos; i < currentPos + l.length; i++) {
//             if (classes[i] == currentCategory) {
//                 html += text[i];
//             } else {
//                 html += `</span><span class='${categories[classes[i]]}'>${text[i]}`;
//                 currentCategory = classes[i];
//             }
//         }
