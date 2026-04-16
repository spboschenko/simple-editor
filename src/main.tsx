import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles.css'
import './domains' // single domain registration point — see src/domains/index.ts

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
