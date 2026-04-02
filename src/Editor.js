import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'

/**
 * @param {string[]} keywords
 */
function createScenariaLanguage(keywords) {
    const kw = new Set(keywords)
    return StreamLanguage.define({
        name: 'scenaria',
        startState() {
            return {}
        },
        token(stream, _state) {
            if (stream.eatSpace()) return null
            if (stream.match('//')) {
                stream.skipToEnd()
                return 'comment'
            }
            if (stream.peek() === "'") {
                stream.next()
                while (!stream.eol()) {
                    const c = stream.next()
                    if (c === '\\') {
                        if (!stream.eol()) stream.next()
                    } else if (c === "'") {
                        return 'string'
                    }
                }
                return 'stringError'
            }
            if (stream.match(/^\d*\.\d+([eE][+\-]?\d+)?/)) return 'number'
            if (stream.match(/^\d+/)) return 'number'
            if (stream.match(/^[{}()\[\]]/)) return 'bracket'
            const rest = stream.string.slice(stream.pos)
            const opPrefixes = [
                '-->',
                '<--',
                ')->',
                ')-\\',
                '--(',
                ')--<',
                '->',
                '<-',
                '-(',
                '-'
            ]
            for (const op of opPrefixes) {
                if (rest.startsWith(op)) {
                    stream.pos += op.length
                    return 'operator'
                }
            }
            if (stream.match(/^[;:]/)) return 'punctuation'
            if (stream.match(/^[a-z_$][\w$]*/)) {
                if (kw.has(stream.current())) return 'keyword'
                return 'identifier'
            }
            if (stream.match(/^[A-Z][\w$]*/)) return 'typeIdentifier'
            if (stream.match(/^[=><!~?:&|+\-*\/^%]+/)) return 'operator'
            stream.next()
            return null
        },
        tokenTable: {
            comment: t.lineComment,
            string: t.string,
            stringError: t.invalid,
            number: t.number,
            bracket: t.bracket,
            operator: t.operator,
            punctuation: t.punctuation,
            keyword: t.keyword,
            identifier: t.variableName,
            typeIdentifier: t.className
        },
        languageData: {
            commentTokens: { line: '//' }
        }
    })
}

/**
 * @param {HTMLElement} container
 * @param {string[]} keywords
 * @param {{ onDocChange?: (code: string) => void, initialDoc?: string, readOnly?: boolean }} [options]
 */
export function createEditor(container, keywords, options = {}) {
    const { onDocChange, initialDoc = '', readOnly = false } = options
    const lang = createScenariaLanguage(keywords)
    const highlight = syntaxHighlighting(
        HighlightStyle.define([
            { tag: t.keyword, color: '#569cd6' },
            { tag: t.string, color: '#ce9178' },
            { tag: t.lineComment, color: '#6a9955', fontStyle: 'italic' },
            { tag: t.number, color: '#b5cea8' },
            { tag: t.operator, color: '#d4d4d4' },
            { tag: t.bracket, color: '#ffd700' },
            { tag: t.variableName, color: '#9cdcfe' },
            { tag: t.className, color: '#4ec9b0' },
            { tag: t.invalid, color: '#f44747' }
        ])
    )

    const extensions = [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        lineNumbers(),
        oneDark,
        lang,
        highlight,
        EditorView.editable.of(!readOnly),
        EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' }
        })
    ]

    if (onDocChange) {
        extensions.push(
            EditorView.updateListener.of(update => {
                if (update.docChanged) onDocChange(update.state.doc.toString())
            })
        )
    }

    const state = EditorState.create({
        doc: initialDoc,
        extensions
    })
    const view = new EditorView({ state, parent: container })
    return {
        getCode: () => view.state.doc.toString(),
        setCode: code => {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: code }
            })
        },
        destroy: () => view.destroy()
    }
}

let _legacy = null

/**
 * @param {HTMLElement} container
 * @param {() => void} [readyCB]
 * @param {string[]} keywords
 */
export function initEditor(container, readyCB, keywords) {
    _legacy = createEditor(container, keywords)
    if (readyCB) readyCB()
    return _legacy
}

export function getCode() {
    if (!_legacy) throw new Error('Editor not initialized')
    return _legacy.getCode()
}

export function setCode(code) {
    if (!_legacy) throw new Error('Editor not initialized')
    _legacy.setCode(code)
}
