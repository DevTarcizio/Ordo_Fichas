import { createContext, useContext, useEffect, useRef, useState } from "react"
import { jwtDecode } from "jwt-decode"
import { api } from "../services/api"

type User = {
    email: string
    role: "master" | "player"
}

type AuthContextType = {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    login: (token: string) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

function decodeToken(token: string): User | null {
        try {
            const decoded: any = jwtDecode(token)
            if (decoded.sub && decoded.role) {
                return {email: decoded.sub, role: decoded.role}
            } else {
                throw new Error("token inválido: falta sub ou role")
            }
        } catch (err) {
            console.error("token inválido no useEffect", err)
            localStorage.removeItem("token")
            return null
        }
    }

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const refreshTimeout = useRef<number | null>(null)
    const storedToken = localStorage.getItem("token")
    const [token, setToken] = useState<string | null>(storedToken)
    const [user, setUser] = useState<User | null>(() => {
        if (storedToken) return decodeToken(storedToken)
        return null
    })

    function clearRefreshTimer() {
        if (refreshTimeout.current) {
            clearTimeout(refreshTimeout.current)
        }
    }

    function scheduleRefresh(token: string) {
        clearRefreshTimer()

        const decoded: any = jwtDecode(token)
        const exp = decoded.exp * 1000
        const now = Date.now()
        const timeUntilRefresh = exp - now - 60_000

        if (timeUntilRefresh <= 0) {
            refresh_login(token)
            return
        }

        refreshTimeout.current = window.setTimeout(() => {
            refresh_login(token)
        }, timeUntilRefresh)
    }

    async function refresh_login(oldToken: string) {        
        try {
            const response = await api.post(
                "/auth/refresh_token", {
                    headers: {
                        Authorization: `Bearer ${oldToken}`
                    }   
                }
            )

            const newToken = response.data.access_token
            login(newToken)
        } catch (err) {
            console.log(err)
            alert("Erro ao refrescar o token")
            logout()
        }
    }
    
    useEffect(() => {
        const storedToken = localStorage.getItem("token")
        if (storedToken) {
            try {
                const decoded: any = jwtDecode(storedToken)
                if (decoded.sub && decoded.role && decoded.exp) {
                    setUser({ email: decoded.sub, role: decoded.role })
                    setToken(storedToken)
                    scheduleRefresh(storedToken)
                } else {
                    throw new Error("Token inválido")
                }
            } catch {
                localStorage.removeItem("token")
                setUser(null)
                setToken(null)
            }
        } 

        return () => {
            clearRefreshTimer()
        }
    }, [])

    
        

    function login(newToken: string) {
        localStorage.setItem("token", newToken)
        setToken(newToken)

        const decodedUser = decodeToken(newToken)
        setUser(decodedUser)

        scheduleRefresh(newToken)
    }

    function logout() {
        clearRefreshTimer()
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)