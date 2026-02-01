import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import StatusBar from "../components/StatusBar"
import { Heart, Brain, Zap } from "lucide-react"

interface Character {
    id: number
    name: string
    age: number
    origin: string
    character_class: string
    rank: string
    subclass: string
    trail: string
    nex_total: number
    nex_class: number
    nex_subclass: number
    healthy_points: number
    healthy_max: number
    sanity_points: number
    sanity_max: number
    effort_points: number
    effort_max: number
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
                    rank: formatEnum(response.data.rank),
                    subclass: formatEnum(response.data.subclass),
                    trail: formatEnum(response.data.trail)
                }
                setCharacter(formattedCharacters)
            } catch (err) {
                console.error(err)
                alert("Erro ao buscar personagem")
            }
        }

        fetchCharacter()
    }, [id, token])

    async function updateStatus(
        field: "healthy_points" | "sanity_points" | "effort_points",
        newValue: number
    ) {
        try {
            await api.patch(
                `/characters/${character!.id}`,
                { [field]: newValue },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )
        } catch (err) {
            console.log(err)
            alert("Erro ao atualizar dados do servidor")
        }
    }

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
                <div className="max-w-5xl mx-auto flex flex-col gap-6">

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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Card informações */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                            <h2 className="text-blue-400 font-smalltitle mb-3">
                                Informações Principais
                            </h2>
                            <div className="grid grid-cols-2 gap-2">
                                <div><strong>Idade:</strong> {character.age}</div>
                                <div><strong>Origem:</strong> {character.origin}</div>
                                <div><strong>Classe:</strong> {character.character_class}</div>
                                <div><strong>Subclasse:</strong> {character.subclass}</div>
                                <div><strong>Trilha:</strong> {character.trail}</div>
                                <div><strong>Patente:</strong> {character.rank}</div>
                                <div><strong>Nex Total:</strong> {character.nex_total}</div>
                                <div><strong>Nex da Classe:</strong> {character.nex_class}</div>
                                <div><strong>Nex da Sub-Classe:</strong> {character.nex_subclass}</div>
                            </div>
                        </div>


                        {/* Aba Principal */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col gap-4">
                            <h2 className="text-blue-400 font-smalltitle">
                                Status
                            </h2>
                            <div className="flex flex-col gap-3">
                           
                                <StatusBar 
                                    label="Vida"
                                    icon={Heart}
                                    current={character.healthy_points}
                                    max={character.healthy_max}
                                    gradient="bg-gradient-to-r from-red-700 to-red-500"
                                    onChange={(delta) => {
                                        setCharacter(prev => {
                                            if (!prev) return prev

                                            const newValue = Math.min(
                                                prev.healthy_max,
                                                Math.max(0, prev.healthy_points + delta)
                                            )

                                            updateStatus("healthy_points", newValue)

                                            return {
                                                ...prev,
                                                healthy_points: newValue
                                            }
                                        })
                                    }}
                                /> 

                                <StatusBar 
                                    label="Sanidade"
                                    icon={Brain}
                                    current={character.sanity_points}
                                    max={character.sanity_max}
                                    gradient="bg-gradient-to-r from-blue-700 to-blue-500"
                                    onChange={(delta) => {
                                        setCharacter(prev => {
                                            if (!prev) return prev

                                            const newValue = Math.min(
                                                prev.sanity_max,
                                                Math.max(0, prev.sanity_points + delta)
                                            )

                                            updateStatus("sanity_points", newValue)

                                            return {
                                                ...prev,
                                                sanity_points: newValue
                                            }
                                        })
                                    }}
                                /> 

                                <StatusBar 
                                    label="Esforço"
                                    icon={Zap}
                                    current={character.effort_points}
                                    max={character.effort_max}
                                    gradient="bg-gradient-to-r from-yellow-700 to-yellow-500"
                                    onChange={(delta) => {
                                        setCharacter(prev => {
                                            if (!prev) return prev

                                            const newValue = Math.min(
                                                prev.effort_max,
                                                Math.max(0, prev.effort_points + delta)
                                            )

                                            updateStatus("effort_points", newValue)

                                            return {
                                                ...prev,
                                                effort_points: newValue
                                            }
                                        })
                                    }}
                                />     
                            
                            </div>
                        </div>

                    </div>

                    {/* Principal */}
                    <div className="bg-zinc-900 p-4 rounded grid grid-cols-2 gap-4">
                        
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