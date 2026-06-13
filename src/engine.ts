// The shared detector engine seam. Both build targets — the web app and the
// Chrome extension — import the engine from here, never by reaching into
// individual detector files. Detection logic lives in src/detectors/ and is
// reused unchanged; this module only re-exports the public surface so the
// shared boundary is explicit and the extension's import path stays stable.
export { detectors, runDetectors } from './detectors/registry';
export type {
  Category,
  Detector,
  DetectorResult,
  Match,
  Severity,
} from './detectors/types';
