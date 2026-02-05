import { Brain, Heart, MessageCircleQuestionMark, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { CharacterDetails } from "./types/character"

export type StatusField =
    | "healthy_points"
    | "sanity_points"
    | "effort_points"
    | "investigation_points"

export type StatusMaxField =
    | "healthy_max"
    | "sanity_max"
    | "effort_max"
    | "investigation_max"

export type StatusConfig = {
    label: string
    icon: LucideIcon
    field: StatusField
    maxField: StatusMaxField
    gradient: string
}

export const statusConfigs: StatusConfig[] = [
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

export const expertiseAttributeMap: Record<string, string> = {
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

export const expertiseAttributeOrder = [
    "atrib_agility",
    "atrib_strength",
    "atrib_vitallity",
    "atrib_intellect",
    "atrib_presence"
]

export const attributeLabelMap: Record<string, string> = {
    atrib_agility: "Agilidade",
    atrib_strength: "Força",
    atrib_vitallity: "Vigor",
    atrib_intellect: "Intelecto",
    atrib_presence: "Presença"
}

export const attributeKeyLabelMap = {
    agility: "Agilidade",
    intellect: "Intelecto",
    vitallity: "Vigor",
    presence: "Presença",
    strength: "Força"
} as const satisfies Record<string, string>

export const expertiseLabelMap: Record<string, string> = {
    acrobacias: "Acrobacias",
    adestramento: "Adestramento",
    artes: "Artes",
    atletismo: "Atletismo",
    atualidades: "Atualidades",
    ciencia: "Ciência",
    crime: "Crime",
    diplomacia: "Diplomacia",
    enganacao: "Enganação",
    fortitude: "Fortitude",
    furtividade: "Furtividade",
    iniciativa: "Iniciativa",
    intimidacao: "Intimidação",
    intuicao: "Intuição",
    investigacao: "Investigação",
    luta: "Luta",
    medicina: "Medicina",
    ocultismo: "Ocultismo",
    pilotagem: "Pilotagem",
    pontaria: "Pontaria",
    profissao: "Profissão",
    reflexos: "Reflexos",
    religiao: "Religião",
    sobrevivencia: "Sobrevivência",
    tatica: "Tática",
    tecnologia: "Tecnologia",
    vontade: "Vontade",
    sociedade: "Sociedade",
    escutar: "Escutar",
    observar: "Observar"
}

export const treinoColorClass = (treino?: number, extra?: number) => {
    if ((treino ?? 0) === 0 && (extra ?? 0) > 0) return "text-sky-300"
    if (treino === 0) return "text-zinc-500"
    if (treino === 5) return "text-green-400"
    if (treino === 10) return "text-blue-700"
    if (treino === 15) return "text-orange-400"
    return "text-white"
}

export function getAvatarSrc(character: CharacterDetails) {
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


