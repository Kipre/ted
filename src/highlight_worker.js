const space = ' '.charCodeAt(0) - 9;

const windowSize = 256;

const categories = ['nothing', "property", "variable-builtin", "variable", 
                    "string", "function-method", "variable-parameter", "operator", 
                    "keyword", "function", 'number', 'comment', 'constant-builtin', 
                    "string-special", "embedded", "punctuation-special", 
                    "constructor", "constant", "function-builtin", "escape", 
                    "keyword-argument", "type"];

const languages = ['javascript'];

let models = {};

// importScripts('../models/tfjs.js');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.8.4/dist/tf.min.js');

async function loadModels() {
    for (const lang of languages) {
        models[lang] = await tf.loadGraphModel(`../models/${lang}/model.json`);
        //         console.log(models[lang].predict(tf.zeros([1, window_size], 'int32')));
    }
}
                             
class MessageQueue {

    constructor(loadPromise) {
        this.queue = [];
        this.busy = loadPromise;
    }

    async run() {
        await this.busy;
        while (this.queue.length > 0)
            handleMessage(this.queue.shift());
    }

    push(message) {
        const last = this.queue[this.queue.length - 1];
        if (last && last.type == message.type && last.line == message.line) {
            this.queue[this.queue.length - 1] = message;
        } else {
            this.queue.push(message);
        }
        setTimeout(()=>{
            this.run()
        }
        , 100);
    }
}

const queue = new MessageQueue(loadModels());

onmessage = e=>{
    queue.push(e.data);
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

function wholeText(text, language) {
    const lines = text.split('\n');
    let letters = Array.from(text).map(c=>c.charCodeAt(0) - 9);
    const nbChunks = Math.ceil(letters.length / windowSize) || 1;
    letters = letters.concat(Array(nbChunks * windowSize - letters.length).fill(space));
    const batch = [];
    for (let i = 0; i < nbChunks; i++) {
        batch.push(letters.slice(i * windowSize, (i + 1) * windowSize));
    }

    const classes = tf.argMax(models[language].predict(tf.tensor(batch, [nbChunks, windowSize], 'int32')), -1).dataSync();

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
