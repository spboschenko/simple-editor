import React from 'react'
import { AppShell } from './AppShell'
import { EditorProvider } from '../core/store'

export const App: React.FC = () => {
  return (
    <EditorProvider>
      <AppShell />
    </EditorProvider>
  )
}

export default App
