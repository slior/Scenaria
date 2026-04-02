import { ScenariaDiagram } from './ScenariaDiagram.js'
import { getLanguageKeywords } from './lang/Lang.js'
import { initEditor, getCode, setCode } from './Editor.js'
import { newLayoutOptionsFromInputs } from './diagram/DiagDraw.js'

export function createScenariaDiagram(container) {
    return new ScenariaDiagram(container)
}

export function layoutOptionsFromInputs(spacing) {
    return newLayoutOptionsFromInputs(spacing)
}

export { getLanguageKeywords, initEditor, getCode, setCode }
