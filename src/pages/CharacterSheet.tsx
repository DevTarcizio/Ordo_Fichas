import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import StatusBar from "../components/StatusBar"
import { Brain, Heart, MessageCircleQuestionMark, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { formatEnum } from "../utils"
import type { CharacterDetails } from "../types/character"

type StatusField = "healthy_points" | "sanity_points" | "effort_points" | "investigation_points"

type StatusMaxField = "healthy_max" | "sanity_max" | "effort_max" | "investigation_max"

type StatusConfig = {
    label: string
    icon: LucideIcon
    field: StatusField
    maxField: StatusMaxField
    gradient: string
}

const statusConfigs: StatusConfig[] = [
    {
        label: "VIDA",
        icon: Heart,
        field: "healthy_points",
        maxField: "healthy_max",
        gradient: "bg-gradient-to-r from-red-700 to-red-500"
    },
    {
        label: "SANIDADE",
        icon: Brain,
        field: "sanity_points",
        maxField: "sanity_max",
        gradient: "bg-gradient-to-r from-blue-700 to-blue-500"
    },
    {
        label: "ESFORÇO",
        icon: Zap,
        field: "effort_points",
        maxField: "effort_max",
        gradient: "bg-gradient-to-r from-yellow-700 to-yellow-500"
    },
    {
        label: "INVESTIGAÇÃO",
        icon: MessageCircleQuestionMark,
        field: "investigation_points",
        maxField: "investigation_max",
        gradient: "bg-gradient-to-r from-green-700 to-green-500"
    }
]

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function getAvatarSrc(character: CharacterDetails) {
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

    if (lifePercent <= 0.5) {
        return `/avatars/${character.avatar}/${character.avatar}_hurt.png`
    }

    return `/avatars/${character.avatar}/${character.avatar}.png`
}

export default function CharacterSheet() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [character, setCharacter] = useState<CharacterDetails | null>(null)
    const token = localStorage.getItem("token")

    useEffect(() => {
        const fetchCharacter = async () => {
            try {
                const response = await api.get(`/characters/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                const formattedCharacter = {
                    ...response.data,
                    origin: formatEnum(response.data.origin),
                    character_class: formatEnum(response.data.character_class),
                    rank: formatEnum(response.data.rank),
                    subclass: formatEnum(response.data.subclass),
                    trail: formatEnum(response.data.trail)
                }
                setCharacter(formattedCharacter)
            } catch (err) {
                console.error(err)
                alert("Erro ao buscar personagem")
            }
        }

        fetchCharacter()
    }, [id, token])

    async function updateStatus(field: StatusField, newValue: number) {
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

    const handleStatusChange = (field: StatusField, maxField: StatusMaxField, delta: number) => {
        setCharacter(prev => {
            if (!prev) return prev

            const newValue = clamp(prev[field] + delta, 0, prev[maxField])

            updateStatus(field, newValue)

            return {
                ...prev,
                [field]: newValue
            }
        })
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
                            <div className="flex justify-between items-center">
                                <h1 className="text-blue-400 font-smalltitle mb-4 text-2xl">
                                    Informações Principais
                                </h1>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Idade</span>
                                    <span className="text-white font-text text-lg">{character.age}</span>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded flex flex-col">
                                    <span className="text-zinc-300 font-text">Nacionalidade</span>
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
                            <h1 className="text-blue-400 font-smalltitle text-2xl">Status</h1>

                            <div className="flex justify-center">
                                <img
                                    src={getAvatarSrc(character)}
                                    alt={character.name}
                                    className="w-64 h-64 rounded-full border-2 border-zinc-500 object-cover"
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                {statusConfigs.map((config) => (
                                    <StatusBar
                                        key={config.field}
                                        label={config.label}
                                        icon={config.icon}
                                        current={character[config.field]}
                                        max={character[config.maxField]}
                                        gradient={config.gradient}
                                        onChange={(delta) => {
                                            handleStatusChange(config.field, config.maxField, delta)
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Principal */}
                    <div className="bg-zinc-900 p-4 rounded grid grid-cols-2 gap-4"></div>

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
