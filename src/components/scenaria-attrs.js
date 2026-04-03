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
