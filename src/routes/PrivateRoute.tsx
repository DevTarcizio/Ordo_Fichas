import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/useAuth"
import type { JSX } from "react"

export default function PrivateRoute({children}: {children: JSX.Element}) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return null
    }

    if (!isAuthenticated) {
        return <Navigate to="/" />
    }

    return children
}
