import { X } from "lucide-react"
import { useState } from "react"
import Modal from "./Modal"
import { login, register } from "../services/api"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"
import type { AxiosError } from "axios"

type Props = {
    isOpen: boolean
    onClose: () => void
    mode: "login" | "register"
}

type ErrorPayload = {
    detail?: string
}

export default function AuthModal({ isOpen, onClose, mode }: Props) {
    const isLogin = mode === "login"

    // Estados dos inputs
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [role, setRole] = useState<"player" | "master">("player")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const { login: loginContext } = useAuth()
    const navigate = useNavigate()

    if (!isOpen) return null

    async function handleSubmit() {
        try {
            setLoading(true)
            setError("")

            if (!isLogin && password !== confirmPassword) {
                setError("As senhas não coincidem")
                setLoading(false)
                return
            }

            let data
            if (isLogin) {
                data = await login(email, password)
            } else {
                data = await register(username, email, password, role)
            }

            loginContext(data.access_token)
            onClose()
            navigate("/dashboard")
        } catch (err: unknown) {
            const axiosError = err as AxiosError<ErrorPayload>
            setError(axiosError.response?.data?.detail || axiosError.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-full max-w-md p-8"
        >
            {/* Botão de Fechar */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
                <X />
            </button>

            <h1 className="font-bigtitle text-3xl mb-6 text-center">
                {isLogin ? "Entrar" : "Criar Conta"}
            </h1>

            {error && (
                <p className="text-red-500 text-center mb-2">{error}</p>
            )}

            <form className="flex flex-col gap-4">
                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Username"
                        className="input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                )}

                <input
                    type="email"
                    placeholder="Email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Senha"
                    className="input_password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {!isLogin && (
                    <input
                        type="password"
                        placeholder="Confirmar senha"
                        className="input_password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                )}

                {!isLogin && (
                    <div className="flex flex-col gap-2 mt-2">
                        <span className="font-medium">Função:</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    value="player"
                                    className="font-text"
                                    checked={role === "player"}
                                    onChange={(e) => setRole(e.target.value as "player" | "master")}
                                />
                                Player
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    value="master"
                                    checked={role === "master"}
                                    onChange={(e) => setRole(e.target.value as "player" | "master")}
                                />
                                Mestre
                            </label>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-smalltitle disabled:opacity-50"
                >
                    {loading ? "Carregando..." : isLogin ? "Entrar" : "Cadastrar"}
                </button>
            </form>
        </Modal>
    )
}
