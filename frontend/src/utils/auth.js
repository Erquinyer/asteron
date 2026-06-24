const KEY = 'asteron_auth'

// Guarda el usuario en localStorage al iniciar sesión
export const login = (user) => localStorage.setItem(KEY, JSON.stringify(user))

// Elimina la sesión al cerrar
export const logout = () => localStorage.removeItem(KEY)

// Devuelve el usuario guardado (o null si no hay sesión)
export const getUser = () => JSON.parse(localStorage.getItem(KEY) || 'null')

// Devuelve true si hay una sesión activa
export const isAuthenticated = () => !!localStorage.getItem(KEY)
