/**
 * Bulk Import Types
 *
 * These types describe the entire import pipeline:
 *   File → Parse → Map Headers → Map Rows → Validate → Preview → Save
 *
 * Key design decisions:
 * - Raw row data is preserved for traceability (rawRow on ImportRow)
 * - Confidence scores let the UI highlight uncertain mappings
 * - ColumnMapping is user-editable so they can correct once per file
 */

/** The contact fields we support mapping into */
export type MappableField =
  | 'name'
  | 'homeLocation'
  | 'university'
  | 'program'
  | 'company'
  | 'role'
  | 'phone'
  | 'email'
  | 'linkedinUrl'
  | 'birthday'
  | 'notes'
  | 'tags'
  | 'classification'
  | 'howMet'
  | 'whereMet'
  | 'eventOrContext'
  | 'dateMet'
  | 'reconnectIntervalWeeks'
  | 'reconnectDate'
  | 'skip'; // user chose to ignore this column

/** A single column-to-field mapping with a confidence score */
export interface ColumnMapping {
  /** The original header text from the file */
  originalHeader: string;
  /** The field we're mapping this column to */
  mappedTo: MappableField | null;
  /** 0-1 confidence score from auto-detection */
  confidence: number;
  /** Sample values from the first few rows for the user to see */
  sampleValues: string[];
}

/** Status of a single row after validation */
export type RowStatus = 'ready' | 'duplicate' | 'invalid' | 'skipped';

/** A parsed + mapped row ready for preview */
export interface ImportRow {
  /** Index in the original file (0-based, excluding header) */
  rowIndex: number;
  /** The raw cell values keyed by original header */
  rawRow: Record<string, string>;
  /** The mapped contact fields (partial — only fields that were mapped) */
  mapped: Record<string, string>;
  /** Validation status */
  status: RowStatus;
  /** Human-readable reason if status is not 'ready' */
  statusReason: string;
}

/** Summary counts for the import preview */
export interface ImportSummary {
  total: number;
  ready: number;
  duplicate: number;
  invalid: number;
  skipped: number;
}

/** The full state of an import session */
export interface ImportSession {
  /** Original filename */
  fileName: string;
  /** Detected headers from the file */
  headers: string[];
  /** Auto-detected column mappings (user-editable) */
  mappings: ColumnMapping[];
  /** All parsed rows after mapping + validation */
  rows: ImportRow[];
  /** Aggregate counts */
  summary: ImportSummary;
}
