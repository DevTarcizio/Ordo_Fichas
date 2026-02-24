import { useCallback, useEffect, useRef, useState } from "react"
import { jwtDecode } from "jwt-decode"
import type { JwtPayload } from "jwt-decode"
import { api } from "../services/api"
import { AuthContext } from "./authContext"
import type { User } from "./authContext"

type AuthTokenPayload = JwtPayload & {
    sub: string
    username?: string
    role: "master" | "player"
    exp: number
}

function decodeToken(token: string): User | null {
    try {
        const decoded = jwtDecode<AuthTokenPayload>(token)
        if (decoded.sub && decoded.role) {
            return { email: decoded.sub, role: decoded.role, username: decoded.username }
        }
        throw new Error("token inválido: falta sub ou role")
    } catch (err) {
        console.error("token inválido no useEffect", err)
        localStorage.removeItem("token")
        return null
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const refreshTimeout = useRef<number | null>(null)
    const refreshLoginRef = useRef<(oldToken: string) => Promise<void>>()
    const storedToken = localStorage.getItem("token")
    const [token, setToken] = useState<string | null>(storedToken)
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimeout.current) {
            clearTimeout(refreshTimeout.current)
        }
    }, [])

    const scheduleRefresh = useCallback((tokenValue: string) => {
        clearRefreshTimer()

        const decoded = jwtDecode<AuthTokenPayload>(tokenValue)
        const exp = decoded.exp * 1000
        const now = Date.now()
        const timeUntilRefresh = exp - now - 60_000

        if (timeUntilRefresh <= 0) {
            void refreshLoginRef.current?.(tokenValue)
            return
        }

        refreshTimeout.current = window.setTimeout(() => {
            void refreshLoginRef.current?.(tokenValue)
        }, timeUntilRefresh)
    }, [clearRefreshTimer])

    const applySession = useCallback((newToken: string) => {
        localStorage.setItem("token", newToken)
        setToken(newToken)
        setUser(decodeToken(newToken))
        scheduleRefresh(newToken)
        setIsLoading(false)
    }, [scheduleRefresh])

    const logout = useCallback(() => {
        void api.post("/auth/logout").catch((err) => {
            console.error("Erro ao deslogar no servidor", err)
        })
        clearRefreshTimer()
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
        setIsLoading(false)
    }, [clearRefreshTimer])

    const refreshLogin = useCallback(async (oldToken: string) => {
        try {
            const response = await api.post("/auth/refresh_token")

            const newToken = response.data.access_token
            applySession(newToken)
        } catch (err) {
            console.log(err)
            alert("Erro ao refrescar o token")
            logout()
        }
    }, [applySession, logout])

    refreshLoginRef.current = refreshLogin

    useEffect(() => {
        let isMounted = true

        const initializeAuth = async () => {
            const stored = localStorage.getItem("token")
            if (!stored) {
                if (isMounted) setIsLoading(false)
                return
            }

            try {
                const decoded = jwtDecode<AuthTokenPayload>(stored)
                const expMs = decoded.exp * 1000
                const now = Date.now()

                if (decoded.sub && decoded.role && decoded.exp && expMs > now) {
                    setUser({ email: decoded.sub, role: decoded.role, username: decoded.username })
                    setToken(stored)
                    scheduleRefresh(stored)
                    if (isMounted) setIsLoading(false)
                    return
                }
            } catch {
                // fallback para refresh
            }

            try {
                await refreshLogin(stored)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        void initializeAuth()

        return () => {
            isMounted = false
            clearRefreshTimer()
        }
    }, [clearRefreshTimer, scheduleRefresh, refreshLogin])

    const login = useCallback((newToken: string) => {
        applySession(newToken)
    }, [applySession])

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
