import { useCallback, useEffect, useRef, useState } from "react"
import { jwtDecode } from "jwt-decode"
import type { JwtPayload } from "jwt-decode"
import { api } from "../services/api"
import { AuthContext } from "./authContext"
import type { User } from "./authContext"

type AuthTokenPayload = JwtPayload & {
    sub: string
    role: "master" | "player"
    exp: number
}

function decodeToken(token: string): User | null {
    try {
        const decoded = jwtDecode<AuthTokenPayload>(token)
        if (decoded.sub && decoded.role) {
            return { email: decoded.sub, role: decoded.role }
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
    const [user, setUser] = useState<User | null>(() => {
        if (storedToken) return decodeToken(storedToken)
        return null
    })

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
    }, [scheduleRefresh])

    const logout = useCallback(() => {
        clearRefreshTimer()
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
    }, [clearRefreshTimer])

    const refreshLogin = useCallback(async (oldToken: string) => {
        try {
            const response = await api.post(
                "/auth/refresh_token",
                {},
                {
                    headers: {
                        Authorization: `Bearer ${oldToken}`
                    }
                }
            )

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
        const stored = localStorage.getItem("token")
        if (stored) {
            try {
                const decoded = jwtDecode<AuthTokenPayload>(stored)
                if (decoded.sub && decoded.role && decoded.exp) {
                    setUser({ email: decoded.sub, role: decoded.role })
                    setToken(stored)
                    scheduleRefresh(stored)
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
    }, [clearRefreshTimer, scheduleRefresh])

    const login = useCallback((newToken: string) => {
        applySession(newToken)
    }, [applySession])

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
