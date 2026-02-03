import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import StatusBar from "../components/StatusBar"
import { Brain, Heart, MessageCircleQuestionMark, Pencil, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { formatEnum, reverseFormatEnum } from "../utils"
import type { CharacterDetails } from "../types/character"
import CharacterEditModal from "../components/CharacterEditModal"
import type { EditForm } from "../components/CharacterEditModal"
import StatusEditModal from "../components/StatusEditModal"
import type { StatusEditForm } from "../components/StatusEditModal"
import AttributesCard from "../components/AttributesCard"
import AttributesEditModal from "../components/AttributesEditModal"
import type { AttributesEditForm } from "../components/AttributesEditModal"

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

function toNumber(value: string, fallback: number) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? fallback : parsed
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
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editForm, setEditForm] = useState<EditForm | null>(null)
    const [isStatusEditOpen, setIsStatusEditOpen] = useState(false)
    const [statusForm, setStatusForm] = useState<StatusEditForm | null>(null)
    const [isAttributesEditOpen, setIsAttributesEditOpen] = useState(false)
    const [attributesForm, setAttributesForm] = useState<AttributesEditForm | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isSavingStatus, setIsSavingStatus] = useState(false)
    const [isSavingAttributes, setIsSavingAttributes] = useState(false)
    const token = localStorage.getItem("token")

    useEffect(() => {
        const fetchCharacter = async () => {
            try {
                const response = await api.get(`/characters/${id}/`, {
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
                `/characters/${character!.id}/`,
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

    const openEditModal = () => {
        if (!character) return

        const baseForm = {
            name: character.name,
            age: String(character.age),
            nationality: character.nationality,
            rank: reverseFormatEnum(character.rank),
            nex_total: String(character.nex_total),
            nex_class: String(character.nex_class),
            nex_subclass: String(character.nex_subclass),
            PE_per_round: String(character.PE_per_round),
            displacement: String(character.displacement)
        }

        setEditForm(baseForm)
        setIsEditOpen(true)
    }

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target

        setEditForm(prev => {
            if (!prev) return prev

            return { ...prev, [name]: value }
        })
    }

    const openStatusEditModal = () => {
        if (!character) return

        setStatusForm({
            healthy_max: String(character.healthy_max),
            sanity_max: String(character.sanity_max),
            effort_max: String(character.effort_max),
            investigation_max: String(character.investigation_max)
        })
        setIsStatusEditOpen(true)
    }

    const openAttributesEditModal = () => {
        if (!character) return

        setAttributesForm({
            atrib_agility: String(character.atrib_agility),
            atrib_intellect: String(character.atrib_intellect),
            atrib_vitallity: String(character.atrib_vitallity),
            atrib_presence: String(character.atrib_presence),
            atrib_strength: String(character.atrib_strength)
        })
        setIsAttributesEditOpen(true)
    }

    const handleStatusEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target

        setStatusForm(prev => {
            if (!prev) return prev
            return { ...prev, [name]: value }
        })
    }

    const handleAttributesEditChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target

        setAttributesForm(prev => {
            if (!prev) return prev
            return { ...prev, [name]: value }
        })
    }

    const handleStatusEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!character || !statusForm) return

        setIsSavingStatus(true)

        const payload = {
            healthy_max: toNumber(statusForm.healthy_max, character.healthy_max),
            sanity_max: toNumber(statusForm.sanity_max, character.sanity_max),
            effort_max: toNumber(statusForm.effort_max, character.effort_max),
            investigation_max: toNumber(statusForm.investigation_max, character.investigation_max)
        }

        try {
            const response = await api.patch(
                `/characters/${character.id}/`,
                payload,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            const updatedCharacter = response.data && Object.keys(response.data).length > 0
                ? response.data
                : payload

            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updatedCharacter
                }
                return {
                    ...merged,
                    origin: formatEnum(merged.origin),
                    character_class: formatEnum(merged.character_class),
                    subclass: formatEnum(merged.subclass),
                    trail: formatEnum(merged.trail),
                    rank: formatEnum(merged.rank),
                    healthy_points: clamp(merged.healthy_points, 0, merged.healthy_max),
                    sanity_points: clamp(merged.sanity_points, 0, merged.sanity_max),
                    effort_points: clamp(merged.effort_points, 0, merged.effort_max),
                    investigation_points: clamp(merged.investigation_points, 0, merged.investigation_max)
                }
            })

            setIsStatusEditOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao atualizar status")
        } finally {
            setIsSavingStatus(false)
        }
    }

    const handleAttributesEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!character || !attributesForm) return

        setIsSavingAttributes(true)

        const payload = {
            atrib_agility: toNumber(attributesForm.atrib_agility, character.atrib_agility),
            atrib_intellect: toNumber(attributesForm.atrib_intellect, character.atrib_intellect),
            atrib_vitallity: toNumber(attributesForm.atrib_vitallity, character.atrib_vitallity),
            atrib_presence: toNumber(attributesForm.atrib_presence, character.atrib_presence),
            atrib_strength: toNumber(attributesForm.atrib_strength, character.atrib_strength)
        }

        try {
            const response = await api.patch(
                `/characters/${character.id}/`,
                payload,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            const updatedCharacter = response.data && Object.keys(response.data).length > 0
                ? response.data
                : payload

            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updatedCharacter,
                    origin: formatEnum(updatedCharacter.origin ?? prev.origin),
                    character_class: formatEnum(updatedCharacter.character_class ?? prev.character_class),
                    subclass: formatEnum(updatedCharacter.subclass ?? prev.subclass),
                    trail: formatEnum(updatedCharacter.trail ?? prev.trail),
                    rank: formatEnum(updatedCharacter.rank ?? prev.rank)
                }
                return merged
            })

            setIsAttributesEditOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao atualizar atributos")
        } finally {
            setIsSavingAttributes(false)
        }
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!character || !editForm) return

        setIsSaving(true)

        const payload = {
            name: editForm.name.trim(),
            age: toNumber(editForm.age, character.age),
            nationality: editForm.nationality.trim(),
            rank: editForm.rank,
            nex_total: toNumber(editForm.nex_total, character.nex_total),
            nex_class: toNumber(editForm.nex_class, character.nex_class),
            nex_subclass: toNumber(editForm.nex_subclass, character.nex_subclass),
            PE_per_round: toNumber(editForm.PE_per_round, character.PE_per_round),
            displacement: toNumber(editForm.displacement, character.displacement)
        }

        try {
            const response = await api.patch(
                `/characters/${character.id}/`,
                payload,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            const updatedCharacter = response.data && Object.keys(response.data).length > 0
                ? response.data
                : payload

            setCharacter(prev => {
                if (!prev) return prev

                const merged = {
                    ...prev,
                    ...updatedCharacter,
                    origin: formatEnum(updatedCharacter.origin ?? prev.origin),
                    character_class: formatEnum(updatedCharacter.character_class ?? prev.character_class),
                    subclass: formatEnum(updatedCharacter.subclass ?? prev.subclass),
                    trail: formatEnum(updatedCharacter.trail ?? prev.trail),
                    rank: formatEnum(updatedCharacter.rank ?? payload.rank)
                }

                return merged
            })

            setIsEditOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao atualizar personagem")
        } finally {
            setIsSaving(false)
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
                <div className="max-w-7xl mx-auto flex flex-col gap-2">
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
                                <button
                                    onClick={openEditModal}
                                    className="mb-4 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded flex items-center gap-2 font-text"
                                    title="Editar informações"
                                >
                                    <Pencil size={18} />
                                </button>
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
                            <div className="flex items-center justify-between">
                                <h1 className="text-blue-400 font-smalltitle text-2xl">Status</h1>
                                <button
                                    onClick={openStatusEditModal}
                                    className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded flex items-center gap-2 font-text"
                                    title="Editar status"
                                >
                                    <Pencil size={18} />
                                </button>
                            </div>

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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* Card Atributos */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4 min-h-110">
                            <div className="flex items-center justify-between">
                                <h1 className="text-blue-400 font-smalltitle text-2xl">Atributos</h1>
                                <button
                                    onClick={openAttributesEditModal}
                                    className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded flex items-center gap-2 font-text"
                                    title="Editar atributos"
                                >
                                    <Pencil size={18} />
                                </button>
                            </div>
                            <div className="w-full flex justify-center">
                                <AttributesCard
                                    mode="view"
                                    values={{
                                        agility: character.atrib_agility,
                                        intellect: character.atrib_intellect,
                                        vitallity: character.atrib_vitallity,
                                        presence: character.atrib_presence,
                                        strength: character.atrib_strength
                                    }}
                                    avatarMarkSrc={`/avatars/${character.avatar}/mark.png`}
                                />
                            </div>
                        </div>

                        {/* Card Perícias */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
                            <h1 className="text-blue-400 font-smalltitle text-2xl">Perícias</h1>
                            <div className="text-zinc-300 font-text">
                                Em breve.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CharacterEditModal
                isOpen={isEditOpen}
                editForm={editForm}
                isSaving={isSaving}
                onClose={() => setIsEditOpen(false)}
                onChange={handleEditChange}
                onSubmit={handleEditSubmit}
            />

            <StatusEditModal
                isOpen={isStatusEditOpen}
                form={statusForm}
                isSaving={isSavingStatus}
                onClose={() => setIsStatusEditOpen(false)}
                onChange={handleStatusEditChange}
                onSubmit={handleStatusEditSubmit}
            />

            <AttributesEditModal
                isOpen={isAttributesEditOpen}
                form={attributesForm}
                isSaving={isSavingAttributes}
                avatarMarkSrc={`/avatars/${character.avatar}/mark.png`}
                onClose={() => setIsAttributesEditOpen(false)}
                onChange={handleAttributesEditChange}
                onSubmit={handleAttributesEditSubmit}
            />
        </MainLayout>
    )
}
