import { Trash2 } from "lucide-react"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import { formatEnum } from "../utils"
import type { CharacterSummary } from "../types/character"

export default function Dashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [characters, setCharacters] = useState<CharacterSummary[]>([])

    useEffect(() => {
        if (!user) {
            navigate("/")
        }
    }, [navigate, user])

    useEffect(() => {
        async function getCharacters() {
            try {
                if (!user) return

                const response = await api.get("/characters/list")
                const formattedCharacters = response.data.characters.map((char: CharacterSummary) => ({
                    ...char,
                    origin: formatEnum(char.origin),
                    character_class: formatEnum(char.character_class),
                    rank: formatEnum(char.rank)
                }))

                setCharacters(formattedCharacters)
            } catch (err) {
                console.error("Erro ao buscar personagens: ", err)
            }
        }

        getCharacters()
    }, [user])

    if (!user) {
        return null
    }

    const handleLogout = () => {
        logout()
        navigate("/")
    }

    async function handleDeleteCharacter(id: number) {
        const confirmDelete = window.confirm("Tem certeza que deseja excluir esse personagem?")
        if (!confirmDelete) return

        try {
            await api.delete(`/characters/${id}`)
            setCharacters(prev => prev.filter(char => char.id !== id))
        } catch (err) {
            console.log(err)
            alert("Erro ao excluir personagem")
        }
    }

    function renderPlayerDashboard() {
        return (
            <div className="w-full px-4 md:px-8 flex flex-col gap-6">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-md flex flex-col gap-6 w-full mb-8">
                    <h2 className="text-2xl text-blue-500 font-bigtitle mb-4">Personagens</h2>

                    {/* Lista de Personagens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 w-full">
                        {characters.length === 0 ? (
                            <p className="text-zinc-300 font-text">Não existem personagens criados</p>
                        ) : (
                            characters.map((char) => (
                                <div
                                    key={char.id}
                                    className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 flex flex-col gap-1 w-full"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-blue-400 font-smalltitle text-lg">
                                            {char.name}
                                        </h3>
                                        {/* Botão de excluir */}
                                        <button
                                            onClick={() => handleDeleteCharacter(char.id)}
                                            className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 transition text-white rounded"
                                            title="Excluir personagem"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <p className="text-zinc-300 font-text">Classe: {char.character_class}</p>
                                    <p className="text-zinc-300 font-text">Patente: {char.rank}</p>
                                    <p className="text-zinc-300 font-text">Origem: {char.origin}</p>
                                    <p className="text-zinc-300 font-text">Idade: {char.age}</p>

                                    <button
                                        className="mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-smalltitle transition"
                                        onClick={() => { navigate(`/characters/${char.id}`) }}
                                    >
                                        Ver Ficha
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Card Criar Personagem */}
                    <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 flex flex-col gap-3 w-full">
                        <h3 className="text-blue-400 text-xl font-smalltitle">Criar Personagem</h3>
                        <p className="text-zinc-300 font-text">
                            Crie seu personagem e comece sua aventura!
                        </p>
                        <button
                            className="mt-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-smalltitle transition w-full"
                            onClick={() => navigate("/characters/create")}
                        >
                            Criar Personagem
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    function renderMasterDashboard() {
        return (
            <h1>oi mestre</h1>
        )
    }

    return (
        <MainLayout>
            <div className="w-full flex justify-between items-center p-6">
                <div>
                    <h1 className="text-4xl font-bigtitle">Dashboard</h1>
                    <p>
                        Bem-vindo, <span className="font-text">{user.email}</span>!
                    </p>
                </div>

                {/* Botão de logout*/}
                <button
                    onClick={handleLogout}
                    className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition font-text"
                >
                    Sair
                </button>
            </div>

            <div className="flex flex-1 justify-start items-start w-full">
                {user.role === "master" ? renderMasterDashboard() : renderPlayerDashboard()}
            </div>
        </MainLayout>
    )
}

