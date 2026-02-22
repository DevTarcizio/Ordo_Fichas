import axios from "axios"

const resolveBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL as string | undefined
    if (envUrl && envUrl.trim().length > 0) {
        return envUrl
    }
    if (typeof window !== "undefined") {
        const host = window.location.hostname
        if (host === "localhost" || host === "127.0.0.1") {
            return "http://localhost:8000/"
        }
    }
    return "https://ordopraesdium-api.onrender.com/"
}

const baseURL = resolveBaseUrl()

export const api = axios.create({
    baseURL,
    withCredentials: true
})

const refreshApi = axios.create({
    baseURL,
    withCredentials: true
})

// Interceptor: injeta token automaticamente
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")

    if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

// Autenticação
export async function login(email: string, password: string) {
    const form = new URLSearchParams()
    form.append("username", email)
    form.append("password", password)

    const res = await api.post("/auth/token", form)

    return res.data
}

let refreshPromise: Promise<string> | null = null

const isAuthEndpoint = (url?: string) => {
    if (!url) return false
    return url.includes("/auth/token") || url.includes("/auth/refresh_token")
}

const refreshAccessToken = async () => {
    if (!refreshPromise) {
        refreshPromise = refreshApi
            .post("/auth/refresh_token")
            .then((res) => res.data.access_token as string)
            .finally(() => {
                refreshPromise = null
            })
    }
    return refreshPromise
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status
        const originalRequest = (error?.config ?? {}) as {
            _retry?: boolean
            url?: string
            headers?: Record<string, string>
        }

        if (status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
            originalRequest._retry = true
            try {
                const newToken = await refreshAccessToken()
                if (newToken) {
                    localStorage.setItem("token", newToken)
                    originalRequest.headers = originalRequest.headers ?? {}
                    originalRequest.headers.Authorization = `Bearer ${newToken}`
                }
                return api(originalRequest)
            } catch (refreshError) {
                localStorage.removeItem("token")
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

export async function register(username: string, email: string, password: string, role: string) {
    const res = await api.post("/users/register", {
        username,
        email,
        password,
        role
    })

    return res.data
}
