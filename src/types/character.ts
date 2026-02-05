export type OriginSummary = {
    id?: number
    name: string
    description?: string
    trained_expertise?: string[]
}

export type AbilitySummary = {
    id: number
    name: string
    description: string
    ability_type: string
    requirements?: Record<string, unknown>[] | string | null
    effect: Record<string, unknown>
    is_active: boolean
    pe_cost?: number | null
    element?: string | null
    class_name?: string | null
    origin_id?: number | null
}

export type ProficiencySummary = {
    id: number
    name: string
}

export type CharacterSummary = {
    id: number
    name: string
    age: number
    character_class: string
    rank: string
    origin: string | OriginSummary | null
    abilities?: AbilitySummary[]
    proficiencies?: ProficiencySummary[]
}

export type CharacterDetails = CharacterSummary & {
    nationality: string
    avatar: string
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
    defense_passive: number
    defense_dodging: number
    defense_blocking: number
    resistance_bonus?: number
    atrib_agility: number
    atrib_intellect: number
    atrib_vitallity: number
    atrib_presence: number
    atrib_strength: number
    displacement: number
    PE_per_round: number
}


