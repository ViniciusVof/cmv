import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { showAlert } from './utils/alerts'

// Override window.alert to show beautiful toasts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).alert = (message: unknown) => {
  try {
    showAlert(String(message))
  } catch {
    // fallback silently
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

