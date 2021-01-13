const space = ' '.charCodeAt(0) - 9;

const perimeter = 40;
const oper = 10;
const chunk = 2 * oper + 1;
const inputChunk = 2 * perimeter + 1;

const categories = ['nothing', "property", "variable-builtin", "variable", "string", "function-method", "variable-parameter", "operator", "keyword", "function", 'number', 'comment', 'constant-builtin', "string-special", "embedded", "punctuation-special", "constructor", "constant", "function-builtin", "escape", "keyword-argument", "type"];

const languages = ['javascript'];

let models = {};

importScripts('../models/tfjs.js');

async function loadModels() {
    for (const lang of languages) {
        models[lang] = await tf.loadGraphModel(`../models/${lang}/model.json`);
    }
}

const loadingPromise = loadModels();

onmessage = async e=>{
    await loadingPromise;
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
        postMessage([new Uint8Array(4)])
    }
}

function highlightLine(line) {
    return;
}

function wholeText(text, language) {

    const lines = text.split('\n');
    let letters = Array.from(text).map(c=>c.charCodeAt(0) - 9);
    const nbChunks = Math.ceil(letters.length / chunk) || 1;
    letters = letters.concat(Array(nbChunks * chunk - letters.length).fill(space));
    letters = Array(perimeter - oper).fill(space).concat(letters).concat(Array(perimeter - oper).fill(space));
    const batch = [];
    for (let i = 0; i < nbChunks; i++) {
        batch.push(letters.slice(i * chunk, i * chunk + inputChunk));
    }

    const classes = tf.argMax(models[language].predict(tf.tensor(batch, [nbChunks, inputChunk], 'int32')), -1).dataSync();

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
