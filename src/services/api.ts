import axios from "axios";

export const api = axios.create({
    baseURL: "https://ordopraesdium-api.onrender.com/"
})

// Interceptor: injeta token automaticamente
api.interceptors.request.use(config => {
    const token = localStorage.getItem("token")

    if (token) {
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

export async function register(username: string, email: string, password: string, role: string) {
    const res = await api.post("/users/register", {
        username, 
        email, 
        password,
        role
    })

    return res.data
}