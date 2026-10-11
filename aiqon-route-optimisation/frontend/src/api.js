import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Shipments API
export async function getShipments(params = {}) {
  const response = await client.get('/shipments', { params })
  return response.data
}

export async function getShipment(id) {
  const response = await client.get(`/shipments/${id}`)
  return response.data
}

export async function getShipmentStats() {
  const response = await client.get('/shipments/stats')
  return response.data
}

// Optimization & Recommendation Engine API
export async function evaluateRoutes(payload) {
  const response = await client.post('/recommendations/evaluate', payload)
  return response.data
}

export async function submitPlannerReview(payload) {
  const response = await client.post('/recommendations/review', payload)
  return response.data
}

// Weather Simulation API
export async function reassessWeather(payload) {
  const response = await client.post('/weather/reassess', payload)
  return response.data
}

export async function getWeatherStatus() {
  const response = await client.get('/weather/status')
  return response.data
}

// Data Sources & Transparency API
export async function getDataSources() {
  const response = await client.get('/data-sources')
  return response.data
}

export default client
