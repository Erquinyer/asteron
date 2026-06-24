import { createContext, useContext, useState, useEffect } from 'react'

const DarkModeContext = createContext([false, () => {}])

export const DarkModeProvider = ({ children }) => {
  const [dark, setDark] = useState(() => localStorage.getItem('asteron_theme') === 'dark')

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('asteron_theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('asteron_theme', 'light')
    }
  }, [dark])

  return (
    <DarkModeContext.Provider value={[dark, setDark]}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => useContext(DarkModeContext)
