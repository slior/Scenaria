/** HTML attribute for Scenaria source text (`<scenaria-viewer>`, `<scenaria-editor>`, `<scenaria-app>`). */
export const CODE_ATTR = 'code'

/** HTML attribute on `<scenaria-viewer>` for node/edge layout spacing (number, default 20). */
export const SPACING_ATTR = 'spacing'

/** HTML attribute on `<scenaria-viewer>` for diagram notes (`true` or empty = show). */
export const SHOW_NOTES_ATTR = 'show-notes'

/** Fired when diagram/model is ready after parse or URL restore. */
export const SCENARIA_READY_EVENT = 'scenaria-ready'
/** Fired on parse/layout failure. */
export const SCENARIA_ERROR_EVENT = 'scenaria-error'
/** Fired after a diagram node move (layout callback). */
export const SCENARIA_MOVE_EVENT = 'scenaria-move'
/** Editor content changed (debounced). */
export const SCENARIA_CHANGE_EVENT = 'scenaria-change'
