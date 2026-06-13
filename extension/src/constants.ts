// Tiny dependency-free constants shared between the popup and the injected
// extraction script. Kept in its own module so the popup can import the global
// key without pulling Readability (and the whole extract bundle) into the popup.

/** Global the injected extract.js exposes; the popup calls it via executeScript. */
export const EXTRACT_GLOBAL_KEY = '__clearclauseExtract';

/**
 * Below this many characters of extracted text we treat auto-extraction as
 * "thin" and steer the user to the select-text / paste fallbacks.
 */
export const MIN_USABLE_TEXT_LENGTH = 200;
