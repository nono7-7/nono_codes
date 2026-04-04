/**
 * Bulk Import — barrel export
 *
 * Usage:
 *   import { parseFile, autoMapHeaders, validateRows, rowToContact } from '@/lib/import';
 */

export { parseFile } from './parser';
export type { ParsedFile } from './parser';
export { autoMapHeaders, ALL_MAPPABLE_FIELDS } from './mapper';
export { validateRows, rowToContact } from './validator';
export type { ColumnMapping, ImportRow, ImportSession, ImportSummary, MappableField, RowStatus } from './types';
