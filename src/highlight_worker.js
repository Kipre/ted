const space = ' '.charCodeAt(0) - 9;

const perimeter = 40;
const oper = 10;
const chunk = 2 * oper + 1;
const inputChunk = 2 * perimeter + 1;

const categories = ['nothing', "property", "variable-builtin", "variable", "string", "function-method", "variable-parameter", "operator", "keyword", "function", 'number', 'comment', 'constant-builtin', "string-special", "embedded", "punctuation-special", "constructor", "constant", "function-builtin", "escape", "keyword-argument", "type"];

let model;

importScripts('../models/tfjs.js');

const modelPromise = tf.loadGraphModel('../models/hi-en-js/model.json').then(m=>{
    model = m;

    // warmup
    model.predict(tf.tensor([new Uint8Array(inputChunk)]));
    //     postMessage({type: 'model ready'});
}
);

onmessage = async e=>{
    const message = e.data;
    await modelPromise;
    this.handleMessage(e.data);
}

function handleMessage(message) {
    if (message.type == "everything") {
        postMessage({
            type: 'everything',
            html: wholeText(message.text)
        });
    } else if (message.type == 'lineonly') {
        postMessage([new Uint8Array(4)])
    }
}

function wholeText(text) {

    const lines = text.split('\n');
    let letters = Array.from(text).map(c=>c.charCodeAt(0) - 9);
    const nbChunks = Math.ceil(letters.length / chunk) || 1;
    letters = letters.concat(Array(nbChunks * chunk - letters.length).fill(space));
    letters = Array(perimeter - oper).fill(space).concat(letters).concat(Array(perimeter - oper).fill(space));
    const batch = [];
    for (let i = 0; i < nbChunks; i++) {
        batch.push(letters.slice(i * chunk, i * chunk + inputChunk));
    }

    const classes = tf.argMax(model.predict(tf.tensor(batch, [nbChunks, inputChunk], 'int32')), -1).dataSync();

    let currentPos = 0;
    let result = [];
    lines.forEach(l=>{

        let html = '';
        let currentCategory = 0;
        for (let i = currentPos; i < currentPos + l.length; i++) {
            if (classes[i] == currentCategory) {
                html += text[i];
            } else {
                html += `</span><span class='${categories[classes[i]]}'>${text[i]}`;
                currentCategory = classes[i];
            }
        }
        result.push(html);
        currentPos += l.length + 1;
    }
    );
    return result;
}

// if (cats) {
//         } else 
