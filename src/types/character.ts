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

export type WeaponSummary = {
    id: number
    name: string
    description: string
    category: string
    damage_formula: string
    threat_margin: number
    critical_multiplier: number
    weapon_range: string
    space: number
    proficiency_required?: string
    weapon_type?: string
}

export type ItemSummary = {
    id: number
    name: string
    description: string
    category: string
    space: number
}

export type RitualSummary = {
    id: number
    name: string
    description: string
    execution: string
    ritual_range: string
    duration: string
    description_discente: string
    description_verdadeiro: string
    element: string
    circle: number
    pe_cost_standard: number
    pe_cost_discente: number
    pe_cost_verdadeiro: number
}

export type CharacterSummary = {
    id: number
    name: string
    age: number
    character_class: string
    rank: string
    origin: string | OriginSummary | null
    healthy_points?: number
    healthy_max?: number
    sanity_points?: number
    sanity_max?: number
    effort_points?: number
    effort_max?: number
    investigation_points?: number
    investigation_max?: number
    abilities?: AbilitySummary[]
    proficiencies?: ProficiencySummary[]
    weapons?: WeaponSummary[]
    items?: ItemSummary[]
    rituals?: RitualSummary[]
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


