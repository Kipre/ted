export const language_config = {
    javascript: {
        slComment: '//',
        slRegex: /^ *\/\/ ?/,
        newLineIndent: {
            before: /{/,
            after: /}/,
            unindent: true
        }
    },
    python: {
        slComment: '#',
        slRegex: /^ *# ?/,
        newLineIndent: {
            before: /:/,
            after: /.?/
        }
    }
}