export function formatEnum(value: unknown): string {
    if (typeof value !== "string") {
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value)
        }
        if (value && typeof value === "object") {
            const record = value as Record<string, unknown>
            if (typeof record.name === "string") return formatEnum(record.name)
            if (typeof record.label === "string") return formatEnum(record.label)
        }
        return ""
    }
    if (!value) return ""
    const accentMap: Record<string, string> = {
        class_power: "Poder de Combatente",
        paranormal: "Poder Paranormal",
        ciencia: "Ciência",
        investigacao: "Investigação",
        intuicao: "Intuição",
        religiao: "Religião",
        profissao: "Profissão",
        sobrevivencia: "Sobrevivência",
        tatica: "Tática",
        acrobacias: "Acrobacias",
        adestramento: "Adestramento",
        artes: "Artes",
        atletismo: "Atletismo",
        atualidades: "Atualidades",
        crime: "Crime",
        diplomacia: "Diplomacia",
        enganacao: "Enganação",
        fortitude: "Fortitude",
        furtividade: "Furtividade",
        iniciativa: "Iniciativa",
        intimidacao: "Intimidação",
        luta: "Luta",
        medicina: "Medicina",
        ocultismo: "Ocultismo",
        pilotagem: "Pilotagem",
        pontaria: "Pontaria",
        reflexos: "Reflexos",
        sociedade: "Sociedade",
        escutar: "Escutar",
        observar: "Observar",
        vontade: "Vontade"
    }
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_")
    if (accentMap[normalized]) return accentMap[normalized]
    return normalized
        .split("_")
        .map(word => {
            const lower = word.toLowerCase()
            if (accentMap[lower]) return accentMap[lower]
            return lower.charAt(0).toUpperCase() + lower.slice(1)
        })
        .join(" ")
}

export function reverseFormatEnum(display: string): string {
    if (typeof display !== "string") return ""
    return display
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
}
