const space = ' '.charCodeAt(0) - 9;

const perimeter = 40;
const oper = 10;
const chunk = 2 * oper + 1;
const inputChunk = 2 * perimeter + 1;

let model;

importScripts('../models/tfjs.js');

tf.loadGraphModel('../models/hi-en-js/model.json').then(m=>{
    model = m;

    // warmup
    model.predict(tf.tensor([new Uint8Array(inputChunk)]));
    postMessage({type: 'model ready'});
}
);

onmessage = e=>{
    const message = e.data;
    if (model) {
        if (message.type == "everything") {
            postMessage({
                type: 'everything',
                categories: wholeText(message.text)
            });
        } else if (message.type == 'lineonly') {
            postMessage([new Uint8Array(4)])
        }
    } else {
        postMessage({
            type: 'model not ready'
        });
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
    lines.forEach((l,i)=>{
        result.push(new Uint8Array(classes.slice(currentPos, currentPos + l.length)));
        currentPos += l.length + 1;
    }
    );
    return result;
}
