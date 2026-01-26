import type { JSX } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import MainLayout from "../components/MainLayout";

function formatEnum(value: string): string {
    if (!value) return ""
    return value
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

interface Character {
    id: number
    name: string
    age: number
    character_class: string
    rank: string
    origin: string
}


export default function Dashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [characters, setCharacters] = useState<Character[]>([])

    if (!user) {
        navigate("/")
        return null
    }

    useEffect(() => {
        async function getCharacters() {
            try {
                if (!user) return
                
                const response = await api.get("/characters/list")
                const formattedCharacters = response.data.characters.map((char: Character) => ({
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
    }, [])

    function renderPlayerDashboard(): JSX.Element {
        return (

        <div className="w-full px-4 md:px-8 flex flex-col gap-6">
                
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-md flex flex-col gap-6 w-full mb-8">
                <h2 className="text-2xl text-blue-500 font-bigtitle mb-4">Personagens</h2>

                {/* Lista de Personagens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 w-full">
                    {characters.length === 0 ?(
                        <p className="text-zinc-300 font-text">
                            Não existem personagens criados
                        </p>
                    ) : (
                        characters.map((char, index) => (
                            <div
                                key={char.id ?? index}
                                className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 flex flex-col gap-1 w-full"
                            >
                                <h3 className="text-blue-400 font-smalltitle text-lg">
                                    {char.name}
                                </h3>
                                <p className="text-zinc-300 font-text">
                                    Classe: {char.character_class}
                                </p>
                                <p className="text-zinc-300 font-text">
                                    Patente: {char.rank}
                                </p>
                                <p className="text-zinc-300 font-text">
                                    Origem: {char.origin}
                                </p>
                                <p className="text-zinc-300 font-text">
                                    Idade: {char.age}
                                </p>

                                <button
                                    className="mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-smalltitle transition"
                                    onClick={() => {navigate(`/characters/${char.id}`)}}
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
                    <p>Bem-vindo, <span className="font-text">{user.email}</span>!</p>
                </div>

                {/* Botão de logout*/}
                <button
                    onClick={() => {
                        logout()
                        navigate("/login")
                    }}
                    className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition"
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