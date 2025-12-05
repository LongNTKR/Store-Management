/**
 * TypeScript types for AI-powered import functionality.
 * Matches backend Pydantic schemas in schemas/import_schemas.py
 */

// Match status types
export type MatchStatus = 'new' | 'exact_match' | 'similar_match'

// Action types
export type ImportAction = 'create' | 'update' | 'skip'

/**
 * Suggested product match from fuzzy matching
 */
export interface SuggestedMatch {
  product_id: number
  product_name: string
  current_price: number
  current_import_price: number | null
  similarity_score: number // 0-100
}

/**
 * Detected product from AI analysis
 */
export interface DetectedProduct {
  name: string
  price: number
  import_price?: number | null
  unit?: string | null
  category?: string | null
}

/**
 * Preview item with match information
 */
export interface PreviewItem {
  // Detected data
  detected_name: string
  detected_price: number
  detected_import_price: number | null
  detected_unit: string | null
  detected_category: string | null

  // Match status
  match_status: MatchStatus
  existing_product_id: number | null
  existing_product_name: string | null
  existing_price: number | null
  existing_import_price: number | null

  // Fuzzy match suggestions (for 'similar_match' status)
  suggested_matches: SuggestedMatch[]

  // Default action suggested by system
  suggested_action: ImportAction

  // User overrides (set in UI)
  user_action?: ImportAction
  user_product_id?: number // If user selects a suggested match to update
  user_name?: string // If user edits the name
  user_price?: number // If user edits the price
  user_import_price?: number | null // If user edits the import price
  user_unit?: string | null
  user_category?: string | null
}

/**
 * Summary statistics for preview
 */
export interface PreviewSummary {
  total: number
  new_count: number
  update_count: number
  similar_count: number
}

/**
 * Response from preview-ai endpoint
 */
export interface PreviewResponse {
  items: PreviewItem[]
  summary: PreviewSummary
  provider_used: string // AI provider that succeeded (openai, grok, google)
  errors: string[] // Errors from failed providers
}

/**
 * Item to import after user confirmation
 */
export interface ConfirmImportItem {
  action: ImportAction
  product_id?: number | null // Required if action=update

  // Product data (user may have edited these)
  name: string
  price: number
  import_price?: number | null
  unit?: string | null
  category?: string | null
}

/**
 * Request for confirm import endpoint
 */
export interface ConfirmImportRequest {
  items: ConfirmImportItem[]
}

/**
 * Result of import operation
 */
export interface ImportResult {
  updated: number
  added: number
  skipped: number
  errors: string[]
}

/**
 * Network check response
 */
export interface NetworkCheckResponse {
  connected: boolean
  message: string
}
