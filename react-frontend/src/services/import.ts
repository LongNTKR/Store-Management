/**
 * Import service for AI-powered price list import
 */
import axios from 'axios'
import type {
  NetworkCheckResponse,
  PreviewResponse,
  ConfirmImportRequest,
  ImportResult,
} from '../types/import'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Check internet connectivity
 */
export async function checkConnection(): Promise<NetworkCheckResponse> {
  const response = await axios.get<NetworkCheckResponse>(
    `${API_BASE_URL}/api/import/check-connection`
  )
  return response.data
}

/**
 * Preview AI-powered import from image
 *
 * @param file - Image file to analyze
 * @param masterPassword - Master password to decrypt API keys
 * @returns Preview response with detected products and match information
 */
export async function previewAIImport(
  file: File
): Promise<PreviewResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await axios.post<PreviewResponse>(
    `${API_BASE_URL}/api/import/preview-ai`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data
}

/**
 * Confirm and execute import from preview data
 *
 * @param request - Confirmed import items with user modifications
 * @returns Import result with counts and errors
 */
export async function confirmImport(
  request: ConfirmImportRequest
): Promise<ImportResult> {
  const response = await axios.post<ImportResult>(
    `${API_BASE_URL}/api/import/confirm`,
    request
  )

  return response.data
}
