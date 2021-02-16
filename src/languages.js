export const languageConfig = {
    default: {
        identifiers: /[\w_$]/,
    },
    javascript: {
        slComment: '//',
        hasUncommentedLine: /(?! *\/\/)^.*\S+.*$/gm,
        slRegex: /^ *\/\/ ?/gm,
        newLineIndent: {
            before: /{/,
            after: /}/,
            unindent: true
        }
    },
    python: {
        slComment: '#',
        hasUncommentedLine: /(?! *#)^.*\S+.*$/gm,
        slRegex: /^ *# ?/gm,
        newLineIndent: {
            before: /:/,
            after: /.?/
        }
    }
}