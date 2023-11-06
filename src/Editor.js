var editor = null;

// function configLangInEditor(monaco,_keywords)
// {
//     monaco.languages.register({ id: 'logojs' });
//     monaco.languages.setMonarchTokensProvider('logojs',{
//         // monaco.languages.setLanguageConfiguration('logojs',{
//         // Set defaultToken to invalid to see what you do not tokenize yet
//         // defaultToken: 'invalid',

//         keywords: _keywords,

//         typeKeywords: [
//             'number'
//         ],

//         operators: [
//             '=', '>', '<', '==', '<=', '>=', '=/=',
//             '+', '-', '*', '/', '%'
//         ],

//         // we include these common regular expressions
//         symbols:  /[=><!~?:&|+\-*\/\^%]+/,

        
//         // The main tokenizer for our languages
//         tokenizer: {
//             root: [
//             // identifiers and keywords
//             [/[a-z_$][\w$]*/, { cases: { '@typeKeywords': 'keyword',
//                                         '@keywords': 'keyword',
//                                         '@default': 'identifier' } }],
//             [/[A-Z][\w\$]*/, 'type.identifier' ],  // to show class names nicely

//             // whitespace
//             { include: '@whitespace' },

//             // delimiters and operators
//             [/[{}()\[\]]/, '@brackets'],
//             [/[<>](?!@symbols)/, '@brackets'],
//             [/@symbols/, { cases: { '@operators': 'operator',
//                                     '@default'  : '' } } ],

            
//             // numbers
//             [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
//             // [/0[xX][0-9a-fA-F]+/, 'number.hex'],
//             [/\d+/, 'number'],

//             // delimiter: after number because of .\d floats
//             [/[;:]/, 'delimiter'],

//             // strings
//             [/"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
//             [/'/,  { token: 'string.quote', bracket: '@open', next: '@string' } ],

//             // characters
//             [/'[^\\']'/, 'string'],
//             [/'/, 'string.invalid']
//             ],

//             comment: [

//             ],

//             string: [
//             [/[^\\']+/,  'string'],
//             [/\\./,      'string.escape.invalid'],
//             [/'/,        { token: 'string.quote', bracket: '@close', next: '@pop' } ]
//             ],

//             whitespace: [
//             [/[ \t\r\n]+/, 'white'],
//             [/\/\/.*$/,    'comment'],
//             ],
//         },
//     })
// }

function initEditor(container)
{
    require.config({ paths: { vs: './lib/monaco-editor/min/vs' } });

    require(['vs/editor/editor.main'], function () {
        // configLangInEditor(monaco,_keywords)
        editor = monaco.editor.create(container, {
            value: '{}',
            language: 'json',
            theme:'vs-dark'
        });
    });
}

function getCode()
{
    if (!editor) throw new Error("Editor not initialized")
    return editor.getValue()
}