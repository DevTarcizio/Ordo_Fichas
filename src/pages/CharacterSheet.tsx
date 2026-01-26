import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"

interface Character {
    id: number
    name: string
    age: number
    origin: string
    character_class: string
    rank: string
    nex_total: number
    nex_class: number
    nex_subclass: number
    healthy_points: number
    sanity_points: number
    effort_points: number
    atrib_agility: number
    atrib_intellect: number
    atrib_vitallity: number
    atrib_presence: number
    atrib_strength: number
}

function formatEnum(value: string): string {
    if (!value) return ""
    return value
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

export default function CharacterSheet() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [character, setCharacter] = useState<Character | null>(null)
    const token = localStorage.getItem("token")

    useEffect(() => {
        const fetchCharacter = async () => {
            try {
                const response = await api.get(`/characters/${id}`, {
                    headers: { Authorization: `Bearer ${token}`}
                })
                const formattedCharacters = {
                    ...response.data,
                    origin: formatEnum(response.data.origin),
                    character_class: formatEnum(response.data.character_class),
                    rank: formatEnum(response.data.rank)
                }
                setCharacter(formattedCharacters)
            } catch (err) {
                console.error(err)
                alert("Erro ao buscar personagem")
            }
        }

        fetchCharacter()
    }, [id, token])

    if (!character) {
        return (
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center text-white">
                    Carregando Ficha...
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="min-h-screen text-white px-4 md:px-6 py-6">
                <div className="max-w-4xl mx-auto bg-zinc-800 border border-zinc-700 rounded-lg p-6 flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex justify-between items-center">
                         <h1 className="text-3xl font-bigtitle text-blue-500">
                            {character.name}
                         </h1>
                         <button
                            onClick={() => navigate("/dashboard/")}
                            className="px-4 py-2 bg-zinc-600 rounded hover:bg-zinc-700"
                         >  
                            Voltar
                         </button>
                    </div>

                    {/* Principal */}
                    <div className="bg-zinc-900 p-4 rounded grid grid-cols-2 gap-4">
                        <div><strong>Idade:</strong> {character.age}</div>
                        <div><strong>Origem:</strong> {character.origin}</div>
                        <div><strong>Classe:</strong> {character.character_class}</div>
                        <div><strong>Patente:</strong> {character.rank}</div>
                        <div><strong>Nex Total:</strong> {character.nex_total}</div>
                        <div><strong>Nex da Classe:</strong> {character.nex_class}</div>
                        <div><strong>Nex da Sub-Classe:</strong> {character.nex_subclass}</div>
                    </div>

                    {/* Status */}
                    <div className="bg-zinc-900 p-4 rounded grid grid-cols-3 gap-4">
                        <div><strong>Vida:</strong> {character.healthy_points}</div>
                        <div><strong>Sanidade:</strong> {character.sanity_points}</div>
                        <div><strong>Pontos de Esforço:</strong> {character.effort_points}</div>
                    </div>

                    {/* Atributos */}
                    <div className="bg-zinc-900 p-4 rounded grid grid-cols-5 gap-4">
                        <div><strong>Agilidade:</strong> {character.atrib_agility}</div>
                        <div><strong>Intelecto:</strong> {character.atrib_intellect}</div>
                        <div><strong>Vigor:</strong> {character.atrib_vitallity}</div>
                        <div><strong>Presença:</strong> {character.atrib_presence}</div>
                        <div><strong>Força:</strong> {character.atrib_strength}</div>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}