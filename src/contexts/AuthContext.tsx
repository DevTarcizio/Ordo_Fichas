import { createContext, useContext, useEffect, useState } from "react"
import { jwtDecode } from "jwt-decode"

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
    const storedToken = localStorage.getItem("token")

    const [token, setToken] = useState<string | null>(storedToken)
    const [user, setUser] = useState<User | null>(() => {
        if (storedToken) return decodeToken(storedToken)
        return null
    })

    useEffect(() => {
        const storedToken = localStorage.getItem("token")
        if (storedToken) {
            try {
                const decoded: any = jwtDecode(storedToken)
                if (decoded.sub && decoded.role) {
                    setUser({ email: decoded.sub, role: decoded.role })
                    setToken(storedToken)
                } else {
                    throw new Error("Token inválido")
                }
            } catch {
                localStorage.removeItem("token")
                setUser(null)
                setToken(null)
            }
        }
    }, [])


    function login(newToken: string) {
        localStorage.setItem("token", newToken)
        setToken(newToken)

        const decodedUser = decodeToken(newToken)
        setUser(decodedUser)
    }

    function logout() {
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