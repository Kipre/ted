export function keyToAction(e) {
    if (e.ctrlKey && e.altKey && e.shiftKey) {

    } else if (e.ctrlKey && e.shiftKey) {
        switch(e.key) {
        case('P'):
            return 'togglecommandline';
        case('Z'):
            return 'redo';
        case('S'):
            return 'saveas';
        case('T'):
            return 'test';
        }
    } else if (e.shiftKey && e.altKey) {
        switch(e.key) {
        case('T'):
            return 'test';
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
        case(':'):
            return 'togglecomment';
        }
    } else if (e.shiftKey) {
        if (e.key.length == 1)
            return 'letter';
        if (e.key.includes('Arrow'))
            return 'moveselection'
        if (e.key == 'Tab')
            return 'unindent';
    } else if (e.altKey) {
        switch(e.key) {
        case('n'):
            return 'newfile';
        case('o'):
            return 'openfolder';
        case('t'):
            return 'transpose';
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
            return 'indent';
        case('Enter'):
            return 'newline';
            }
    }
//     console.log(e, e.key);
    return 'nothing';
}