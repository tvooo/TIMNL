import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/500.css'
import '@fontsource/atkinson-hyperlegible-next/600.css'
import '@fontsource/atkinson-hyperlegible-next/700.css'
import './index.css'

// TEMPORARY: font comparison (scripts/capture-variants.ts)
if (new URLSearchParams(location.search).get('font') === 'atkinson') {
  document.documentElement.dataset.font = 'atkinson'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
