export async function fetchMode(mode) {
    return new Promise((resolve,reject)=>{
        const script = document.createElement("script");
        script.src = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.59.0/mode/${mode}/${mode}.min.js`;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    }
    );
}