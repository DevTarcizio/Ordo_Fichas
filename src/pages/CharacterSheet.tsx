import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import StatusBar from "../components/StatusBar"
import { Brain, Heart, Info, MessageCircleQuestionMark, Pencil, Zap } from "lucide-react"
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
import ExpertiseRollModal from "../components/ExpertiseRollModal"
import ExpertiseEditModal from "../components/ExpertiseEditModal"

type StatusField = "healthy_points" | "sanity_points" | "effort_points" | "investigation_points"

type StatusMaxField = "healthy_max" | "sanity_max" | "effort_max" | "investigation_max"

type StatusConfig = {
    label: string
    icon: LucideIcon
    field: StatusField
    maxField: StatusMaxField
    gradient: string
}

type ExpertiseStats = {
    treino: number
    extra: number
    total: number
}

type ExpertiseMap = Record<string, ExpertiseStats>
type ExpertiseEditForm = Record<string, { treino: string; extra: string }>

type ExpertiseRollResult = {
    expertise: string
    attribute: string
    attribute_value: number
    dice_count: number
    dice: number[]
    treino: number
    extra: number
    bonus: number
    total: number
}

const expertiseAttributeMap: Record<string, string> = {
    acrobacias: "atrib_agility",
    adestramento: "atrib_presence",
    artes: "atrib_presence",
    atletismo: "atrib_strength",
    atualidades: "atrib_intellect",
    ciencia: "atrib_intellect",
    crime: "atrib_agility",
    diplomacia: "atrib_presence",
    enganacao: "atrib_presence",
    fortitude: "atrib_vitallity",
    furtividade: "atrib_agility",
    iniciativa: "atrib_agility",
    intimidacao: "atrib_presence",
    intuicao: "atrib_presence",
    investigacao: "atrib_intellect",
    luta: "atrib_strength",
    medicina: "atrib_intellect",
    ocultismo: "atrib_intellect",
    pilotagem: "atrib_agility",
    pontaria: "atrib_agility",
    profissao: "atrib_intellect",
    reflexos: "atrib_agility",
    religiao: "atrib_presence",
    sobrevivencia: "atrib_intellect",
    tatica: "atrib_intellect",
    tecnologia: "atrib_intellect",
    vontade: "atrib_presence",
    sociedade: "atrib_intellect",
    escutar: "atrib_presence",
    observar: "atrib_presence"
}

const expertiseAttributeOrder = [
    "atrib_agility",
    "atrib_strength",
    "atrib_vitallity",
    "atrib_intellect",
    "atrib_presence"
]

const attributeLabelMap: Record<string, string> = {
    atrib_agility: "Agilidade",
    atrib_strength: "Força",
    atrib_vitallity: "Vigor",
    atrib_intellect: "Intelecto",
    atrib_presence: "Presença"
}

const attributeKeyLabelMap: Record<string, string> = {
    agility: "Agilidade",
    intellect: "Intelecto",
    vitallity: "Vigor",
    presence: "Presença",
    strength: "Força"
}

const expertiseLabelMap: Record<string, string> = {
    acrobacias: "Acrobacias",
    adestramento: "Adestramento",
    artes: "Artes",
    atletismo: "Atletismo",
    atualidades: "Atualidades",
    ciencia: "Ci\u00eancia",
    crime: "Crime",
    diplomacia: "Diplomacia",
    enganacao: "Engana\u00e7\u00e3o",
    fortitude: "Fortitude",
    furtividade: "Furtividade",
    iniciativa: "Iniciativa",
    intimidacao: "Intimida\u00e7\u00e3o",
    intuicao: "Intui\u00e7\u00e3o",
    investigacao: "Investiga\u00e7\u00e3o",
    luta: "Luta",
    medicina: "Medicina",
    ocultismo: "Ocultismo",
    pilotagem: "Pilotagem",
    pontaria: "Pontaria",
    profissao: "Profiss\u00e3o",
    reflexos: "Reflexos",
    religiao: "Religi\u00e3o",
    sobrevivencia: "Sobreviv\u00eancia",
    tatica: "T\u00e1tica",
    tecnologia: "Tecnologia",
    vontade: "Vontade",
    sociedade: "Sociedade",
    escutar: "Escutar",
    observar: "Observar"
}

