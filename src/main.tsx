import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { polyfill } from 'mobile-drag-drop'
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour'
import 'mobile-drag-drop/default.css'
import './index.css'
import App from './App.tsx'

polyfill({ dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
