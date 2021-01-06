export function keyToAction(e) {
    if (e.ctrlKey && e.altKey && e.shiftKey) {

    } else if (e.ctrlKey && e.shiftKey) {
        switch(e.key) {
        case('P'):
            return 'togglecommandline';
        case('Z'):
            return 'redo';
        }
    } else if (e.ctrlKey) {
        switch(e.key) {
        case('c'):
            return 'copy';
        case('v'):
            return 'paste';
        case('x'):
            return 'cut';
        case('a'):
            return 'selectall';
        case('o'):
            return 'open';
        case('s'):
            return 'save';
        case('z'):
            return 'undo';
        }
    } else if (e.shiftKey) {
        if (e.key.length == 1)
            return 'letter';
        if (e.key.includes('Arrow'))
            return 'moveselection'
    } else if (e.altKey) {
        switch(e.key) {
        case('n'):
            return 'newfile';
        case('o'):
            return 'openfolder';
        }
    } else {
        if (e.key.length == 1)
            return 'letter';
        if (e.key.includes('Arrow'))
            return 'move'
        switch(e.key) {
        case('Backspace'):
            return 'backspace';
        case('Delete'):
            return 'delete';
        case('Tab'):
            return 'tab';
        case('Enter'):
            return 'newline';
            }
    }
    console.log(e.key);
    return 'nothing';
}