const treinoColorClass = (treino?: number, extra?: number) => {
    if ((treino ?? 0) === 0 && (extra ?? 0) > 0) return "text-sky-300"
    if (treino === 0) return "text-zinc-500"
    if (treino === 5) return "text-green-400"
    if (treino === 10) return "text-blue-700"
    if (treino === 15) return "text-orange-400"
    return "text-white"
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
    const [expertise, setExpertise] = useState<ExpertiseMap | null>(null)
    const [isRollOpen, setIsRollOpen] = useState(false)
    const [isRolling, setIsRolling] = useState(false)
    const [rollResult, setRollResult] = useState<ExpertiseRollResult | null>(null)
    const [isExpertiseEditOpen, setIsExpertiseEditOpen] = useState(false)
    const [expertiseForm, setExpertiseForm] = useState<ExpertiseEditForm | null>(null)
    const [isSavingExpertise, setIsSavingExpertise] = useState(false)
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

    useEffect(() => {
        const fetchExpertise = async () => {
            try {
                const response = await api.get(`/characters/${id}/expertise`)
                setExpertise(response.data.expertise)
            } catch (err) {
                console.error(err)
            }
        }

        if (id) {
            fetchExpertise()
        }
    }, [id])

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

    const openExpertiseEditModal = () => {
        const form: ExpertiseEditForm = {}
        Object.keys(expertiseAttributeMap).forEach((name) => {
            const stats = expertise?.[name]
            form[name] = {
                treino: String(stats?.treino ?? 0),
                extra: String(stats?.extra ?? 0)
            }
        })
        setExpertiseForm(form)
        setIsExpertiseEditOpen(true)
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

    const handleExpertiseEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        if (!name.endsWith("_treino") && !name.endsWith("_extra")) return

        const key = name.replace(/_(treino|extra)$/, "")
        const field = name.endsWith("_treino") ? "treino" : "extra"

        setExpertiseForm(prev => {
            if (!prev) return prev
            return {
                ...prev,
                [key]: {
                    ...prev[key],
                    [field]: value
                }
            }
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

    const handleExpertiseEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!character || !expertiseForm) return

        setIsSavingExpertise(true)

        const payload: Record<string, number> = {}
        Object.keys(expertiseAttributeMap).forEach((name) => {
            const current = expertiseForm[name] ?? { treino: "0", extra: "0" }
            payload[`${name}_treino`] = toNumber(current.treino, 0)
            payload[`${name}_extra`] = toNumber(current.extra, 0)
        })

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

            const nextExpertise: ExpertiseMap = {}
            Object.keys(expertiseAttributeMap).forEach((name) => {
                const current = expertiseForm[name] ?? { treino: "0", extra: "0" }
                const treino = toNumber(current.treino, 0)
                const extra = toNumber(current.extra, 0)
                nextExpertise[name] = {
                    treino,
                    extra,
                    total: treino + extra
                }
            })
            setExpertise(nextExpertise)

            setIsExpertiseEditOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao atualizar perícias")
        } finally {
            setIsSavingExpertise(false)
        }
    }

    const handleRollExpertise = async (expertiseName: string) => {
        setIsRollOpen(true)
        setIsRolling(true)
        setRollResult(null)

        try {
            const response = await api.get(
                `/characters/${character!.id}/expertise/${expertiseName}/roll`
            )
            setRollResult(response.data)
        } catch (err) {
            console.error(err)
            alert("Erro ao rolar perícia")
        } finally {
            setIsRolling(false)
        }
    }

    const handleRollAttribute = (attribute: keyof typeof attributeKeyLabelMap, value: number) => {
        const diceCount = Math.max(0, value)
        const dice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 20) + 1)
        const maxDie = dice.length ? Math.max(...dice) : 0

        setRollResult({
            expertise: attributeKeyLabelMap[attribute] ?? formatEnum(attribute),
            attribute: attributeKeyLabelMap[attribute] ?? formatEnum(attribute),
            attribute_value: value,
            dice_count: diceCount,
            dice,
            treino: 0,
            extra: 0,
            bonus: 0,
            total: maxDie
        })
        setIsRollOpen(true)
        setIsRolling(false)
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
                                    onRollAttribute={handleRollAttribute}
                                />
                            </div>
                        </div>

                        {/* Card Proficiências */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
                            <h1 className="text-blue-400 font-smalltitle text-2xl">Proficiências</h1>
                            <div className="text-zinc-300 font-text">
                                Em breve.
                            </div>
                        </div>

                        {/* Card Perícias */}
                        <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
                            <div className="relative bg-black/60 rounded-md py-2 px-4 text-center">
                                <h1 className="text-blue-400 font-smalltitle text-3xl">Perícias</h1>
                                <button
                                    type="button"
                                    onClick={openExpertiseEditModal}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded flex items-center gap-2 font-text"
                                    title="Editar perícias"
                                >
                                    <Pencil size={18} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
                                {expertiseAttributeOrder.map((attr, index) => {
                                    const items = Object.keys(expertiseAttributeMap)
                                        .filter((name) => expertiseAttributeMap[name] === attr)
                                    return (
                                        <div
                                            key={attr}
                                            className={`flex flex-col gap-2 px-3 ${index === 0 ? "" : "border-l-2 border-zinc-500"}`}
                                        >
                                            <div className="text-lg text-blue-300 font-smalltitle text-center">
                                                {attributeLabelMap[attr] ?? formatEnum(attr.replace("atrib_", ""))}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {items.map((name) => {
                                                    const stats = expertise?.[name]
                                                    return (
                                                        <div
                                                            key={name}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRollExpertise(name)}
                                                                className="flex-1 bg-zinc-900/70 border border-zinc-700 rounded p-2 text-left hover:border-blue-500 transition-colors"
                                                                title="Rolar perícia"
                                                            >
                                                                <div className="flex items-start justify-between gap-2 font-text">
                                                                    <div className="flex flex-col gap-1">
                                                                    <div className={`text-base font-sans ${treinoColorClass(stats?.treino, stats?.extra)}`}>
                                                                        {expertiseLabelMap[name] ?? formatEnum(name)}
                                                                    </div>
                                                                        <div className="text-sm text-zinc-400 flex flex-col">
                                                                            <span>Treino: {stats ? stats.treino : "-"}</span>
                                                                            <span>Extra: {stats ? stats.extra : "-"}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-base text-zinc-300 whitespace-nowrap">
                                                                        Total: +{stats ? stats.total : "-"}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                                                title="Informações da perícia"
                                                            >
                                                                <Info size={16} />
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-2 border-t border-zinc-700 pt-2 text-sm text-zinc-300 font-text flex flex-wrap gap-4 justify-center">
                                <div className="text-zinc-500">
                                    Destreinado: 0
                                </div>
                                <div className="text-green-400">
                                    Treinado: 5
                                </div>
                                <div className="text-blue-700">
                                    Veterano: 10
                                </div>
                                <div className="text-orange-400">
                                    Expert: 15
                                </div>
                                <div className="text-sky-300">
                                    Apenas Bônus
                                </div>
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

            <ExpertiseRollModal
                isOpen={isRollOpen}
                result={
                    rollResult
                        ? {
                            ...rollResult,
                            expertise: formatEnum(rollResult.expertise)
                        }
                        : null
                }
                isRolling={isRolling}
                onClose={() => setIsRollOpen(false)}
            />

            <ExpertiseEditModal
                isOpen={isExpertiseEditOpen}
                form={expertiseForm}
                isSaving={isSavingExpertise}
                expertiseAttributeOrder={expertiseAttributeOrder}
                expertiseAttributeMap={expertiseAttributeMap}
                attributeLabelMap={attributeLabelMap}
                onClose={() => setIsExpertiseEditOpen(false)}
                onChange={handleExpertiseEditChange}
                onSubmit={handleExpertiseEditSubmit}
            />
        </MainLayout>
    )
}
