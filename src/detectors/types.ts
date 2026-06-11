export type Category =
  | 'data_collection'
  | 'data_sale'
  | 'third_party_sharing'
  | 'retention'
  | 'arbitration'
  | 'class_action_waiver';

export type Severity = 'info' | 'caution' | 'warning';

export interface Match {
  detectorId: string;
  sentence: string; // the matched sentence, verbatim, for display
  index: number; // character offset in the source text
  /** Per-match severity override; defaults to the detector's severity. */
  severity?: Severity;
}

export interface DetectorResult {
  category: Category;
  found: boolean;
  matches: Match[];
}

export interface Detector {
  id: string;
  category: Category;
  label: string;
  severity: Severity;
  detect(text: string): Match[];
}
