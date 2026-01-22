import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

type User = {
    email: string
    role: "master" | "player"
}

type AuthContextType = {
    user: User | null
    isAuthenticated: boolean
    login: (token: string) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (token){
            try {
                const decoded: any = jwtDecode(token)
                if (decoded.sub && decoded.role){
                    setUser({email: decoded.sub, role: decoded.role})
                } else {
                    throw new Error("token inválido: falta sub ou role")
                }
            } catch (err) {
                console.error("token inválido no useEffect", err)
                localStorage.removeItem("token")
                setUser(null)
            }
        }
    }, [])

    function login(token: string) {
        localStorage.setItem("token", token)
        try {
            const decoded: any = jwtDecode(token)
            if (decoded.sub && decoded.role) {
                setUser({email: decoded.sub, role: decoded.role})
            } else {
                throw new Error("token inválido: falta sub ou role")
            }
        } catch (err) {
            console.error("token inválido no useEffect", err)
            localStorage.removeItem("token")
            setUser(null)
        }
    }

    function logout() {
        localStorage.removeItem("token")
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
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