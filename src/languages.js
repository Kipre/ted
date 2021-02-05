export const language_config = {
    javascript: {
        slComment: '//',
        slRegex: /^ *\/\/ ?/,
        newLineIndent: {
            before: /{/,
            after: /}/
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