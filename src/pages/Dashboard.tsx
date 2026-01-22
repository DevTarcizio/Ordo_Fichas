import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
    const { user, logout } = useAuth()

    if (!user) return <p>Carregando...</p>

    return (
        
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
            <h1 className="text-4xl mb-6">Dashboard</h1>

            {user.role === "master" && (
                <div className="mb-4 p-4 border rounded bg-red-900 w-80 text-center">
                    <h2 className="text-2xl font-bold mb-2">Área do Mestre</h2>
                    <p>Você pode criar eventos e gerenciar jogadores.</p>
                </div>
            )}

            {user.role === "player" && (
                <div className="mb-4 p-4 border rounded bg-blue-900 w-80 text-center">
                    <h2 className="text-2xl font-bold mb-2">Área do Player</h2>
                    <p>Você pode ver suas missões e interagir com o jogo.</p>
                </div>
            )}

            <button
                onClick={logout}
                className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700"
            >
                Sair
            </button>
        </div>
    )
}