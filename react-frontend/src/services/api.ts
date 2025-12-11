import axios from 'axios'

// Use empty string for relative URLs (proxied through nginx in Docker)
// Falls back to empty string which uses relative URLs by default
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
    baseURL: API_BASE_URL,
})

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error)
        return Promise.reject(error)
    }
)

export default api
