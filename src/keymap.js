export function keyToAction(e) {
    if (e.ctrlKey && e.altKey && e.shiftKey) {

    } else if (e.ctrlKey && e.shiftKey) {
        if (e.key == 'P')
            return 'togglecommandline';
    } else if (e.ctrlKey) {
        switch(e.key) {
        case('c'):
            return 'copy';
        case('v'):
            return 'paste';
        case('a'):
            return 'selectall';
        case('o'):
            return 'open';
        case('s'):
            return 'save';
        }
    } else {
        if (e.key.length == 1) {
            return 'letter';
        }
        switch(e.key) {
        case('Backspace'):
            return 'backspace';
        case('Tab'):
            return 'tab';
        case('Enter'):
            return 'newline';
            }
    }
    console.log(e.key);
    return 'nothing';
}