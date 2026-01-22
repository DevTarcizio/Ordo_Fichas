import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import type { JSX } from "react"

export default function PrivateRoute({children}: {children: JSX.Element}) {
    const { isAuthenticated } = useAuth()

    if (!isAuthenticated) {
        return <Navigate to="/" />
    }

    return children
}