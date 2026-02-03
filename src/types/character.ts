export type CharacterSummary = {
    id: number
    name: string
    age: number
    character_class: string
    rank: string
    origin: string
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
    atrib_agility: number
    atrib_intellect: number
    atrib_vitallity: number
    atrib_presence: number
    atrib_strength: number
    displacement: number
    PE_per_round: number
}
