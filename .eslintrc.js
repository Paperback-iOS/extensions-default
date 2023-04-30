module.exports = {
    'env': {
        'es2021': true,
        'node': true
    },
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
        'ecmaVersion': 12,
        'sourceType': 'module'
    },
    'plugins': [
        'modules-newline',
        '@typescript-eslint'
    ],
    'rules': {
        '@typescript-eslint/indent': [
            'error',
            4
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'never'
        ],
        'prefer-arrow-callback': 'error',
        'modules-newline/import-declaration-newline': 'error',
        'modules-newline/export-declaration-newline': 'error',
        '@typescript-eslint/ban-ts-comment': 'warn'
    },
    'overrides': [
        {
            'files': ['*.test.js'],
            'rules': {
                'no-unused-expressions': 'off',
                '@typescript-eslint/no-var-requires': 'off'
            }
        }
    ]
}
