import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// TEMPORARY: small-text variants (scripts/capture-variants.ts)
const params = new URLSearchParams(location.search)
for (const flag of ['ink', 'stroke']) {
  if (params.has(flag)) document.documentElement.dataset[flag] = ''
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
