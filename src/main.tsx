import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './app/AppContext'
import { App } from './app/App'
import { ErrorBoundary } from './app/ErrorBoundary'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary><HashRouter>
      <AppProvider><App /></AppProvider>
    </HashRouter></ErrorBoundary>
  </React.StrictMode>,
)
