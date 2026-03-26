import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail
      || err.response?.data?.error
      || err.message
      || 'Error desconocido'
    return Promise.reject(new Error(msg))
  }
)

export const getStats    = () => api.get('/api/data/stats').then(r => r.data)
export const getProducts = (p={}) => api.get('/api/data/products', { params:p }).then(r => r.data)

export const parseFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/parse/file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const parseText = (texto) =>
  api.post('/api/parse/text', { texto }).then(r => r.data)

export const classify = (productos) =>
  api.post('/api/classify', { productos }).then(r => r.data)

export const generateContent = (productos, config = {}) =>
  api.post('/api/content', { productos, config }).then(r => r.data)

export const validate = (productos) =>
  api.post('/api/validate', { productos }).then(r => r.data)

export default api
