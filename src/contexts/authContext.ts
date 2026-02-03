import { createContext } from "react"

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

export const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export type { User, AuthContextType }
