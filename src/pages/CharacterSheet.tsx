import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import StatusBar from "../components/StatusBar"
import { Heart, Brain, Zap, MessageCircleQuestionMark } from "lucide-react"
import formatEnum from "../utils"

interface Character {
    id: number
    name: string
    nationality: string
    age: number
    avatar: string
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
    investigation_points: number
    investigation_max: number
    atrib_agility: number
    atrib_intellect: number
    atrib_vitallity: number
    atrib_presence: number
    atrib_strength: number
    displacement: number
    PE_per_round: number
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

                console.log(response.data)

                const formattedCharacters = {
                    ...response.data,
                    origin: formatEnum(response.data.origin),
                    character_class: formatEnum(response.data.character_class),
                    rank: formatEnum(response.data.rank),
                    subclass: formatEnum(response.data.subclass),
                    trail: formatEnum(response.data.trail),
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
        field: "healthy_points" | "sanity_points" | "effort_points" | "investigation_points",
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

    const getAvatarSrc = () => {
        if (!character) return ""

        const lifePercent = character.healthy_points / character.healthy_max
        const sanityPercent = character.sanity_points / character.sanity_max

        if (lifePercent <= 0.0 && sanityPercent <= 0.0) {
            return `/avatars/${character.avatar}/${character.avatar}_dying_and_madness.png`
        }
        
        if (sanityPercent <= 0.0) {
            return `/avatars/${character.avatar}/${character.avatar}_madness.png`
        }

        if (lifePercent <= 0.0) {
            return `/avatars/${character.avatar}/${character.avatar}_dying.png`
        }

        if (lifePercent <= 0.5 ) {
            return `/avatars/${character.avatar}/${character.avatar}_hurt.png`
        }

        return `/avatars/${character.avatar}/${character.avatar}.png`
    }

    return (
        <MainLayout>
            <div className="min-h-screen text-white px-4 md:px-6 py-6">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex justify-between items-center">
                         <h1 className="text-3xl font-bigtitle text-blue-500">
                            {character.name}
                         </h1>
                         <button
                            onClick={() => navigate("/dashboard/")}
                            className="px-4 py-2 bg-zinc-600 rounded hover:bg-zinc-700 font-text"
                         >  
                            Voltar
                         </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                        {/* Card informações */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md">
                            <h1 className="text-blue-400 font-smalltitle mb-4 text-2xl">
                                Informações Principais
                            </h1>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                
                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Idade</span>
                                    <span className="text-white font-text text-lg">{character.age}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Nacionalide</span>
                                    <span className="text-white font-text text-lg">{character.nationality}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Origem</span>
                                    <span className="text-white font-text text-lg">{character.origin}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Classe</span>
                                    <span className="text-white font-text text-lg">{character.character_class}</span>
                                </div>
                                
                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Subclasse</span>
                                    <span className="text-white font-text text-lg">{character.subclass}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Trilha</span>
                                    <span className="text-white font-text text-lg">{character.trail}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Patente</span>
                                    <span className="text-white font-text text-lg">{character.rank}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">PE por rodada</span>
                                    <span className="text-white font-text text-lg">{character.PE_per_round}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Deslocamento</span>
                                    <span className="text-white font-text text-lg">{character.displacement}</span>
                                </div>

                                {/* Bloco NEX */}
                                <div className="bg-zinc-900/70 p-6 rounded-lg flex flex-col gap-4 col-span-2 md:col-span-3 shadow-inner border border-zinc-700">
                                    
                                    {/* Total */}
                                    <div className="flex justify-center items-center text-white text-2xl font-text mb-2">
                                        <span className="text-zinc-300">Nex Total:</span>
                                        <span className="text-white ml-2">{character.nex_total}%</span>
                                    </div>

                                    {/* Classe e Subclasse */}
                                    <div className="flex justify-between gap-4">
                                        <div className="flex flex-col items-center flex-1 bg-zinc-800/80 p-3 rounded">
                                            <span className="text-zinc-300 text-xl font-text">Classe</span>
                                            <span className="text-white text-xl font-text">{character.nex_class}%</span>
                                        </div>
                                        <div className="flex flex-col items-center flex-1 bg-zinc-800/80 p-3 rounded">
                                            <span className="text-zinc-300 text-xl font-text">Subclasse</span>
                                            <span className="text-white text-xl font-text">{character.nex_subclass}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Aba Principal */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col gap-4">     
                            <h1 className="text-blue-400 font-smalltitle text-2xl">
                                Status
                            </h1>

                            <div className="flex justify-center">
                                <img src={getAvatarSrc()} alt={character.name} className="w-64 h-64 rounded-full border-2 border-zinc-500 object-cover"/>
                            </div>

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

                                <StatusBar 
                                    label="Investigação"
                                    icon={MessageCircleQuestionMark}
                                    current={character.investigation_points}
                                    max={character.investigation_max}
                                    gradient="bg-gradient-to-r from-green-700 to-green-500"
                                    onChange={(delta) => {
                                        setCharacter(prev => {
                                            if (!prev) return prev

                                            const newValue = Math.min(
                                                prev.investigation_max,
                                                Math.max(0, prev.investigation_points + delta)
                                            )

                                            updateStatus("investigation_points", newValue)

                                            return {
                                                ...prev,
                                                investigation_points: newValue
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