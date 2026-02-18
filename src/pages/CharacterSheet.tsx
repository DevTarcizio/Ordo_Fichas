import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useRef } from "react"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import StatusBar from "../components/StatusBar"
import { ChevronDown, Eye, EyeOff, Info, Pencil, Plus, Trash2, X } from "lucide-react"
import { formatEnum, reverseFormatEnum } from "../utils"
import type {
    AbilitySummary,
    CharacterDetails,
    ItemSummary,
    OriginSummary,
    ProficiencySummary,
    RitualSummary,
    WeaponSummary
} from "../types/character"
import CharacterEditModal from "../components/CharacterEditModal"
import type { EditForm } from "../components/CharacterEditModal"
import StatusEditModal from "../components/StatusEditModal"
import type { StatusEditForm } from "../components/StatusEditModal"
import AttributesCard from "../components/AttributesCard"
import AttributesEditModal from "../components/AttributesEditModal"
import type { AttributesEditForm } from "../components/AttributesEditModal"
import FloatingInput from "../components/FloatingInput"
import FloatingSelect from "../components/FloatingSelect"
import ExpertiseRollModal, { type ExpertiseRollResult } from "../components/ExpertiseRollModal"
import ExpertiseEditModal from "../components/ExpertiseEditModal"
import LevelUpModal from "../components/LevelUpModal"
import LevelUpResultModal from "../components/LevelUpResultModal"
import Modal from "../components/Modal"
import {
    attributeKeyLabelMap,
    attributeLabelMap,
    expertiseAttributeMap,
    expertiseAttributeOrder,
    expertiseLabelMap,
    getAvatarSrc,
    statusConfigs,
    treinoColorClass,
    type StatusField,
    type StatusMaxField
} from "../characterSheetConfig"

type ExpertiseStats = {
    treino: number
    extra: number
    total: number
}

type ExpertiseMap = Record<string, ExpertiseStats>
type ExpertiseEditForm = Record<string, { treino: string; extra: string }>

type SpecialAttackTarget = "attack" | "damage"

type SpecialAttackOption = {
    nexMin: number
    peCost: number
    bonus: number
}

type PendingSpecialAttack = {
    bonus: number
    peCost: number
    target: SpecialAttackTarget
    label: string
}

type PendingRitualOccultismTest = {
    ritualName: string
    ritualVariant: "padrao" | "discente" | "verdadeiro"
    peCost: number
    dt: number
}

type SpecialAttackEffect = {
    options: SpecialAttackOption[]
    appliesTo: SpecialAttackTarget[]
}

type RitualCasterCircle = {
    nexMin: number
    circle: number
}

type RitualCasterEffect = {
    circles: RitualCasterCircle[]
    startingCount: number
    learnOnNexCount: number
}

const UNARMED_WEAPON_ID = -1

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function toNumber(value: string, fallback: number) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? fallback : parsed
}

function toFiniteNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
    }
    return null
}

const parseSpecialAttackEffect = (
    effect: Record<string, unknown> | null | undefined
): SpecialAttackEffect | null => {
    if (!effect || typeof effect !== "object") return null
    const rawType = (effect as Record<string, unknown>).type
    if (rawType !== "attack_or_damage_bonus") return null

    const effectRecord = effect as Record<string, unknown>
    const rawOptions = Array.isArray(effectRecord["options"])
        ? effectRecord["options"]
        : []
    const options = rawOptions
        .map((item) => {
            if (!item || typeof item !== "object") return null
            const option = item as Record<string, unknown>
            const nexMin = toFiniteNumber(option["nex_min"])
            const peCost = toFiniteNumber(option["pe_cost"])
            const bonus = toFiniteNumber(option["bonus"])
            if (nexMin === null || peCost === null || bonus === null) return null
            const adjustedNexMin =
                nexMin === 0 && bonus === 5 && peCost === 2
                    ? 5
                    : nexMin
            return { nexMin: adjustedNexMin, peCost, bonus }
        })
        .filter((option): option is SpecialAttackOption => option !== null)
        .sort((a, b) => a.nexMin - b.nexMin || a.peCost - b.peCost || a.bonus - b.bonus)

    const rawAppliesTo = Array.isArray(effectRecord["applies_to"])
        ? effectRecord["applies_to"]
        : []
    const appliesTo = rawAppliesTo.filter(
        (item): item is SpecialAttackTarget => item === "attack" || item === "damage"
    )

    return {
        options,
        appliesTo: appliesTo.length > 0 ? appliesTo : ["attack", "damage"]
    }
}

const formatSpecialAttackTarget = (target: SpecialAttackTarget) =>
    target === "attack" ? "teste de ataque" : "rolagem de dano"

const formatSignedBonus = (value: number) => {
    if (!value) return ""
    return value > 0 ? `+${value}` : String(value)
}

const mergeExtraBonus = (
    base?: { value: number; label?: string } | null,
    extra?: { value: number; label?: string } | null
) => {
    if (!extra) return base ?? undefined
    if (!base) return extra ?? undefined
    return {
        value: base.value + extra.value,
        label: [base.label, extra.label].filter(Boolean).join(" + ")
    }
}

const parseRitualCasterEffect = (
    effect: Record<string, unknown> | null | undefined
): RitualCasterEffect | null => {
    if (!effect || typeof effect !== "object") return null
    const rawType = (effect as Record<string, unknown>).type
    if (rawType !== "ritual_caster") return null
    const effectRecord = effect as Record<string, unknown>
    const rawCircles = Array.isArray(effectRecord["circles"])
        ? effectRecord["circles"]
        : []
    const circles = rawCircles
        .map((item) => {
            if (!item || typeof item !== "object") return null
            const entry = item as Record<string, unknown>
            const nexMin = toFiniteNumber(entry["nex_min"])
            const circle = toFiniteNumber(entry["circle"])
            if (nexMin === null || circle === null) return null
            return { nexMin, circle }
        })
        .filter((item): item is RitualCasterCircle => item !== null)
        .sort((a, b) => a.nexMin - b.nexMin || a.circle - b.circle)
    const startingRituals = effectRecord["starting_rituals"]
    const startingCount =
        startingRituals && typeof startingRituals === "object"
            ? toFiniteNumber((startingRituals as Record<string, unknown>)["count"]) ?? 0
            : 0
    const learnOnNex = effectRecord["learn_on_nex"]
    const learnOnNexCount =
        learnOnNex && typeof learnOnNex === "object"
            ? toFiniteNumber((learnOnNex as Record<string, unknown>)["count"]) ?? 0
            : 0
    return {
        circles,
        startingCount,
        learnOnNexCount
    }
}

const getMaxRitualCircle = (circles: RitualCasterCircle[], nexTotal: number) => {
    if (circles.length === 0) return 0
    const nexValue = Math.max(0, nexTotal)
    let maxCircle = 0
    circles.forEach((entry) => {
        if (nexValue >= entry.nexMin) {
            maxCircle = Math.max(maxCircle, entry.circle)
        }
    })
    return maxCircle
}

const applyRitualCostReduction = (
    value: number | null | undefined,
    reduction: number
) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return value
    if (!reduction) return value
    return Math.max(0, value - reduction)
}

const resistanceExpertiseSet = new Set(["fortitude", "reflexos", "vontade"])
const trilhaCertaExpertiseSet = new Set(["investigacao", "escutar", "observar"])
const primeiraImpressaoExpertiseSet = new Set([
    "diplomacia",
    "enganacao",
    "intimidacao",
    "intuicao"
])
const envoltoMisterioExpertiseSet = new Set(["enganacao", "intimidacao"])
const identificacaoParanormalExpertiseSet = new Set(["ocultismo"])

const isTacticalWeapon = (weapon: WeaponSummary) => {
    const proficiency = normalizeText(weapon.proficiency_required ?? "")
    const category = normalizeText(weapon.category ?? "")
    return (
        proficiency === "armas_taticas"
        || proficiency.includes("tatic")
        || category.includes("tatic")
        || category.includes("tactical")
    )
}

const isFirearmWeapon = (weapon: WeaponSummary) => {
    const type = normalizeText(weapon.weapon_type ?? "")
    return type === "arma_de_fogo" || type === "arma de fogo"
}

const capitalizeFirst = (value: string) => (
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value
)

const getInventoryTotalSpace = (character: CharacterDetails) => {
    const record = character as Record<string, unknown>
    const candidates = [
        "inventory_space",
        "inventorySpace",
        "inventory_capacity",
        "inventoryCapacity",
        "space_total",
        "spaceTotal",
        "space_max",
        "spaceMax",
        "carry_capacity",
        "carryCapacity",
        "space"
    ]
    for (const key of candidates) {
        const value = record[key]
        if (typeof value === "number" && Number.isFinite(value)) return value
    }
    return 0
}

const getEquipmentItems = (character: CharacterDetails) => {
    const record = character as Record<string, unknown>
    const raw =
        Array.isArray(record.equipments) ? record.equipments
        : Array.isArray(record.equipment) ? record.equipment
        : Array.isArray(record.items) ? record.items
        : []
    return raw
}

const getEquipmentLabel = (item: unknown) => {
    if (typeof item === "string") return item
    if (!item || typeof item !== "object") return null
    const record = item as Record<string, unknown>
    if (typeof record.name === "string") return record.name
    if (typeof record.label === "string") return record.label
    if (typeof record.title === "string") return record.title
    return null
}

const getEquipmentSpace = (item: unknown) => {
    if (!item || typeof item !== "object") return 0
    const record = item as Record<string, unknown>
    const value = record.space ?? record.weight ?? record.size
    return typeof value === "number" && Number.isFinite(value) ? value : 0
}

const getEquipmentId = (item: unknown, index: number) => {
    if (!item || typeof item !== "object") return `equip-${index}`
    const record = item as Record<string, unknown>
    const rawId = record.id
    if (typeof rawId === "number" || typeof rawId === "string") return rawId
    return `equip-${index}`
}

type InventorySpaceState = {
    used: number
    max: number
    available?: number
}

const getOriginName = (origin: CharacterDetails["origin"] | null | undefined) => {
    if (!origin) return ""
    if (typeof origin === "string") return origin
    if (typeof origin === "object" && typeof origin.name === "string") {
        return origin.name
    }
    return ""
}

type OriginInfoShape = OriginSummary & {
    expertise?: unknown
    expertises?: unknown
    trained_expertise?: unknown
}

const getOriginExpertise = (origin: OriginInfoShape) => {
    const raw =
        Array.isArray(origin.trained_expertise) ? origin.trained_expertise
        : Array.isArray(origin.expertise) ? origin.expertise
        : Array.isArray(origin.expertises) ? origin.expertises
        : []

    return raw.filter((item): item is string => typeof item === "string")
}

const getOriginInfo = (origin: CharacterDetails["origin"] | null | undefined): OriginSummary | null => {
    if (!origin || typeof origin === "string") return null
    const name = typeof origin.name === "string" ? origin.name : ""
    const description = typeof origin.description === "string" ? origin.description : undefined
    const trained_expertise = getOriginExpertise(origin)
    if (!name && !description && trained_expertise.length === 0) return null
    return {
        id: origin.id,
        name,
        description,
        trained_expertise
    }
}

type TrailInfo = {
    id?: number
    name: string
    description?: string
}

const getTrailInfo = (trail: unknown): TrailInfo | null => {
    if (!trail || typeof trail === "string") return null
    if (typeof trail !== "object") return null
    const record = trail as Record<string, unknown>
    const name = typeof record.name === "string" ? record.name : ""
    const description = typeof record.description === "string" ? record.description : undefined
    if (!name && !description) return null
    return {
        id: typeof record.id === "number" ? record.id : undefined,
        name,
        description
    }
}

const normalizeText = (value: string) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()

const getRequirementValue = (
    requirements: AbilitySummary["requirements"],
    reqType: string
) => {
    if (!Array.isArray(requirements)) return null
    for (const entry of requirements) {
        if (!entry || typeof entry !== "object") continue
        const record = entry as Record<string, unknown>
        if (record.type !== reqType) continue
        return record.value
    }
    return null
}

const isRitualCasterAbility = (ability?: AbilitySummary | null) => {
    if (!ability) return false
    const effectType =
        ability.effect && typeof ability.effect === "object"
            ? (ability.effect as Record<string, unknown>).type
            : null
    return effectType === "ritual_caster"
        || normalizeText(ability.name) === "escolhido pelo outro lado"
}

const isIdentificacaoParanormalName = (value: string) => {
    const normalized = normalizeText(value)
    return normalized === "identificacao paranormal" || normalized === "indentificacao paranormal"
}

const isMestreEmElementoName = (value: string) => {
    const normalized = normalizeText(value)
    return normalized === "mestre em elemento"
}

const isRitualPrediletoName = (value: string) => {
    const normalized = normalizeText(value)
    return normalized === "ritual predileto"
}

const isTatuagemRitualisticaName = (value: string) => {
    const normalized = normalizeText(value)
    return normalized === "tatuagem ritualistica"
}

const toAbilityJson = (value: unknown) => {
    if (value === null || value === undefined) return ""
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

const proficiencyDetails = [
    {
        name: "armas_simples",
        description:
            "Armas de manejo fácil, como facas, bastões e revólveres. Todos os personagens sabem usar armas simples."
    },
    {
        name: "armas_taticas",
        description:
            "Espadas, fuzis e outras armas de manejo complexo. Apenas combatentes começam o jogo sabendo usar armas táticas."
    },
    {
        name: "armas_pesadas",
        description:
            "Metralhadoras, lança-chamas e outras armas destruidoras. Nenhuma classe começa sabendo usar armas pesadas."
    },
    {
        name: "protecoes_leves",
        description:
            "O personagem pode usar proteções leves"
    },
    {
        name: "protecoes_pesadas",
        description:
            "O personagem pode usar proteções pesadas"
    }
]

const weaponRangeOptions = [
    { value: "corpo_a_corpo", label: "Corpo a corpo" },
    { value: "curto", label: "Curto" },
    { value: "medio", label: "Médio" },
    { value: "longo", label: "Longo" }
]

const weaponTypeOptions = [
    { value: "", label: "Selecione" },
    { value: "corpo_a_corpo", label: "Corpo a corpo" },
    { value: "arma_de_fogo", label: "Arma de fogo" },
    { value: "arma_de_disparo", label: "Arma de disparo" }
]

const weaponProficiencyOptions = [
    { value: "", label: "Sem proficiência" },
    { value: "armas_simples", label: "Armas simples" },
    { value: "armas_taticas", label: "Armas táticas" },
    { value: "armas_pesadas", label: "Armas pesadas" }
]

const weaponFormDefaults = {
    name: "",
    description: "",
    category: "",
    damage_formula: "",
    threat_margin: "20",
    critical_multiplier: "2",
    weapon_range: "corpo_a_corpo",
    space: "1",
    proficiency_required: "",
    weapon_type: ""
}

const itemFormDefaults = {
    name: "",
    description: "",
    category: "",
    space: "1"
}

const expertiseDescriptionMap: Partial<Record<string, string>> = {
    acrobacias:
        "Você consegue fazer proezas acrobáticas.\n\n" +
        "## Amortecer Queda (Veterano, DT 15)\n" +
        "Quando cai, você pode gastar uma reação e fazer um teste de Acrobacia para reduzir o dano. Se passar, reduz o dano da queda em 1d6, mais 1d6 para cada 5 pontos pelos quais o resultado do teste exceder a DT. Se reduzir o dano a zero, você cai de pé.\n\n" +
        "## Equilíbrio\n" +
        "Se estiver andando por superfícies precárias, você precisa fazer testes de Acrobacia para não cair. Cada ação de movimento exige um teste. Se passar, você avança metade do seu deslocamento. Se falhar, não avança. Se falhar por 5 ou mais, cai. A DT é 10 para piso escorregadio, 15 para uma superfície estreita (como o topo de um muro) e 20 para uma superfície muito estreita (como uma corda esticada). Você pode sofrer -O no teste para avançar seu deslocamento total. Quando está se equilibrando você fica desprevenido e, se sofrer dano, deve fazer um novo teste de Acrobacia; se falhar, cai.\n\n" +
        "## Escapar\n" +
        "Você pode escapar de amarras. A DT é igual ao resultado do teste de Agilidade de quem o amarrou +10 se você estiver preso por cordas, ou 30 se você estiver preso por algemas. Este uso gasta uma ação completa.\n\n" +
        "## Levantar-se Rapidamente (Treinado, DT 20)\n" +
        "Se estiver caído, você pode fazer um teste de Acrobacia para ficar de pé. Você precisa ter uma ação de movimento disponível. Se passar no teste, se levanta como uma ação livre. Se falhar, gasta sua ação de movimento, mas continua caído.\n\n" +
        "## Passar por Espaço Apertado (Treinado, DT 25)\n" +
        "Você pode se espremer por lugares estreitos, por onde apenas sua cabeça normalmente passaria. Você gasta uma ação completa e avança metade do deslocamento.\n\n" +
        "## Passar por Inimigo\n" +
        "Você pode atravessar um espaço ocupado por um inimigo como parte de seu movimento. Faça um teste de Acrobacia oposto ao teste de Acrobacia, Iniciativa ou Luta do oponente (o que for melhor). Se você passar, atravessa o espaço; se falhar, não atravessa e sua ação de movimento termina. Um espaço ocupado por um inimigo conta como terreno difícil.",
    adestramento:
        "Você sabe lidar com animais.\n\n" +
        "## Acalmar Animal (DT 25)\n" +
        "Você acalma um animal nervoso ou agressivo. Isso permite a você controlar um touro furioso ou convencer um cão de guarda a não atacá-lo. Este uso gasta uma ação completa.\n\n" +
        "## Cavalgar\n" +
        "Você pode cavalgar em animais montáveis. Montar exige uma ação de movimento, mas você pode montar como uma ação livre com um teste de Adestramento contra DT 20 (porém, se falhar por 5 ou mais, cai no chão).\n" +
        "Andar em terreno plano não exige testes, mas passar por obstáculos ou andar em terreno acidentado, sim. A DT é 15 para obstáculos pequenos ou terreno ruim (estrada esburacada) e 20 para obstáculos grandes ou terreno muito ruim (floresta à noite). Se você falhar, cai da montaria e sofre 1d6 pontos de dano. Cavalgar é parte de seu movimento e não exige uma ação.\n" +
        "Se estiver a cavalo, você pode galopar. Gaste uma ação completa e faça um teste de Adestramento. Você avança um número de quadrados de 1,5m igual ao seu deslocamento (modificado pela montaria) mais o resultado do teste. Você só pode galopar em linha reta e não pode galopar em terreno difícil.\n\n" +
        "## Manejar Animal (DT 15)\n" +
        "Você faz um animal realizar uma tarefa para a qual foi treinado. Isso permite usar Adestramento como Pilotagem para veículos de tração animal, como carroças. Este uso gasta uma ação de movimento.",
    artes:
        "Você sabe se expressar com diversas formas de arte, como música, dança, escrita, pintura, atuação e outras.\n\n" +
        "## Impressionar\n" +
        "Faça um teste de Artes oposto pelo teste de Vontade de quem você está tentando impressionar. Se você passar, recebe +2 em testes de perícia originalmente baseadas em Presença contra essa pessoa na mesma cena. Se falhar, sofre -2 nesses testes, e não pode tentar de novo na mesma cena. Se estiver tentando impressionar mais de uma pessoa, o mestre faz apenas um teste pela plateia toda, usando o melhor bônus. Este uso leva de alguns minutos (música ou dança) até algumas horas (apresentação de teatro).",
    atletismo:
        "Você pode realizar façanhas atléticas.\n\n" +
        "## Corrida\n" +
        "Gaste uma ação completa e faça um teste de Atletismo. Você avança um número de quadrados de 1,5m igual ao seu deslocamento mais o resultado do teste. Por exemplo, se você tem deslocamento 9m (6 quadrados) e tira 15 no teste, avança 21 quadrados. Você só pode correr em linha reta e não pode correr em terreno difícil. Você pode correr por um número de rodadas igual ao seu Vigor. Após isso, deve fazer um teste de Fortitude por rodada (DT 5 + 5 por teste anterior). Se falhar, fica fatigado.\n\n" +
        "## Escalar\n" +
        "Gaste uma ação de movimento e faça um teste de Atletismo. Se passar, você avança metade do seu deslocamento. Se falhar, não avança. Se falhar por 5 ou mais, você cai. A DT é 10 para superfícies com apoios para os pés e mãos (como um barranco com raízes), 15 para um portão ou árvore, 20 para um muro ou parede com reentrâncias e 25 para um muro ou parede liso (como um prédio). Você pode sofrer -1d20 no teste para avançar seu deslocamento total. Quando está escalando você fica desprevenido e, se sofrer dano, deve fazer um novo teste de Atletismo; se falhar, você cai. Se um ser adjacente a você estiver escalando e cair, você pode tentar pegá-lo. Faça um teste de Atletismo contra a DT da superfície +5. Se passar, você segura o ser. Se falhar por 5 ou mais, você também cai!\n\n" +
        "## Natação\n" +
        "Se estiver na água, você precisa gastar uma ação de movimento e fazer um teste de Atletismo por rodada para não afundar. A DT é 10 para água calma, 15 para agitada e 20 ou mais para tempestuosa. Se passar, você pode avançar metade de seu deslocamento. Se falhar, consegue boiar, mas não avançar. Se falhar por 5 ou mais, você afunda. Se quiser avançar mais, você pode gastar uma segunda ação de movimento na mesma rodada para outro teste de Atletismo. Se você estiver submerso (seja por ter falhado no teste de Atletismo, seja por ter mergulhado de propósito), deve prender a respiração. Você pode prender a respiração por um número de rodadas igual ao seu Vigor. Após isso, deve fazer um teste de Fortitude por rodada (DT 5 + 5 por teste anterior). Se falhar, se afoga (é reduzido a 0 pontos de vida) e fica morrendo (veja o Capítulo 4). Você sofre penalidade de carga em testes de natação.\n\n" +
        "## Saltar\n" +
        "Você pode pular sobre buracos ou obstáculos ou alcançar algo elevado. Para um salto longo, a DT é 5 por quadrado de 1,5m (DT 10 para 3m, 15 para 4,5m, 20 para 6m e assim por diante). Para um salto em altura, a DT é 15 por quadrado de 1,5m (30 para 3m). Você deve ter pelo menos 6m para correr e pegar impulso (sem esse espaço, a DT aumenta em +5). Saltar é parte de seu movimento e não exige uma ação."
        ,
    atualidades:
        "Você é um conhecedor de assuntos gerais, como política, esporte e entretenimento, e pode responder dúvidas relativas a esses assuntos. A DT é 15 para informações comuns, como o nome do autor de um livro, 20 para informações específicas, como a história do fundador de uma empresa, e 25 para informações quase desconhecidas, como uma lenda urbana já esquecida."
        ,
    ciencia:
        "Você estudou diversos campos científicos, como matemática, física, química e biologia, e pode responder dúvidas relativas a esses assuntos. Questões simples, como a composição química de uma substância conhecida, não exigem teste. Questões complexas, como detalhes sobre o funcionamento de um procedimento científico específico, exigem um teste contra DT 20. Por fim, questões envolvendo campos experimentais, como avaliar a capacidade de proteção de uma liga metálica recém-criada, exigem um teste contra DT 30."
        ,
    crime:
        "Você sabe exercer atividades ilícitas.\n\n" +
        "## Arrombar\n" +
        "Você abre uma fechadura trancada. A DT é 20 para fechaduras comuns (porta de um apartamento), 25 para fechaduras reforçadas (porta de uma loja) e 30 para fechaduras avançadas (cofre de um banco). Este uso gasta uma ação completa.\n\n" +
        "## Furto (DT 20)\n" +
        "Você pega um objeto de outra pessoa (ou planta um objeto nas posses dela). Gaste uma ação padrão e faça um teste de Crime. Se passar, você pega (ou coloca) o que queria. A vítima tem direito a um teste de Percepção (DT igual ao resultado de seu teste de Crime). Se passar, ela percebe sua tentativa, tenha você conseguido ou não.\n\n" +
        "## Ocultar\n" +
        "Você esconde um objeto em você mesmo. Gaste uma ação padrão e faça um teste de Crime oposto pelo teste de Percepção de qualquer um que possa vê-lo. Se uma pessoa revistar você, recebe +10 no teste de Percepção.\n\n" +
        "## Sabotar (Veterano)\n" +
        "Você desabilita um dispositivo. Uma ação simples, como desativar um alarme, tem DT 20. Uma ação complexa, como sabotar uma pistola para que exploda quando disparada, tem DT 30. Se você falhar por 5 ou mais, algo sai errado (o alarme dispara, você acha que a arma está sabotada, mas na verdade ainda funciona…). Este uso gasta 1d4+1 ações completas. Você pode sofrer uma penalidade de -O em seu teste para fazê-lo como uma ação completa.\n\n" +
        "Os usos arrombar e sabotar exigem um kit. Sem ele, você sofre -5 no teste.",
    diplomacia:
        "Você convence pessoas com lábia e argumentação.\n\n" +
        "## Acalmar (Treinado, DT 20)\n" +
        "Você estabiliza um personagem adjacente que esteja enlouquecendo, fazendo com que ele fique com Sanidade 1. A DT aumenta em +5 para cada vez que ele tiver sido acalmado na cena. Este uso gasta uma ação padrão.\n\n" +
        "## Mudar Atitude\n" +
        "Você muda a categoria de atitude de um NPC em relação a você ou a outra pessoa (veja a página 45 do livro base). Faça um teste de Diplomacia oposto pelo teste de Vontade do alvo. Se você passar, muda a atitude dele em uma categoria para cima ou para baixo, à sua escolha. Se passar por 10 ou mais, muda a atitude em até duas categorias. Se falhar por 5 ou mais, a atitude do alvo muda uma categoria na direção oposta. Este uso gasta um minuto. Você pode sofrer -2d20 no teste para fazê-lo como uma ação completa (para evitar uma briga, por exemplo). Você só pode mudar a atitude de uma mesma pessoa uma vez por dia.\n\n" +
        "## Persuasão (DT 20)\n" +
        "Você convence uma pessoa a fazer alguma coisa, como responder a uma pergunta ou prestar um favor. Se essa coisa for custosa (como emprestar um carro) você sofre -5 em seu teste. Se for perigosa (como cometer um crime) você sofre -10 ou falha automaticamente. De acordo com o mestre, seu teste pode ser oposto ao teste de Vontade da pessoa. Este uso gasta um minuto ou mais, de acordo com o mestre.",
    enganacao:
        "Você manipula pessoas com blefes e trapaças.\n\n" +
        "## Disfarce (Treinado)\n" +
        "Você muda sua aparência ou a de outra pessoa. Faça um teste de Enganação oposto pelo teste de Percepção de quem prestar atenção no disfarçado. Se você passar, a pessoa acredita no disfarce; caso contrário, percebe que há algo errado. Se o disfarce é de uma pessoa específica, aqueles que conhecem essa pessoa recebem +10 no teste de Percepção. Um disfarce exige pelo menos dez minutos e um kit. Sem ele, você sofre -5 no teste.\n\n" +
        "## Falsificação (Veterano)\n" +
        "Você falsifica um documento. Faça um teste de Enganação oposto pelo teste de Percepção de quem examinar o documento. Se você passar, a pessoa acredita que ele é válido; caso contrário, percebe que é falso. Se o documento é muito complexo, ou inclui uma assinatura ou carimbo específico, você sofre -2d20 no teste.\n\n" +
        "## Fintar (Treinado)\n" +
        "Você pode gastar uma ação padrão e fazer um teste de Enganação oposto a um teste de Reflexos de um ser em alcance curto. Se você passar, ele fica desprevenido contra seu próximo ataque, se realizado até o fim de seu próximo turno.\n\n" +
        "## Insinuação (DT 20)\n" +
        "Você fala algo para alguém sem que outras pessoas entendam do que você está falando. Se você passar, o receptor entende sua mensagem. Se falhar por 5 ou mais, entende algo diferente do que você queria. Outras pessoas podem fazer um teste de Intuição oposto ao seu teste de Enganação. Se passarem, entendem o que você está dizendo.\n\n" +
        "## Intriga (DT 20)\n" +
        "Você espalha uma fofoca. Por exemplo, pode dizer que o dono do bar está aguando a cerveja para enfurecer o povo contra ele. Intrigas muito improváveis (convencer o povo que o delegado é um ET que está abduzindo as pessoas) têm DT 30. Este uso exige pelo menos um dia, mas pode levar mais tempo, de acordo com o mestre. Uma pessoa pode investigar a fonte da fofoca e chegar até você. Isso exige um teste de Investigação por parte dela, com DT igual ao resultado do seu teste para a intriga.\n\n" +
        "## Mentir\n" +
        "Você faz uma pessoa acreditar em algo que não é verdade. Seu teste é oposto pelo teste de Intuição da vítima. Mentiras muito implausíveis impõem uma penalidade de -2d20 em seu teste (\"Por que estou com o crachá do chefe de segurança? Ora, porque ele deixou cair e estou indo devolver!\").",
    fortitude:
        "Você usa esta perícia para testes de resistência contra efeitos que exigem vitalidade, como doenças e venenos. A DT é determinada pelo efeito. Você também usa Fortitude para manter seu fôlego quando está correndo ou sem respirar. A DT é 5 +5 por teste anterior (veja a perícia Atletismo para mais detalhes)"
        ,
    furtividade:
        "Você sabe ser discreto e sorrateiro.\n\n" +
        "## Esconder-se\n" +
        "Faça um teste de Furtividade oposto pelos testes de Percepção de qualquer um que possa notá-lo. Todos que falharem não conseguem percebê-lo (você tem camuflagem total contra eles). Esconder-se é uma ação livre que você só pode fazer no final do seu turno e apenas se terminar seu turno em um lugar onde seja possível se esconder (atrás de uma porta, num quarto escuro, numa mata densa, no meio de uma multidão…). Se tiver se movido durante o turno, você sofre -1d20 no teste (você pode se mover à metade do deslocamento normal para não sofrer essa penalidade). Se tiver atacado ou feito outra ação muito chamativa, sofre -3d20.\n\n" +
        "## Seguir\n" +
        "Faça um teste de Furtividade oposto ao teste de Percepção da pessoa sendo seguida. Você sofre -5 se estiver em um lugar sem esconderijos ou sem movimento, como um descampado ou rua deserta. A vítima recebe +5 em seu teste de Percepção se estiver tomando precauções para não ser seguida (como olhar para trás de vez em quando). Se você passar, segue a pessoa até ela chegar ao seu destino. Se falhar, a pessoa o percebe na metade do caminho."
        ,
    iniciativa:
        "Esta perícia determina sua velocidade de reação. Quando uma cena de ação começa, cada ser envolvido faz um teste de Iniciativa. Eles então agem em ordem decrescente dos resultados."
        ,
    intimidacao:
        "Você pode assustar ou coagir outras pessoas. Todos os usos de Intimidação são efeitos de medo.\n\n" +
        "## Assustar (Treinado)\n" +
        "Gaste uma ação padrão e faça um teste de Intimidação oposto pelo teste de Vontade de uma pessoa em alcance curto. Se você passar, ela fica abalada pelo resto da cena (não cumulativo). Se você passar por 10 ou mais, ela fica apavorado por uma rodada e então abalada pelo resto da cena.\n\n" +
        "## Coagir\n" +
        "Faça um teste de Intimidação oposto pelo teste de Vontade de uma pessoa adjacente. Se você passar, ela obedece uma ordem sua (como fazer uma pequena tarefa, deixar que você passe por um lugar que ele estava protegendo etc.). Se você mandar a pessoa fazer algo perigoso ou que vá contra a natureza dela, ela recebe +5 no teste ou passa automaticamente. Este uso gasta um minuto ou mais, de acordo com o mestre, e deixa a pessoa hostil contra você."
        ,
    intuicao:
        "Esta perícia mede sua empatia e “sexto sentido”.\n\n" +
        "## Perceber Mentira\n" +
        "Você descobre se alguém está mentindo (veja a perícia Enganação).\n\n" +
        "## Pressentimento (Treinado, DT 20)\n" +
        "Você analisa uma pessoa, para ter uma ideia de sua índole ou caráter, ou uma situação, para perceber qualquer fato estranho (por exemplo, se os habitantes de uma cidadezinha estão agindo de forma esquisita). Este uso apenas indica se há algo anormal; para descobrir a causa, veja a perícia Investigação."
        ,
    luta:
        "Você usa Luta para fazer ataques corpo a corpo. A DT é a Defesa do alvo. Se você acertar, causa dano de acordo com a arma utilizada."
        ,
    medicina:
        "Você sabe tratar ferimentos, doenças e venenos.\n\n" +
        "## Primeiros Socorros (DT 20)\n" +
        "Um personagem adjacente que esteja morrendo e inconsciente perde essas condições e fica com 1 PV. A DT aumenta em +5 para cada vez que ele tiver sido estabilizado na cena. Este uso gasta uma ação padrão.\n\n" +
        "## Cuidados Prolongados (Veterano, DT 20)\n" +
        "Durante uma cena de interlúdio, você pode gastar uma de suas ações para tratar até um ser por ponto de Intelecto. Se passar, eles recuperam o dobro dos PV pela ação dormir neste interlúdio.\n\n" +
        "## Necropsia (Treinado, DT 20)\n" +
        "Você examina um cadáver para determinar a causa e o momento aproximado da morte. Causas raras ou extraordinárias, como um veneno exótico ou uma maldição, possuem DT +10. Este uso leva dez minutos.\n\n" +
        "## Tratamento (Treinado)\n" +
        "Você ajuda a vítima de uma doença ou veneno com efeito contínuo. Gaste uma ação completa e faça um teste contra a DT da doença ou veneno. Se você passar, o paciente recebe +5 em seu próximo teste de Fortitude contra esse efeito.\n\n" +
        "Esta perícia exige um kit. Sem ele, você sofre -5 no teste. Você pode usar a perícia Medicina em si mesmo, mas sofre -1d20 no teste."
        ,
    ocultismo:
        "Você estudou o paranormal.\n\n" +
        "## Identificar Criatura\n" +
        "Você analisa uma criatura paranormal que possa ver. A DT do teste é igual à DT para resistir à Presença Perturbadora da criatura. Se você passar, descobre uma característica da criatura, como um poder ou vulnerabilidade. Para cada 5 pontos pelos quais o resultado do teste superar a DT, você descobre outra característica. Se falhar por 5 ou mais, tira uma conclusão errada (por exemplo, acredita que uma criatura tem vulnerabilidade a Morte, quando na verdade tem vulnerabilidade a Energia). Este uso gasta uma ação completa.\n\n" +
        "## Identificar Item Amaldiçoado (DT 20)\n" +
        "Você pode gastar uma ação de interlúdio para estudar um item amaldiçoado e identificar seus poderes ou qual ritual o objeto contém. Você pode sofrer -2d20 no teste para fazê-lo como uma ação completa.\n\n" +
        "## Identificar Ritual (DT 10 +5 por círculo do ritual)\n" +
        "Quando alguém lança um ritual, você pode descobrir qual é observando seus gestos, palavras e componentes. Este uso é uma reação.\n\n" +
        "## Informação\n" +
        "Você responde dúvidas relativas ao Outro Lado, objetos amaldiçoados, fenômenos paranormais, runas, profecias etc. Questões simples não exigem teste. Questões complexas exigem um teste contra DT 20. Por fim, mistérios e enigmas exigem um teste contra DT 30."
        ,
    observar:
        "Você vê coisas discretas ou escondidas. A DT varia de 15, para coisas difíceis de serem vistas (um livro específico em uma estante) a 30, para coisas quase invisíveis (uma gota de sangue em uma folha no meio de uma floresta à noite). Para pessoas ou coisas escondidas, a DT é o resultado do teste de Furtividade ou Crime feito para esconder a pessoa ou ocultar o item. Você também pode ler lábios (DT 20)."
        ,
    escutar:
        "Você escuta barulhos sutis. Uma conversa casual próxima tem DT 0 — ou seja, a menos que exista alguma penalidade, você passa automaticamente. Ouvir pessoas sussurrando tem DT 15. Ouvir do outro lado de uma porta aumenta a DT em +5. Você pode fazer testes de Percepção para ouvir mesmo que esteja dormindo, mas sofre -2d20 no teste; um sucesso faz você acordar. Perceber seres que não possam ser vistos tem DT 20, ou +10 no teste de Furtividade do ser, o que for maior. Mesmo que você passe no teste, ainda sofre penalidades normais por lutar sem ver o inimigo."
        ,
    pilotagem:
        "Você sabe operar veículos terrestres e aquáticos, como motos, carros e lanchas. Pilotar um veículo gasta uma ação de movimento por turno. Situações comuns (dirigir em uma estrada, velejar em clima tranquilo) não exigem teste. Situações ruins (dirigir em uma estrada de chão e sem iluminação, velejar em chuva ou ventania) exigem um teste por turno contra DT 15. Situações terríveis (dirigir em terreno acidentado, velejar durante uma tempestade) exigem um teste por turno contra DT 25. Se você possuir grau de treinamento veterano nesta perícia, pode pilotar veículos aéreos, como aviões e helicópteros."
        ,
    pontaria:
        "Você usa Pontaria para fazer ataques à distância. A DT é a Defesa do alvo. Se você acertar, causa dano de acordo com a arma utilizada."
        ,
    profissao:
        "Você sabe exercer uma profissão específica, como advogado, engenheiro, jornalista ou publicitário. Converse com o mestre para definir os detalhes de sua profissão e que tipos de testes você pode fazer com ela. Por exemplo, um advogado pode fazer um teste de Profissão para argumentar com a polícia, enquanto um administrador pode usar esta perícia para investigar os documentos de uma corporação. Um personagem treinado nesta perícia possui seus próprios rendimentos ou, caso não trabalhe mais, uma reserva de capital. Isso permite que você comece cada missão com um item adicional, além daqueles fornecidos pela Ordem. O item é de categoria I se você for treinado, de categoria II se você for veterano e de categoria III se você for expert."
        ,
    reflexos:
        "Você usa esta perícia para testes de resistência contra efeitos que exigem reação rápida, como armadilhas e explosões. A DT é determina pelo efeito. Você também usa Reflexos para evitar fintas (veja Enganação)."
        ,
    religiao:
        "Você possui conhecimento sobre teologia e as diversas religiões do mundo.\n\n" +
        "## Acalmar (DT 20)\n" +
        "Você pode usar Religião como Diplomacia para acalmar um personagem que esteja enlouquecendo.\n\n" +
        "## Informação\n" +
        "Você pode responder dúvidas relativas a mitos, profecias, relíquias sagradas etc. A DT é 10 para questões simples, 20 para questões complexas e 30 para mistérios e enigmas.\n\n" +
        "## Rito (Veterano, DT 20)\n" +
        "Você realiza uma cerimônia religiosa (batizado, casamento, funeral…)."
        ,
    sobrevivencia:
        "Você pode se guiar em regiões selvagens e evitar perigos da natureza.\n\n" +
        "## Acampamento (Treinado)\n" +
        "Você pode conseguir abrigo e alimento nos ermos, caçando, pescando, colhendo frutos etc. A DT depende do tipo de terreno: 15 para campo aberto, 20 para mata fechada e 25 para regiões extremas, como desertos, pântanos ou montanhas. Regiões especialmente áridas ou estéreis e clima ruim (neve, tempestade etc.) impõem uma penalidade de -5 (cumulativa). Se passar, você e seu grupo podem usar as ações de interlúdio alimentar-se e dormir mesmo estando ao relento.\n\n" +
        "## Identificar Animal (Treinado, DT 20)\n" +
        "Com uma ação completa, você pode identificar um animal exótico. Veja a perícia Ocultismo.\n\n" +
        "## Orientar-se\n" +
        "Um personagem viajando em regiões selvagens precisa fazer um teste de Sobrevivência por dia para avançar. A DT depende do tipo de terreno (veja acima). Se passar, você avança seu deslocamento normal. Se falhar, avança metade. Se falhar por 5 ou mais, se perde e não avança pelo dia inteiro. Num grupo, um personagem deve ser escolhido como guia. Personagens treinados em Sobrevivência podem fazer testes para ajudá-lo. Entretanto, se mais de um personagem quiser fazer o teste por si só, todos deverão rolar os dados em segredo. Os jogadores devem decidir qual guia seguir antes de verem o resultado!\n\n" +
        "## Rastrear (Treinado)\n" +
        "Você pode identificar e seguir rastros. A DT varia: 15 para rastrear um grupo grande, ou um único ser em solo macio, como lama ou neve; 20 para um ser em solo comum (grama, terra); 25 para um ser em solo duro (estrada, piso de interiores). Visibilidade precária ou clima ruim (noite, chuva, neblina) impõem -O no teste. Você precisa fazer um teste por dia de perseguição. Enquanto rastreia, seu deslocamento é reduzido à metade. Se falhar, pode tentar novamente gastando mais um dia. Porém, a cada dia desde a criação dos rastros, a DT aumenta em +1."
        ,
    tatica:
        "Você recebeu educação militar.\n\n" +
        "## Analisar Terreno (DT 20)\n" +
        "Com uma ação de movimento, você pode observar o campo de batalha. Se passar, descobre uma vantagem, como cobertura, camuflagem ou terreno elevado, se houver.\n\n" +
        "## Plano de Ação (Veterano, DT 20)\n" +
        "Com uma ação padrão, você orienta um aliado em alcance médio. Se passar, fornece +5 na Iniciativa dele. Se isso fizer com que um aliado que ainda não tenha agido nesta rodada fique com uma Iniciativa maior do que a sua, ele age imediatamente após seu turno. Nas próximas rodadas, ele age de acordo com a nova ordem."
        ,
    tecnologia:
        "Você possui conhecimentos avançados de eletrônica e informática. Usos cotidianos, como mexer em um computador ou celular, não exigem treinamento nesta perícia ou testes. Esta perícia serve para usos avançados, como reprogramar um sistema de vigilância ou invadir um servidor seguro.\n\n" +
        "## Falsificação (Veterano)\n" +
        "Como o uso de Enganação, mas apenas para documentos eletrônicos.\n\n" +
        "## Hackear\n" +
        "Você invade um computador protegido. A DT é 15 para computadores pessoais, 20 para redes profissionais e 25 para grandes servidores corporativos, governamentais ou militares. Este uso gasta 1d4+1 ações completas. Você pode sofrer uma penalidade de -O em seu teste para fazê-lo como uma ação completa. Se você falhar no teste, não pode tentar novamente até ter alguma informação nova que o ajude na invasão, como um nome de usuário ou senha. Se falhar por 5 ou mais, pode ser rastreado pelos administradores do sistema que tentou invadir. Uma vez que invada o sistema, você pode fazer o que veio fazer. Para procurar uma informação específica, veja o uso localizar arquivo, abaixo. Outras ações, como alterar ou deletar arquivos, corromper ou desativar aplicativos ou bloquear o acesso de outros usuários, podem exigir novos testes de Tecnologia, a critério do mestre.\n\n" +
        "## Localizar Arquivo\n" +
        "Você procura um arquivo específico em um computador ou rede que possa acessar (se você não tiver acesso ao sistema, precisará primeiro invadi-lo; veja o uso hackear, acima). O tempo exigido e a DT do teste variam de acordo com o tamanho do sistema no qual você está pesquisando: uma ação completa e DT 15 para um computador pessoal, 1d4+1 ações completas e DT 20 para uma rede pequena e 1d6+2 ações completas e DT 25 para uma rede corporativa ou governamental. Este uso se refere apenas a localizar arquivos em sistemas privados que você não conhece. Para procurar informações públicas, na internet, use a perícia Investigação.\n\n" +
        "## Operar Dispositivo\n" +
        "Você opera um dispositivo eletrônico complexo. Isso permite que você acesse câmeras remotamente, destrave fechaduras eletrônicas, ative ou desative alarmes etc. A DT é 15 para aparelhos comuns, 20 para equipamento profissional e 25 para sistemas protegidos. Este uso gasta 1d4+1 ações completas e exige um kit. Você pode sofrer uma penalidade de -O em seu teste para fazê-lo como uma ação completa. Sem o kit, você sofre -5 nos testes de operar dispositivo."
        ,
    vontade:
        "Você usa esta perícia para testes de resistência contra efeitos que exigem determinação, como intimidação e rituais que afetam a mente. A DT é determinada pelo efeito. Você também usa Vontade para conjurar rituais em condições adversas"
        ,
    sociedade:
        "Você possui um vasto conhecimento sobre a história do mundo, tendo estudado de sua origem até os conhecimentos mais recentes. Esta perícia representa o conhecimento sobre o mundo em sua totalidade, englobando leis, sistemas de governo, línguas, períodos históricos, etc. Para efeitos mecânicos, ela pode ser utilizada como a perícia ciências, mas para assuntos que abordem ciências humanas e a linguística.\n\n" +
        "## Decifrar Idioma\n" +
        "Ao gastar uma ação de interlúdio ou uma hora, você traduz um texto escrito em outra língua que seja capaz de identificar. A DT é 15 para línguas comuns (dentre as mais faladas no mundo), 25 para línguas exóticas (dialetos específicos, ou línguas pouco utilizadas) e 35 para línguas mortas (línguas que perderam sua utilização ao longo do tempo). É possível sofrer -5 em seu teste para fazê-lo em 1 minuto. Identificar qual o idioma de um texto funciona da mesma forma, mas com a DT diminuída em 5.\n\n" +
        "## Identificar Origem\n" +
        "Você gasta uma ação padrão para identificar em que local e período de tempo um objeto foi criado ou possui características. A DT para tal, será definida pelo estado de conservação do objeto. Para objetos bem conservados, será 15, para objetos quebrados ou moderadamente deteriorados, será 25 e para objetos em estilhaços ou muito deteriorados, será 35. É possível receber +5 em seu teste ao gastar uma ação de interlúdio em vez de uma ação padrão, ou ao tentar descobrir apenas uma das informações citadas. Por fim, objetos advindos de sociedades pouco estudadas ou com uma história oculta, tem sua DT aumentada em 10."
}

const ritualExecutionOptions = [
    { value: "padrao", label: "Padrão" },
    { value: "reacao", label: "Reação" }
]

const ritualRangeOptions = [
    { value: "pessoal", label: "Pessoal" },
    { value: "toque", label: "Toque" },
    { value: "curto", label: "Curto" },
    { value: "medio", label: "Médio" },
    { value: "longo", label: "Longo" },
    { value: "extremo", label: "Extremo" },
    { value: "ilimitado", label: "Ilimitado" }
]

const ritualDurationOptions = [
    { value: "instantanea", label: "Instantânea" },
    { value: "cena", label: "Cena" },
    { value: "sustentada", label: "Sustentada" }
]

const ritualElementOptions = [
    { value: "sangue", label: "Sangue" },
    { value: "morte", label: "Morte" },
    { value: "energia", label: "Energia" },
    { value: "conhecimento", label: "Conhecimento" },
    { value: "medo", label: "Medo" },
    { value: "variavel", label: "Variável" }
]

const elementSpecialistOptions = ritualElementOptions.filter(
    (option) => option.value !== "variavel"
)
const elementSpecialistStyleMap: Record<string, { base: string; selected: string }> = {
    sangue: {
        base: "border-red-500/50 bg-red-950/30 text-red-200 hover:border-red-400",
        selected: "border-red-400 bg-red-900/40 text-red-100"
    },
    morte: {
        base: "border-zinc-700 bg-black/40 text-zinc-200 hover:border-white/30",
        selected: "border-white/60 bg-black/60 text-white"
    },
    energia: {
        base: "border-purple-500/50 bg-purple-950/30 text-purple-200 hover:border-purple-400",
        selected: "border-purple-400 bg-purple-900/40 text-purple-100"
    },
    conhecimento: {
        base: "border-yellow-400/50 bg-yellow-950/30 text-yellow-200 hover:border-yellow-300",
        selected: "border-yellow-300 bg-yellow-900/40 text-yellow-100"
    },
    medo: {
        base: "border-white/50 bg-white/10 text-white hover:border-white",
        selected: "border-white bg-white/20 text-white"
    }
}

const ritualElementStyleMap: Record<string, { card: string; badge: string }> = {
    conhecimento: {
        card: "border-yellow-400/60 bg-yellow-950/30",
        badge: "border-yellow-400/40 text-yellow-200 bg-yellow-900/30"
    },
    energia: {
        card: "border-purple-500/60 bg-purple-950/30",
        badge: "border-purple-500/40 text-purple-200 bg-purple-900/30"
    },
    morte: {
        card: "border-zinc-800/80 bg-black/60",
        badge: "border-zinc-700/70 text-zinc-200 bg-zinc-900/60"
    },
    sangue: {
        card: "border-red-500/60 bg-red-950/30",
        badge: "border-red-500/40 text-red-200 bg-red-900/30"
    },
    medo: {
        card: "border-white/40 bg-white/5",
        badge: "border-white/40 text-white bg-white/10"
    },
    variavel: {
        card: "border-zinc-500/60 bg-zinc-900/70",
        badge: "border-zinc-500/40 text-zinc-200 bg-zinc-800/50"
    },
    default: {
        card: "border-purple-500/60 bg-zinc-900/70",
        badge: "border-purple-500/40 text-purple-200 bg-purple-900/30"
    }
}

const ritualElementIconMap: Record<string, string> = {
    conhecimento: "/simbolos/elementos/conhecimento/Conhecimento.png",
    energia: "/simbolos/elementos/energia/Energia.png",
    morte: "/simbolos/elementos/morte/Morte.png",
    sangue: "/simbolos/elementos/sangue/Sangue.png",
    medo: "/simbolos/elementos/medo/Medo.png",
}

const ritualCircleOptions = [
    { value: "1", label: "1º círculo" },
    { value: "2", label: "2º círculo" },
    { value: "3", label: "3º círculo" },
    { value: "4", label: "4º círculo" }
]

const ritualFormDefaults = {
    name: "",
    description: "",
    execution: "padrao",
    ritual_range: "pessoal",
    duration: "instantanea",
    description_discente: "",
    description_verdadeiro: "",
    element: "conhecimento",
    circle: "1",
    pe_cost_discente: "0",
    pe_cost_verdadeiro: "0"
}

const ritualStandardCostByCircle: Record<number, number> = {
    1: 1,
    2: 3,
    3: 6,
    4: 10
}

const getUnarmedDamageFormula = (nexTotal: number, hasArtistaMarcial: boolean) => {
    if (!hasArtistaMarcial) return "1d4"
    if (nexTotal >= 70) return "1d10"
    if (nexTotal >= 35) return "1d8"
    return "1d6"
}

const getCriticalDamageLabel = (weapon: WeaponSummary, overrideFormula?: string) => {
    const formula = overrideFormula ?? weapon.damage_formula
    const match = formula.match(/^\s*(\d+)\s*[dD]\s*(\d+)\s*$/)
    if (!match) {
        return `${formula} x${weapon.critical_multiplier}`
    }
    const diceCount = Number(match[1])
    const diceSides = match[2]
    const multiplier = Math.max(1, Number(weapon.critical_multiplier) || 1)
    return `${diceCount * multiplier}d${diceSides}`
}

const parseDamageFormula = (formula: string) => {
    const match = formula.match(/^\s*(\d+)\s*[dD]\s*(\d+)\s*$/)
    if (!match) return null
    const diceCount = Math.max(0, Number(match[1]))
    const diceSides = Math.max(1, Number(match[2]))
    return { diceCount, diceSides }
}

const rollDice = (diceCount: number, diceSides: number) => (
    Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceSides) + 1)
)

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
    const [isWeaponRollOpen, setIsWeaponRollOpen] = useState(false)
    const [weaponRollResult, setWeaponRollResult] = useState<{
        title: string
        formula: string
        dice: number[]
        total: number
        bonus?: number
        bonusLabel?: string
        bonusParts?: { label: string; value: number }[]
        notes?: string[]
    } | null>(null)
    const [isExpertiseEditOpen, setIsExpertiseEditOpen] = useState(false)
    const [expertiseForm, setExpertiseForm] = useState<ExpertiseEditForm | null>(null)
    const [isSavingExpertise, setIsSavingExpertise] = useState(false)
    const [isLevelUpOpen, setIsLevelUpOpen] = useState(false)
    const [isLevelingUp, setIsLevelingUp] = useState(false)
    const [shouldOpenRitualAfterLevelUp, setShouldOpenRitualAfterLevelUp] = useState(false)
    const [pendingRitualOccultismTest, setPendingRitualOccultismTest] = useState<PendingRitualOccultismTest | null>(null)
    const [originInfo, setOriginInfo] = useState<OriginSummary | null>(null)
    const [isOriginInfoOpen, setIsOriginInfoOpen] = useState(false)
    const [trailInfo, setTrailInfo] = useState<TrailInfo | null>(null)
    const [isTrailInfoOpen, setIsTrailInfoOpen] = useState(false)
    const trailLookupRef = useRef<string | null>(null)
    const [selectedAbility, setSelectedAbility] = useState<AbilitySummary | null>(null)
    const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false)
    const [abilityOptions, setAbilityOptions] = useState<AbilitySummary[]>([])
    const [abilitySearch, setAbilitySearch] = useState("")
    const [isAbilityPickerOpen, setIsAbilityPickerOpen] = useState(false)
    const [isAbilityOptionsLoading, setIsAbilityOptionsLoading] = useState(false)
    const [isAddingAbility, setIsAddingAbility] = useState(false)
    const [abilityTab, setAbilityTab] = useState<"active" | "passive">("active")
    const [inventorySpace, setInventorySpace] = useState<InventorySpaceState | null>(null)
    const [isSpecialAttackModalOpen, setIsSpecialAttackModalOpen] = useState(false)
    const [specialAttackTarget, setSpecialAttackTarget] = useState<SpecialAttackTarget>("attack")
    const [specialAttackOption, setSpecialAttackOption] = useState<SpecialAttackOption | null>(null)
    const [pendingSpecialAttack, setPendingSpecialAttack] = useState<PendingSpecialAttack | null>(null)
    const [pendingDemolishingStrike, setPendingDemolishingStrike] = useState(false)
    const [opportunityToast, setOpportunityToast] = useState<string | null>(null)
    const [ritualOutcomeToast, setRitualOutcomeToast] = useState<string | null>(null)
    const [triggerHoldActive, setTriggerHoldActive] = useState(false)
    const [triggerHoldUses, setTriggerHoldUses] = useState(0)
    const [triggerHoldSpent, setTriggerHoldSpent] = useState(0)
    const [sentidoTaticoActive, setSentidoTaticoActive] = useState(false)
    const [conhecimentoAplicadoActive, setConhecimentoAplicadoActive] = useState(false)
    const [ecleticoActive, setEcleticoActive] = useState(false)
    const [isQuickHandsPromptOpen, setIsQuickHandsPromptOpen] = useState(false)
    const [isPrimeiraImpressaoPromptOpen, setIsPrimeiraImpressaoPromptOpen] = useState(false)
    const [pendingPrimeiraImpressao, setPendingPrimeiraImpressao] = useState<{
        expertiseName: string
        extraBonus?: { value: number; label?: string }
        dicePenalty: number
        options?: { successMin?: number; successLabel?: string }
    } | null>(null)
    const [isEnvoltoMisterioPromptOpen, setIsEnvoltoMisterioPromptOpen] = useState(false)
    const [pendingEnvoltoMisterio, setPendingEnvoltoMisterio] = useState<{
        expertiseName: string
        extraBonus?: { value: number; label?: string }
        dicePenalty: number
        options?: { successMin?: number; successLabel?: string }
    } | null>(null)
    const [isIdentificacaoParanormalPromptOpen, setIsIdentificacaoParanormalPromptOpen] = useState(false)
    const [pendingIdentificacaoParanormal, setPendingIdentificacaoParanormal] = useState<{
        expertiseName: string
        extraBonus?: { value: number; label?: string }
        dicePenalty: number
        options?: { successMin?: number; successLabel?: string }
    } | null>(null)
    const [trilhaCertaBonusDice, setTrilhaCertaBonusDice] = useState(0)
    const [isTrilhaCertaPromptOpen, setIsTrilhaCertaPromptOpen] = useState(false)
    const [peritoSkills, setPeritoSkills] = useState<string[]>([])
    const [peritoSkillDraft, setPeritoSkillDraft] = useState<string[]>([])
    const [isPeritoConfigOpen, setIsPeritoConfigOpen] = useState(false)
    const [isPeritoUseOpen, setIsPeritoUseOpen] = useState(false)
    const [pendingPerito, setPendingPerito] = useState<{ peCost: number; diceSides: number } | null>(null)
    const [defensiveCombatActive, setDefensiveCombatActive] = useState(false)
    const [dualWieldActive, setDualWieldActive] = useState(false)
    const [weaponOptions, setWeaponOptions] = useState<WeaponSummary[]>([])
    const [weaponSearch, setWeaponSearch] = useState("")
    const [isWeaponPickerOpen, setIsWeaponPickerOpen] = useState(false)
    const [isWeaponOptionsLoading, setIsWeaponOptionsLoading] = useState(false)
    const [isAddingWeapon, setIsAddingWeapon] = useState(false)
    const [weaponPickerMode, setWeaponPickerMode] = useState<"list" | "custom" | "edit">("list")
    const [weaponForm, setWeaponForm] = useState(() => ({ ...weaponFormDefaults }))
    const [isCreatingWeapon, setIsCreatingWeapon] = useState(false)
    const [customWeaponIds, setCustomWeaponIds] = useState<number[]>([])
    const [removingWeaponId, setRemovingWeaponId] = useState<number | null>(null)
    const [weaponToEdit, setWeaponToEdit] = useState<WeaponSummary | null>(null)
    const [expandedWeaponIds, setExpandedWeaponIds] = useState<number[]>([])
    const [isWeaponRemoveConfirmOpen, setIsWeaponRemoveConfirmOpen] = useState(false)
    const [weaponToRemove, setWeaponToRemove] = useState<WeaponSummary | null>(null)
    const [itemOptions, setItemOptions] = useState<ItemSummary[]>([])
    const [itemSearch, setItemSearch] = useState("")
    const [isItemPickerOpen, setIsItemPickerOpen] = useState(false)
    const [isItemOptionsLoading, setIsItemOptionsLoading] = useState(false)
    const [isAddingItem, setIsAddingItem] = useState(false)
    const [itemPickerMode, setItemPickerMode] = useState<"list" | "custom" | "edit">("list")
    const [itemForm, setItemForm] = useState(() => ({ ...itemFormDefaults }))
    const [isCreatingItem, setIsCreatingItem] = useState(false)
    const [itemToEdit, setItemToEdit] = useState<ItemSummary | null>(null)
    const [expandedItemIds, setExpandedItemIds] = useState<Array<string | number>>([])
    const [isItemRemoveConfirmOpen, setIsItemRemoveConfirmOpen] = useState(false)
    const [itemToRemove, setItemToRemove] = useState<ItemSummary | null>(null)
    const [removingItemId, setRemovingItemId] = useState<number | null>(null)
    const [ritualOptions, setRitualOptions] = useState<RitualSummary[]>([])
    const [ritualSearch, setRitualSearch] = useState("")
    const [isRitualPickerOpen, setIsRitualPickerOpen] = useState(false)
    const [isRitualOptionsLoading, setIsRitualOptionsLoading] = useState(false)
    const [isAddingRitual, setIsAddingRitual] = useState(false)
    const [ritualPickerMode, setRitualPickerMode] = useState<"list" | "custom" | "edit">("list")
    const [ritualPickerSource, setRitualPickerSource] = useState<"manual" | "ritual_caster">("manual")
    const [elementSpecialistChoice, setElementSpecialistChoice] = useState<string | null>(null)
    const [isElementSpecialistOpen, setIsElementSpecialistOpen] = useState(false)
    const [elementMasterChoice, setElementMasterChoice] = useState<string | null>(null)
    const [isElementMasterOpen, setIsElementMasterOpen] = useState(false)
    const [ritualPrediletoId, setRitualPrediletoId] = useState<number | null>(null)
    const [isRitualPrediletoOpen, setIsRitualPrediletoOpen] = useState(false)
    const [ritualForm, setRitualForm] = useState(() => ({ ...ritualFormDefaults }))
    const [isCreatingRitual, setIsCreatingRitual] = useState(false)
    const [expandedRitualIds, setExpandedRitualIds] = useState<number[]>([])
    const [removingRitualId, setRemovingRitualId] = useState<number | null>(null)
    const [ritualToEdit, setRitualToEdit] = useState<RitualSummary | null>(null)
    const [ritualToRemove, setRitualToRemove] = useState<RitualSummary | null>(null)
    const [isRitualRemoveConfirmOpen, setIsRitualRemoveConfirmOpen] = useState(false)
    const [isExpertiseInfoOpen, setIsExpertiseInfoOpen] = useState(false)
    const [expandedExpertiseInfo, setExpandedExpertiseInfo] = useState<string | null>(null)
    const [removingAbilityId, setRemovingAbilityId] = useState<number | null>(null)
    const [abilityToRemove, setAbilityToRemove] = useState<AbilitySummary | null>(null)
    const [isProficienciesInfoOpen, setIsProficienciesInfoOpen] = useState(false)
    const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
    const [levelUpDiff, setLevelUpDiff] = useState<{
        old: CharacterDetails
        new: CharacterDetails
    } | null>(null)
    const token = localStorage.getItem("token")

    const fetchInventorySpace = useCallback(async () => {
        if (!id) return
        try {
            const response = await api.get(`/characters/${id}/inventory-space`)
            setInventorySpace({
                used: Number(response.data?.used) || 0,
                max: Number(response.data?.max) || 0,
                available: Number(response.data?.available)
            })
        } catch (err) {
            console.error("Erro ao buscar espaço do inventário:", err)
        }
    }, [id])

    useEffect(() => {
        const fetchCharacter = async () => {
            try {
                const response = await api.get(`/characters/${id}/`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                const formattedCharacter = {
                    ...response.data,
                    origin: formatEnum(getOriginName(response.data.origin)),
                    character_class: formatEnum(response.data.character_class),
                    rank: formatEnum(response.data.rank),
                    subclass: formatEnum(response.data.subclass),
                    trail: formatEnum(response.data.trail)
                }
                setCharacter(formattedCharacter)
                setOriginInfo(getOriginInfo(response.data.origin))
                setTrailInfo(getTrailInfo(response.data.trail))
                setIsOriginInfoOpen(false)
                setIsTrailInfoOpen(false)
            } catch (err) {
                console.error(err)
                alert("Erro ao buscar personagem")
            }
        }

        fetchCharacter()
    }, [id, token])

    useEffect(() => {
        if (!character) return
        const trailKey = normalizeText(reverseFormatEnum(character.trail ?? ""))
        if (!trailKey || trailKey === "none") {
            setTrailInfo(null)
            trailLookupRef.current = trailKey || "none"
            return
        }

        const currentTrailKey = trailInfo?.name
            ? normalizeText(reverseFormatEnum(trailInfo.name))
            : ""
        if (currentTrailKey && currentTrailKey === trailKey) return
        if (trailLookupRef.current === trailKey) return

        trailLookupRef.current = trailKey
        let isMounted = true

        api.get("/trails/")
            .then((res) => {
                const list = Array.isArray(res.data?.trails)
                    ? res.data.trails
                    : Array.isArray(res.data)
                        ? res.data
                        : []
                const match = list.find(
                    (trail: Record<string, unknown>) =>
                        normalizeText(String(trail.name ?? "")) === trailKey
                )
                if (!isMounted) return
                if (match) {
                    setTrailInfo(getTrailInfo(match))
                } else {
                    setTrailInfo(null)
                }
            })
            .catch((err) => {
                console.error("Erro ao buscar trilha:", err)
            })

        return () => {
            isMounted = false
        }
    }, [character, trailInfo])

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

    useEffect(() => {
        void fetchInventorySpace()
    }, [fetchInventorySpace])

    useEffect(() => {
        if (!character) return
        void fetchInventorySpace()
    }, [character, fetchInventorySpace])

    useEffect(() => {
        if (!isAbilityPickerOpen) return
        let isMounted = true
        setIsAbilityOptionsLoading(true)
        api.get("/abilities/")
            .then((res) => {
                const list = Array.isArray(res.data?.abilities)
                    ? res.data.abilities
                    : Array.isArray(res.data)
                        ? res.data
                        : []
                if (isMounted) setAbilityOptions(list)
            })
            .catch((err) => {
                console.error(err)
                if (isMounted) setAbilityOptions([])
            })
            .finally(() => {
                if (isMounted) setIsAbilityOptionsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [isAbilityPickerOpen])

    useEffect(() => {
        if (!isWeaponPickerOpen) return
        let isMounted = true
        setIsWeaponOptionsLoading(true)
        api.get("/weapons/")
            .then((res) => {
                const list = Array.isArray(res.data?.weapons)
                    ? res.data.weapons
                    : Array.isArray(res.data)
                        ? res.data
                        : []
                if (isMounted) setWeaponOptions(list)
            })
            .catch((err) => {
                console.error(err)
                if (isMounted) setWeaponOptions([])
            })
            .finally(() => {
                if (isMounted) setIsWeaponOptionsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [isWeaponPickerOpen])

    useEffect(() => {
        if (!isItemPickerOpen) return
        let isMounted = true
        setIsItemOptionsLoading(true)
        api.get("/items/")
            .then((res) => {
                const list = Array.isArray(res.data?.items)
                    ? res.data.items
                    : Array.isArray(res.data)
                        ? res.data
                        : []
                if (isMounted) setItemOptions(list)
            })
            .catch((err) => {
                console.error(err)
                if (isMounted) setItemOptions([])
            })
            .finally(() => {
                if (isMounted) setIsItemOptionsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [isItemPickerOpen])

    useEffect(() => {
        if (!isRitualPickerOpen) return
        let isMounted = true
        setIsRitualOptionsLoading(true)
        api.get("/rituals/")
            .then((res) => {
                const list = Array.isArray(res.data?.rituals)
                    ? res.data.rituals
                    : Array.isArray(res.data)
                        ? res.data
                        : []
                if (isMounted) setRitualOptions(list)
            })
            .catch((err) => {
                console.error(err)
                if (isMounted) setRitualOptions([])
            })
            .finally(() => {
                if (isMounted) setIsRitualOptionsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [isRitualPickerOpen])

    useEffect(() => {
        if (!opportunityToast) return
        const timeoutId = window.setTimeout(() => {
            setOpportunityToast(null)
        }, 8000)
        return () => window.clearTimeout(timeoutId)
    }, [opportunityToast])

    useEffect(() => {
        if (!ritualOutcomeToast) return
        const timeoutId = window.setTimeout(() => {
            setRitualOutcomeToast(null)
        }, 8000)
        return () => window.clearTimeout(timeoutId)
    }, [ritualOutcomeToast])

    useEffect(() => {
        if (!isRollOpen && trilhaCertaBonusDice === 0) {
            setIsTrilhaCertaPromptOpen(false)
        }
    }, [isRollOpen, trilhaCertaBonusDice])

    useEffect(() => {
        if (!character) return
        const storageKey = `perito_skills_${character.id}`
        const allowedNames = Object.entries(expertise ?? {})
            .filter(([, stats]) => (stats?.treino ?? 0) > 0)
            .map(([name]) => name)
            .filter((name) => {
                const normalized = normalizeText(name)
                return normalized !== "luta" && normalized !== "pontaria"
            })
        const allowedSet = new Set(allowedNames.map((name) => normalizeText(name)))
        const raw = localStorage.getItem(storageKey)
        if (!raw) {
            setPeritoSkills([])
            return
        }
        try {
            const parsed = JSON.parse(raw)
            if (!Array.isArray(parsed)) {
                setPeritoSkills([])
                return
            }
            const resolved = parsed
                .map((name) => {
                    if (typeof name !== "string") return null
                    const normalized = normalizeText(name)
                    if (!allowedSet.has(normalized)) return null
                    const original = allowedNames.find(
                        (item) => normalizeText(item) === normalized
                    )
                    return original ?? null
                })
                .filter((name): name is string => Boolean(name))
            const unique = Array.from(new Set(resolved)).slice(0, 2)
            setPeritoSkills(unique)
        } catch {
            setPeritoSkills([])
        }
    }, [character?.id, expertise])

    useEffect(() => {
        if (!character) return
        const hasElementSpecialist = (character.abilities ?? []).some(
            (ability) => normalizeText(ability.name) === "especialista em elemento"
        )
        if (!hasElementSpecialist) {
            setElementSpecialistChoice(null)
            return
        }
        const storageKey = `element_specialist_${character.id}`
        const raw = localStorage.getItem(storageKey)
        if (!raw) {
            setElementSpecialistChoice(null)
            return
        }
        const normalized = normalizeText(raw)
        const option = elementSpecialistOptions.find(
            (item) => normalizeText(item.value) === normalized
        )
        setElementSpecialistChoice(option?.value ?? null)
    }, [character?.id, character?.abilities])

    useEffect(() => {
        if (!character) return
        const hasElementMaster = (character.abilities ?? []).some(
            (ability) => isMestreEmElementoName(ability.name)
        )
        if (!hasElementMaster) {
            setElementMasterChoice(null)
            return
        }
        const storageKey = `element_master_${character.id}`
        const raw = localStorage.getItem(storageKey)
        if (!raw) {
            setElementMasterChoice(null)
            return
        }
        const normalized = normalizeText(raw)
        const option = elementSpecialistOptions.find(
            (item) => normalizeText(item.value) === normalized
        )
        setElementMasterChoice(option?.value ?? null)
    }, [character?.id, character?.abilities])

    useEffect(() => {
        if (!character) return
        const hasRitualPredileto = (character.abilities ?? []).some(
            (ability) => isRitualPrediletoName(ability.name)
        )
        if (!hasRitualPredileto) {
            setRitualPrediletoId(null)
            return
        }
        const storageKey = `ritual_predileto_${character.id}`
        const raw = localStorage.getItem(storageKey)
        const parsed = raw ? Number(raw) : NaN
        if (!Number.isFinite(parsed)) {
            setRitualPrediletoId(null)
            return
        }
        const exists = (character.rituals ?? []).some((ritual) => ritual.id === parsed)
        setRitualPrediletoId(exists ? parsed : null)
    }, [character?.id, character?.abilities, character?.rituals])

    useEffect(() => {
        if (!pendingRitualOccultismTest || !rollResult) return
        const normalizedExpertise = normalizeText(rollResult.expertise ?? "")
        if (normalizedExpertise !== "ocultismo") return
        const { ritualName, ritualVariant, peCost, dt } = pendingRitualOccultismTest
        const total = rollResult.total ?? 0
        const difference = total - dt
        if (difference < 0) {
            const mentalDamage = peCost
            const permanentLoss = difference <= -5 ? 1 : 0
            if (mentalDamage > 0 || permanentLoss > 0) {
                applySanityChange(-mentalDamage, permanentLoss)
            }
            const variantLabel =
                ritualVariant === "discente"
                    ? "Discente"
                    : ritualVariant === "verdadeiro"
                        ? "Verdadeiro"
                        : "Padrão"
            const message = [
                `${ritualName} (${variantLabel}) falhou.`,
                mentalDamage > 0 ? `Dano mental: ${mentalDamage}.` : null,
                permanentLoss > 0 ? "Perdeu 1 Sanidade permanente." : null
            ].filter(Boolean).join(" ")
            if (message) {
                setRitualOutcomeToast(message)
            }
        }
        setPendingRitualOccultismTest(null)
    }, [pendingRitualOccultismTest, rollResult])


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

    async function updateStatusBatch(payload: Record<string, number>) {
        try {
            await api.patch(
                `/characters/${character!.id}/`,
                payload,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )
        } catch (err) {
            console.log(err)
            alert("Erro ao atualizar dados do servidor")
        }
    }

    const applySanityChange = (pointsDelta: number, permanentLoss: number) => {
        if (!character) return
        setCharacter((prev) => {
            if (!prev) return prev
            const nextMax = clamp(
                prev.sanity_max - permanentLoss,
                0,
                prev.sanity_max
            )
            const nextPoints = clamp(
                prev.sanity_points + pointsDelta,
                0,
                nextMax
            )
            const updates: Record<string, number> = {}
            if (permanentLoss > 0) {
                updates.sanity_max = nextMax
            }
            if (pointsDelta !== 0 || permanentLoss > 0) {
                updates.sanity_points = nextPoints
            }
            if (Object.keys(updates).length > 0) {
                updateStatusBatch(updates)
            }
            return {
                ...prev,
                sanity_max: nextMax,
                sanity_points: nextPoints
            }
        })
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

    const maybeUpdateOriginInfo = (
        updatedCharacter: { origin?: CharacterDetails["origin"]; trail?: unknown }
    ) => {
        if (Object.prototype.hasOwnProperty.call(updatedCharacter, "origin")) {
            if (updatedCharacter.origin === null) {
                setOriginInfo(null)
            } else if (updatedCharacter.origin && typeof updatedCharacter.origin === "object") {
                setOriginInfo(getOriginInfo(updatedCharacter.origin))
            }
        }

        if (Object.prototype.hasOwnProperty.call(updatedCharacter, "trail")) {
            const trailValue = updatedCharacter.trail
            if (trailValue === null) {
                setTrailInfo(null)
            } else if (trailValue && typeof trailValue === "object") {
                setTrailInfo(getTrailInfo(trailValue))
            } else if (typeof trailValue === "string") {
                const nextKey = normalizeText(reverseFormatEnum(trailValue))
                const currentKey = normalizeText(reverseFormatEnum(character?.trail ?? ""))
                if (nextKey && nextKey !== currentKey) {
                    setTrailInfo(null)
                }
            }
        }
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
            investigation_max: String(character.investigation_max),
            defense_passive: String(character.defense_passive),
            defense_dodging: String(character.defense_dodging),
            defense_blocking: String(character.defense_blocking)
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
            investigation_max: toNumber(statusForm.investigation_max, character.investigation_max),
            defense_passive: toNumber(statusForm.defense_passive, character.defense_passive),
            defense_dodging: toNumber(statusForm.defense_dodging, character.defense_dodging),
            defense_blocking: toNumber(statusForm.defense_blocking, character.defense_blocking)
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
                    origin: formatEnum(getOriginName(merged.origin)),
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
            maybeUpdateOriginInfo(updatedCharacter)

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
                    origin: formatEnum(getOriginName(updatedCharacter.origin ?? prev.origin)),
                    character_class: formatEnum(updatedCharacter.character_class ?? prev.character_class),
                    subclass: formatEnum(updatedCharacter.subclass ?? prev.subclass),
                    trail: formatEnum(updatedCharacter.trail ?? prev.trail),
                    rank: formatEnum(updatedCharacter.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updatedCharacter)

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
                    origin: formatEnum(getOriginName(updatedCharacter.origin ?? prev.origin)),
                    character_class: formatEnum(updatedCharacter.character_class ?? prev.character_class),
                    subclass: formatEnum(updatedCharacter.subclass ?? prev.subclass),
                    trail: formatEnum(updatedCharacter.trail ?? prev.trail),
                    rank: formatEnum(updatedCharacter.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updatedCharacter)

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

    const handleRollExpertise = async (
        expertiseName: string,
        extraBonus?: { value: number; label?: string },
        dicePenalty = 0,
        options?: {
            successMin?: number
            successLabel?: string
            extraDice?: number
            extraDiceLabel?: string
        }
    ) => {
        setIsRollOpen(true)
        setIsRolling(true)
        setRollResult(null)
        const shouldPromptTrilhaCerta =
            hasNaTrilhaCerta && trilhaCertaExpertiseSet.has(normalizeText(expertiseName))
        setIsTrilhaCertaPromptOpen(shouldPromptTrilhaCerta || trilhaCertaBonusDice > 0)

        try {
            const shouldApplyConhecimento = consumeConhecimentoAplicado(expertiseName)
            const response = await api.get(
                `/characters/${character!.id}/expertise/${expertiseName}/roll`
            )
            const baseResult = response.data as ExpertiseRollResult
            const trainedValue =
                expertise?.[expertiseName]?.treino ?? baseResult.treino ?? 0
            const isUntrained = trainedValue <= 0
            const shouldApplyEcletico = ecleticoActive && isUntrained
            const ecleticoBonus = shouldApplyEcletico ? 5 : 0
            const hackerBonus = getHackerBonusForExpertise(expertiseName)
            const peritoEligible =
                pendingPerito
                && hasPerito
                && trainedValue > 0
                && peritoSelectedSet.has(normalizeText(expertiseName))
            const peritoBonusValue = peritoEligible
                ? Math.floor(Math.random() * pendingPerito!.diceSides) + 1
                : 0
            const peritoBonusDice = peritoEligible
                ? `1d${pendingPerito!.diceSides}`
                : undefined
            if (shouldApplyEcletico) {
                setEcleticoActive(false)
            }
            if (peritoEligible) {
                setPendingPerito(null)
            }
            if (hasMaosRapidas && normalizeText(expertiseName) === "crime") {
                setIsQuickHandsPromptOpen(true)
            }
            let adjustedResult = baseResult
            if (shouldApplyConhecimento) {
                const intellectValue = Math.max(0, Number(character?.atrib_intellect ?? 0))
                const dice = Array.from(
                    { length: intellectValue },
                    () => Math.floor(Math.random() * 20) + 1
                )
                const maxDie = dice.length ? Math.max(...dice) : 0
                const bonus = baseResult.bonus ?? 0
                const attributeKey =
                    typeof baseResult.attribute === "string" && baseResult.attribute.startsWith("atrib_")
                        ? "atrib_intellect"
                        : attributeLabelMap.atrib_intellect ?? "Intelecto"
                adjustedResult = {
                    ...baseResult,
                    attribute: attributeKey,
                    attribute_value: intellectValue,
                    dice_count: dice.length,
                    dice,
                    total: maxDie + bonus
                }
            }
            if (dicePenalty > 0 && adjustedResult.dice.length > 0) {
                const remainingDice = adjustedResult.dice.length - dicePenalty
                if (remainingDice <= 0) {
                    const penaltyDice = Array.from(
                        { length: 2 },
                        () => Math.floor(Math.random() * 20) + 1
                    )
                    const worstDie = Math.min(...penaltyDice)
                    const bonus = adjustedResult.bonus ?? 0
                    adjustedResult = {
                        ...adjustedResult,
                        dice: penaltyDice,
                        dice_count: penaltyDice.length,
                        total: worstDie + bonus,
                        roll_mode: "worst"
                    }
                } else {
                    const trimmedDice = adjustedResult.dice.slice(0, Math.max(0, remainingDice))
                    const maxDie = trimmedDice.length ? Math.max(...trimmedDice) : 0
                    const bonus = adjustedResult.bonus ?? 0
                    adjustedResult = {
                        ...adjustedResult,
                        dice: trimmedDice,
                        dice_count: trimmedDice.length,
                        total: maxDie + bonus
                    }
                }
            }
            const trilhaCertaDiceToUse =
                trilhaCertaBonusDice > 0
                && trilhaCertaExpertiseSet.has(normalizeText(expertiseName))
                    ? trilhaCertaBonusDice
                    : 0
            if (trilhaCertaDiceToUse > 0) {
                const extraDice = Array.from(
                    { length: trilhaCertaDiceToUse },
                    () => Math.floor(Math.random() * 20) + 1
                )
                const combinedDice = [...adjustedResult.dice, ...extraDice]
                const rollMode = adjustedResult.roll_mode ?? "best"
                const dieValue = combinedDice.length
                    ? rollMode === "worst"
                        ? Math.min(...combinedDice)
                        : Math.max(...combinedDice)
                    : 0
                const bonus = adjustedResult.bonus ?? 0
                adjustedResult = {
                    ...adjustedResult,
                    dice: combinedDice,
                    dice_count: combinedDice.length,
                    total: dieValue + bonus,
                    trilha_certa_bonus_dice: trilhaCertaDiceToUse
                }
            }
            const extraDiceCount = Math.max(0, options?.extraDice ?? 0)
            if (extraDiceCount > 0) {
                const extraDice = Array.from(
                    { length: extraDiceCount },
                    () => Math.floor(Math.random() * 20) + 1
                )
                const combinedDice = [...adjustedResult.dice, ...extraDice]
                const rollMode = adjustedResult.roll_mode ?? "best"
                const dieValue = combinedDice.length
                    ? rollMode === "worst"
                        ? Math.min(...combinedDice)
                        : Math.max(...combinedDice)
                    : 0
                const bonus = adjustedResult.bonus ?? 0
                adjustedResult = {
                    ...adjustedResult,
                    dice: combinedDice,
                    dice_count: combinedDice.length,
                    total: dieValue + bonus,
                    primeira_impressao_bonus_dice: extraDiceCount,
                    primeira_impressao_label: options?.extraDiceLabel
                }
            }
            const combinedExtraBonus = (() => {
                const extras: { value: number; label?: string }[] = []
                if (extraBonus && Number.isFinite(extraBonus.value) && extraBonus.value !== 0) {
                    extras.push(extraBonus)
                }
                if (hackerBonus) {
                    extras.push({ value: hackerBonus, label: "Hacker" })
                }
                if (peritoBonusValue) {
                    extras.push({
                        value: peritoBonusValue,
                        label: peritoBonusDice ? `Perito (${peritoBonusDice})` : "Perito"
                    })
                }
                if (ecleticoBonus) {
                    extras.push({ value: ecleticoBonus, label: "Eclético" })
                }
                if (extras.length === 0) return null
                if (extras.length === 1) return extras[0]
                return {
                    value: extras.reduce((sum, item) => sum + item.value, 0),
                    label: extras.map((item) => item.label ?? "Bônus").join(" + ")
                }
            })()
            const successInfo = options?.successMin
                ? { success_min: options.successMin, success_label: options.successLabel }
                : {}
            const peritoInfo = peritoBonusValue
                ? { perito_bonus_value: peritoBonusValue, perito_bonus_dice: peritoBonusDice }
                : {}
            if (combinedExtraBonus && Number.isFinite(combinedExtraBonus.value) && combinedExtraBonus.value !== 0) {
                const nextBonus = (adjustedResult.bonus ?? 0) + combinedExtraBonus.value
                const nextTotal = (adjustedResult.total ?? 0) + combinedExtraBonus.value
                setRollResult({
                    ...adjustedResult,
                    ...successInfo,
                    ...peritoInfo,
                    bonus: nextBonus,
                    total: nextTotal,
                    extra_bonus: combinedExtraBonus.value,
                    extra_label: combinedExtraBonus.label
                })
            } else {
                setRollResult({
                    ...adjustedResult,
                    ...successInfo,
                    ...peritoInfo
                })
            }
        } catch (err) {
            console.error(err)
            alert("Erro ao rolar perícia")
        } finally {
            setIsRolling(false)
        }
    }

    const requestRollExpertise = (
        expertiseName: string,
        extraBonus?: { value: number; label?: string },
        dicePenalty = 0,
        options?: { successMin?: number; successLabel?: string },
        skipEnvoltoMisterio = false,
        skipIdentificacaoParanormal = false
    ) => {
        const shouldSkipIdentificacaoParanormal =
            skipIdentificacaoParanormal
            || Boolean(options?.successLabel?.toLowerCase().includes("ritual"))
        if (
            !shouldSkipIdentificacaoParanormal
            && hasIdentificacaoParanormal
            && identificacaoParanormalExpertiseSet.has(normalizeText(expertiseName))
        ) {
            setPendingIdentificacaoParanormal({
                expertiseName,
                extraBonus,
                dicePenalty,
                options
            })
            setIsIdentificacaoParanormalPromptOpen(true)
            return
        }
        if (
            !skipEnvoltoMisterio
            && hasEnvoltoMisterio
            && envoltoMisterioExpertiseSet.has(normalizeText(expertiseName))
        ) {
            setPendingEnvoltoMisterio({
                expertiseName,
                extraBonus,
                dicePenalty,
                options
            })
            setIsEnvoltoMisterioPromptOpen(true)
            return
        }
        if (
            hasPrimeiraImpressao
            && primeiraImpressaoExpertiseSet.has(normalizeText(expertiseName))
        ) {
            setPendingPrimeiraImpressao({
                expertiseName,
                extraBonus,
                dicePenalty,
                options
            })
            setIsPrimeiraImpressaoPromptOpen(true)
            return
        }
        handleRollExpertise(expertiseName, extraBonus, dicePenalty, options)
    }

    const handleRollAttribute = (attribute: keyof typeof attributeKeyLabelMap, value: number) => {
        const diceCount = Math.max(0, value)
        const dice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 20) + 1)
        const maxDie = dice.length ? Math.max(...dice) : 0

        setIsTrilhaCertaPromptOpen(false)
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

    const consumeSpecialAttack = (target: SpecialAttackTarget) => {
        const pending = pendingSpecialAttack
        if (!pending || pending.target !== target) return null
        setPendingSpecialAttack(null)
        return pending
    }

    const consumeDemolishingStrike = () => {
        if (!pendingDemolishingStrike) return false
        setPendingDemolishingStrike(false)
        return true
    }

    const consumeConhecimentoAplicado = (expertiseName: string) => {
        if (!conhecimentoAplicadoActive) return false
        const normalized = normalizeText(expertiseName)
        if (normalized === "luta" || normalized === "pontaria") return false
        setConhecimentoAplicadoActive(false)
        return true
    }

    const handleWeaponTestRoll = (weapon: WeaponSummary) => {
        const expertiseName =
            weapon.weapon_range === "corpo_a_corpo" ? "luta" : "pontaria"
        const pending = consumeSpecialAttack("attack")
        const bonusParts: { value: number; label: string }[] = []
        if (pending?.bonus) {
            bonusParts.push({
                value: pending.bonus,
                label: pending.label ?? "Ataque Especial"
            })
        }
        const extraBonus =
            bonusParts.length === 0
                ? undefined
                : bonusParts.length === 1
                    ? { value: bonusParts[0].value, label: bonusParts[0].label }
                    : {
                        value: bonusParts.reduce((sum, part) => sum + part.value, 0),
                        label: bonusParts.map((part) => part.label).join(" + ")
                    }
        const dicePenalty =
            (defensiveCombatActive ? 1 : 0) + (dualWieldActive ? 1 : 0)
        handleRollExpertise(
            expertiseName,
            extraBonus,
            dicePenalty
        )
    }

    const handleWeaponDamageRoll = (weapon: WeaponSummary, isCritical: boolean) => {
        const effectiveDamageFormula =
            weapon.id === UNARMED_WEAPON_ID
                ? getUnarmedDamageFormula(character?.nex_total ?? 0, hasArtistaMarcial)
                : weapon.damage_formula
        const parsed = parseDamageFormula(effectiveDamageFormula)
        if (!parsed) {
            alert("Formato de dano invalido. Use XdY, por exemplo: 3d6.")
            return
        }
        const pending = consumeSpecialAttack("damage")
        const demolishingStrikeUsed = consumeDemolishingStrike()
        const multiplier = isCritical
            ? Math.max(1, Number(weapon.critical_multiplier) || 1)
            : 1
        const extraDice =
            (demolishingStrikeUsed ? 2 : 0)
            + (hasGolpePesado && weapon.weapon_range === "corpo_a_corpo" ? 1 : 0)
        const diceCount = parsed.diceCount * multiplier + extraDice
        const dice = rollDice(diceCount, parsed.diceSides)
        const baseTotal = dice.reduce((sum, value) => sum + value, 0)
        const bonusParts: { label: string; value: number }[] = []
        const notes: string[] = []
        if (pending?.bonus) {
            bonusParts.push({
                label: pending.label ?? "Ataque Especial",
                value: pending.bonus
            })
        }
        if (demolishingStrikeUsed) {
            notes.push(`Golpe Demolidor: +2d${parsed.diceSides}`)
        }
        if (hasGolpePesado && weapon.weapon_range === "corpo_a_corpo") {
            notes.push(`Golpe Pesado: +1d${parsed.diceSides}`)
        }
        if (hasBalisticaAvancada && isTacticalWeapon(weapon)) {
            bonusParts.push({ label: "Balística Avançada", value: 2 })
        }
        if (hasNinjaUrbano && isTacticalWeapon(weapon) && !isFirearmWeapon(weapon)) {
            bonusParts.push({ label: "Ninja Urbano", value: 2 })
        }
        if (hasTiroCerteiro && weapon.weapon_range !== "corpo_a_corpo") {
            const agilityBonus = Number(character?.atrib_agility ?? 0)
            if (agilityBonus) {
                bonusParts.push({
                    label: "Tiro Certeiro (Agilidade)",
                    value: agilityBonus
                })
            }
        }
        const bonus = bonusParts.reduce((sum, part) => sum + part.value, 0)
        const total = baseTotal + bonus
        setWeaponRollResult({
            title: `${isCritical ? "Crítico" : "Dano"} - ${capitalizeFirst(weapon.name)}`,
            formula: `${diceCount}d${parsed.diceSides}${bonus ? `+${bonus}` : ""}`,
            dice,
            total,
            bonus: bonus || undefined,
            bonusLabel: bonusParts.length === 1 ? bonusParts[0].label : undefined,
            bonusParts: bonusParts.length > 0 ? bonusParts : undefined,
            notes: notes.length > 0 ? notes : undefined
        })
        setIsWeaponRollOpen(true)
    }

    const getWeaponTestFormula = (weapon: WeaponSummary, extraBonus = 0) => {
        const expertiseName =
            weapon.weapon_range === "corpo_a_corpo" ? "luta" : "pontaria"
        const attributeField = expertiseAttributeMap[expertiseName]
        const baseDiceCount =
            attributeField && character
                ? Number(character[attributeField as keyof CharacterDetails]) || 0
                : 0
        const dicePenalty =
            (defensiveCombatActive ? 1 : 0) + (dualWieldActive ? 1 : 0)
        const rawDiceCount = baseDiceCount - dicePenalty
        const diceCount = Math.max(0, rawDiceCount)
        const stats = expertise?.[expertiseName]
        const bonus = (stats?.treino ?? 0) + (stats?.extra ?? 0) + extraBonus
        if (rawDiceCount <= 0 && dicePenalty > 0 && baseDiceCount > 0) {
            return `-1d20${bonus > 0 ? `+${bonus}` : ""}`
        }
        if (diceCount <= 0 && bonus <= 0) return "0d20"
        return `${diceCount}d20${bonus > 0 ? `+${bonus}` : ""}`
    }

    const handleWeaponInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setWeaponForm(prev => ({ ...prev, [name]: value }))
    }

    const handleWeaponSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target
        setWeaponForm(prev => ({ ...prev, [name]: value }))
    }

    const handleWeaponTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setWeaponForm(prev => ({ ...prev, [name]: value }))
    }

    const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setItemForm(prev => ({ ...prev, [name]: value }))
    }

    const handleItemTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setItemForm(prev => ({ ...prev, [name]: value }))
    }

    const handleRitualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setRitualForm(prev => ({ ...prev, [name]: value }))
    }

    const handleRitualSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target
        setRitualForm(prev => ({ ...prev, [name]: value }))
    }

    const handleRitualTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setRitualForm(prev => ({ ...prev, [name]: value }))
    }

    const openRitualEdit = (ritual: RitualSummary) => {
        const standard = ritualStandardCostByCircle[ritual.circle] ?? 0
        setRitualToEdit(ritual)
        setRitualPickerSource("manual")
        setRitualForm({
            name: ritual.name ?? "",
            description: ritual.description ?? "",
            execution: ritual.execution ?? "padrao",
            ritual_range: ritual.ritual_range ?? "pessoal",
            duration: ritual.duration ?? "instantanea",
            description_discente: ritual.description_discente ?? "",
            description_verdadeiro: ritual.description_verdadeiro ?? "",
            element: ritual.element ?? "conhecimento",
            circle: String(ritual.circle ?? 1),
            pe_cost_discente: String(Math.max(0, (ritual.pe_cost_discente ?? 0) - standard)),
            pe_cost_verdadeiro: String(Math.max(0, (ritual.pe_cost_verdadeiro ?? 0) - standard))
        })
        setRitualPickerMode("edit")
        setIsRitualPickerOpen(true)
    }

    const openRitualPicker = (source: "manual" | "ritual_caster" = "manual") => {
        setRitualPickerSource(source)
        setRitualPickerMode("list")
        setRitualSearch("")
        setRitualToEdit(null)
        setIsRitualPickerOpen(true)
    }

    const openWeaponEdit = (weapon: WeaponSummary) => {
        if (weapon.id === UNARMED_WEAPON_ID) return
        setWeaponToEdit(weapon)
        setWeaponForm({
            name: weapon.name ?? "",
            description: weapon.description ?? "",
            category: weapon.category ?? "",
            damage_formula: weapon.damage_formula ?? "",
            threat_margin: String(weapon.threat_margin ?? 20),
            critical_multiplier: String(weapon.critical_multiplier ?? 2),
            weapon_range: weapon.weapon_range ?? "corpo_a_corpo",
            space: String(weapon.space ?? 1),
            proficiency_required: weapon.proficiency_required ?? "",
            weapon_type: weapon.weapon_type ?? ""
        })
        setWeaponPickerMode("edit")
        setIsWeaponPickerOpen(true)
    }

    const openItemEdit = (item: ItemSummary) => {
        setItemToEdit(item)
        setItemForm({
            name: item.name ?? "",
            description: item.description ?? "",
            category: item.category ?? "",
            space: String(item.space ?? 1)
        })
        setItemPickerMode("edit")
        setIsItemPickerOpen(true)
    }

    const handleAddAbility = async (ability: AbilitySummary) => {
        if (!character) return
        setIsAddingAbility(true)
        try {
            const response = await api.post(
                `/characters/${character.id}/abilities/${ability.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            setIsAbilityPickerOpen(false)
            setAbilitySearch("")
            if (normalizeText(ability.name) === "perito") {
                openPeritoConfig()
            }
            if (isRitualCasterAbility(ability)) {
                openRitualPicker("ritual_caster")
            }
            if (normalizeText(ability.name) === "especialista em elemento") {
                if (!elementSpecialistChoice) {
                    setIsElementSpecialistOpen(true)
                }
            }
            if (isMestreEmElementoName(ability.name)) {
                if (!elementMasterChoice) {
                    setIsElementMasterOpen(true)
                }
            }
            if (isRitualPrediletoName(ability.name)) {
                if (!ritualPrediletoId) {
                    setIsRitualPrediletoOpen(true)
                }
            }
        } catch (err) {
            console.error(err)
            alert("Erro ao adicionar habilidade")
        } finally {
            setIsAddingAbility(false)
        }
    }

    const handleUpdateWeapon = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!weaponToEdit) return
        setIsCreatingWeapon(true)
        try {
            const payload = {
                name: weaponForm.name.trim(),
                description: weaponForm.description.trim(),
                category: weaponForm.category.trim(),
                damage_formula: weaponForm.damage_formula.trim(),
                threat_margin: Number(weaponForm.threat_margin),
                critical_multiplier: Number(weaponForm.critical_multiplier),
                weapon_range: weaponForm.weapon_range,
                space: Number(weaponForm.space),
                ...(weaponForm.proficiency_required
                    ? { proficiency_required: weaponForm.proficiency_required }
                    : {}),
                ...(weaponForm.weapon_type ? { weapon_type: weaponForm.weapon_type } : {})
            }
            const response = await api.patch(`/weapons/${weaponToEdit.id}`, payload)
            const updatedWeapon = response.data as WeaponSummary

            setWeaponOptions(prev =>
                prev
                    .map((item) => (item.id === updatedWeapon.id ? updatedWeapon : item))
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            )
            setCharacter(prev => {
                if (!prev) return prev
                const nextWeapons = (prev.weapons ?? []).map((item) =>
                    item.id === updatedWeapon.id ? updatedWeapon : item
                )
                return { ...prev, weapons: nextWeapons }
            })
            setWeaponToEdit(null)
            setWeaponForm({ ...weaponFormDefaults })
            setWeaponSearch("")
            setWeaponPickerMode("list")
            setIsWeaponPickerOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao editar arma")
        } finally {
            setIsCreatingWeapon(false)
        }
    }

    const handleCreateWeapon = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!character) return
        setIsCreatingWeapon(true)
        try {
            const payload = {
                name: weaponForm.name.trim(),
                description: weaponForm.description.trim(),
                category: weaponForm.category.trim(),
                damage_formula: weaponForm.damage_formula.trim(),
                threat_margin: Number(weaponForm.threat_margin),
                critical_multiplier: Number(weaponForm.critical_multiplier),
                weapon_range: weaponForm.weapon_range,
                space: Number(weaponForm.space),
                ...(weaponForm.proficiency_required
                    ? { proficiency_required: weaponForm.proficiency_required }
                    : {}),
                ...(weaponForm.weapon_type ? { weapon_type: weaponForm.weapon_type } : {})
            }

            const createdResponse = await api.post("/weapons/", payload)
            const createdWeapon = createdResponse.data as WeaponSummary
            setWeaponOptions(prev =>
                [...prev, createdWeapon].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            )
            setCustomWeaponIds(prev =>
                prev.includes(createdWeapon.id) ? prev : [...prev, createdWeapon.id]
            )

            const response = await api.post(
                `/characters/${character.id}/weapons/${createdWeapon.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            setWeaponForm({ ...weaponFormDefaults })
            setWeaponSearch("")
            setWeaponPickerMode("list")
            setIsWeaponPickerOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao criar arma personalizada")
        } finally {
            setIsCreatingWeapon(false)
        }
    }

    const handleCreateItem = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!character) return
        setIsCreatingItem(true)
        try {
            const payload = {
                name: itemForm.name.trim(),
                description: itemForm.description.trim(),
                category: itemForm.category.trim(),
                space: Number(itemForm.space)
            }

            const createdResponse = await api.post("/items/", payload)
            const createdItem = createdResponse.data as ItemSummary
            setItemOptions(prev =>
                [...prev, createdItem].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            )

            const response = await api.post(
                `/characters/${character.id}/items/${createdItem.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            setItemForm({ ...itemFormDefaults })
            setItemSearch("")
            setItemPickerMode("list")
            setIsItemPickerOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao criar item personalizado")
        } finally {
            setIsCreatingItem(false)
        }
    }

    const handleUpdateItem = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!itemToEdit) return
        setIsCreatingItem(true)
        try {
            const payload = {
                name: itemForm.name.trim(),
                description: itemForm.description.trim(),
                category: itemForm.category.trim(),
                space: Number(itemForm.space)
            }
            const response = await api.patch(`/items/${itemToEdit.id}`, payload)
            const updatedItem = response.data as ItemSummary
            setItemOptions(prev =>
                prev
                    .map((entry) => (entry.id === updatedItem.id ? updatedItem : entry))
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            )
            setCharacter(prev => {
                if (!prev) return prev
                const nextItems = (prev.items ?? []).map((entry) =>
                    entry.id === updatedItem.id ? updatedItem : entry
                )
                return { ...prev, items: nextItems }
            })
            setItemToEdit(null)
            setItemForm({ ...itemFormDefaults })
            setItemSearch("")
            setItemPickerMode("list")
            setIsItemPickerOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao editar item")
        } finally {
            setIsCreatingItem(false)
        }
    }

    const handleAddWeapon = async (weapon: WeaponSummary) => {
        if (!character) return
        setIsAddingWeapon(true)
        try {
            const response = await api.post(
                `/characters/${character.id}/weapons/${weapon.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            setIsWeaponPickerOpen(false)
            setWeaponSearch("")
        } catch (err) {
            console.error(err)
            alert("Erro ao adicionar arma")
        } finally {
            setIsAddingWeapon(false)
        }
    }

    const handleAddItem = async (item: ItemSummary) => {
        if (!character) return
        setIsAddingItem(true)
        try {
            const response = await api.post(
                `/characters/${character.id}/items/${item.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            setIsItemPickerOpen(false)
            setItemSearch("")
        } catch (err) {
            console.error(err)
            alert("Erro ao adicionar item")
        } finally {
            setIsAddingItem(false)
        }
    }

    const handleRemoveWeapon = async (weapon: WeaponSummary) => {
        if (!character) return
        if (weapon.id === UNARMED_WEAPON_ID) return
        setRemovingWeaponId(weapon.id)
        try {
            const response = await api.delete(
                `/characters/${character.id}/weapons/${weapon.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
        } catch (err) {
            console.error(err)
            alert("Erro ao remover arma")
        } finally {
            setRemovingWeaponId(null)
        }
    }

    const handleRemoveItem = async (item: ItemSummary) => {
        if (!character) return
        setRemovingItemId(item.id)
        try {
            const response = await api.delete(
                `/characters/${character.id}/items/${item.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
        } catch (err) {
            console.error(err)
            alert("Erro ao remover item")
        } finally {
            setRemovingItemId(null)
        }
    }

    const handleCreateRitual = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!character) return
        const ritualCircle = toNumber(ritualForm.circle, 1)
        if (hasRitualCaster && ritualCircle > ritualCasterMaxCircle) {
            alert(
                `Escolhido Pelo Outro Lado: círculo máximo ${ritualCasterMaxCircle} (NEX ${character.nex_total}%).`
            )
            return
        }
        setIsCreatingRitual(true)
        try {
            const payload = {
                name: ritualForm.name.trim(),
                description: ritualForm.description.trim(),
                execution: ritualForm.execution,
                ritual_range: ritualForm.ritual_range,
                duration: ritualForm.duration,
                description_discente: ritualForm.description_discente.trim(),
                description_verdadeiro: ritualForm.description_verdadeiro.trim(),
                element: ritualForm.element,
                circle: ritualCircle,
                pe_cost_discente: Number(ritualForm.pe_cost_discente),
                pe_cost_verdadeiro: Number(ritualForm.pe_cost_verdadeiro)
            }

            const createdResponse = await api.post("/rituals/", payload)
            const createdRitual = createdResponse.data as RitualSummary
            setRitualOptions(prev =>
                [...prev, createdRitual].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            )

            const response = await api.post(
                `/characters/${character.id}/rituals/${createdRitual.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            setRitualForm({ ...ritualFormDefaults })
            setRitualSearch("")
            setRitualPickerMode("list")
            setIsRitualPickerOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao criar ritual")
        } finally {
            setIsCreatingRitual(false)
        }
    }

    const handleUpdateRitual = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!character || !ritualToEdit) return
        const ritualCircle = toNumber(ritualForm.circle, ritualToEdit.circle ?? 1)
        const isSameCircle = ritualCircle === (ritualToEdit.circle ?? ritualCircle)
        if (hasRitualCaster && ritualCircle > ritualCasterMaxCircle && !isSameCircle) {
            alert(
                `Escolhido Pelo Outro Lado: círculo máximo ${ritualCasterMaxCircle} (NEX ${character.nex_total}%).`
            )
            return
        }
        setIsCreatingRitual(true)
        try {
            const payload = {
                name: ritualForm.name.trim(),
                description: ritualForm.description.trim(),
                execution: ritualForm.execution,
                ritual_range: ritualForm.ritual_range,
                duration: ritualForm.duration,
                description_discente: ritualForm.description_discente.trim(),
                description_verdadeiro: ritualForm.description_verdadeiro.trim(),
                element: ritualForm.element,
                circle: ritualCircle,
                pe_cost_discente: Number(ritualForm.pe_cost_discente),
                pe_cost_verdadeiro: Number(ritualForm.pe_cost_verdadeiro)
            }

            const response = await api.patch(
                `/characters/${character.id}/rituals/${ritualToEdit.id}`,
                payload
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            const updatedRitual = Array.isArray(updated?.rituals)
                ? (updated.rituals as RitualSummary[]).find(
                    (item) => item.id === ritualToEdit.id
                )
                : null
            if (updatedRitual) {
                setRitualOptions(prev =>
                    prev
                        .map((item) => (item.id === updatedRitual.id ? updatedRitual : item))
                        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                )
            }
            setRitualToEdit(null)
            setRitualForm({ ...ritualFormDefaults })
            setRitualSearch("")
            setRitualPickerMode("list")
            setIsRitualPickerOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao editar ritual")
        } finally {
            setIsCreatingRitual(false)
        }
    }

    const handleAddRitual = async (ritual: RitualSummary) => {
        if (!character) return
        if (hasRitualCaster && ritual.circle > ritualCasterMaxCircle) {
            alert(
                `Escolhido Pelo Outro Lado: círculo máximo ${ritualCasterMaxCircle} (NEX ${character.nex_total}%).`
            )
            return
        }
        setIsAddingRitual(true)
        try {
            const response = await api.post(
                `/characters/${character.id}/rituals/${ritual.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            setIsRitualPickerOpen(false)
            setRitualSearch("")
        } catch (err) {
            console.error(err)
            alert("Erro ao adicionar ritual")
        } finally {
            setIsAddingRitual(false)
        }
    }

    const handleRemoveRitual = async (ritual: RitualSummary) => {
        if (!character) return
        setRemovingRitualId(ritual.id)
        try {
            const response = await api.delete(
                `/characters/${character.id}/rituals/${ritual.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
        } catch (err) {
            console.error(err)
            alert("Erro ao remover ritual")
        } finally {
            setRemovingRitualId(null)
        }
    }

    const handleRemoveAbility = async (ability: AbilitySummary) => {
        if (!character) return
        if (originInfo?.id != null && ability.origin_id === originInfo.id) {
            alert("Não é possível remover a habilidade de origem.")
            return
        }
        setRemovingAbilityId(ability.id)
        try {
            const response = await api.delete(
                `/characters/${character.id}/abilities/${ability.id}`
            )
            const updated = response.data
            setCharacter(prev => {
                if (!prev) return prev
                const merged = {
                    ...prev,
                    ...updated,
                    origin: formatEnum(getOriginName(updated.origin ?? prev.origin)),
                    character_class: formatEnum(updated.character_class ?? prev.character_class),
                    subclass: formatEnum(updated.subclass ?? prev.subclass),
                    trail: formatEnum(updated.trail ?? prev.trail),
                    rank: formatEnum(updated.rank ?? prev.rank)
                }
                return merged
            })
            maybeUpdateOriginInfo(updated)
            const effectType =
                ability.effect && typeof ability.effect === "object"
                    ? (ability.effect as Record<string, unknown>).type
                    : null
            if (effectType === "attack_or_damage_bonus" || normalizeText(ability.name) === "ataque especial") {
                setPendingSpecialAttack(null)
            }
            if (normalizeText(ability.name) === "golpe demolidor") {
                setPendingDemolishingStrike(false)
            }
            if (normalizeText(ability.name) === "segurar gatilho") {
                setTriggerHoldActive(false)
                setTriggerHoldUses(0)
                setTriggerHoldSpent(0)
            }
            if (normalizeText(ability.name) === "sentido tatico") {
                setSentidoTaticoActive(false)
            }
            if (normalizeText(ability.name) === "conhecimento aplicado") {
                setConhecimentoAplicadoActive(false)
            }
            if (normalizeText(ability.name) === "ecletico") {
                setEcleticoActive(false)
            }
            if (normalizeText(ability.name) === "na trilha certa") {
                setTrilhaCertaBonusDice(0)
                setIsTrilhaCertaPromptOpen(false)
            }
            if (normalizeText(ability.name) === "perito") {
                setPendingPerito(null)
                setPeritoSkills([])
                setPeritoSkillDraft([])
                localStorage.removeItem(peritoStorageKey)
            }
            if (normalizeText(ability.name) === "primeira impressao") {
                setPendingPrimeiraImpressao(null)
                setIsPrimeiraImpressaoPromptOpen(false)
            }
            if (isIdentificacaoParanormalName(ability.name)) {
                setPendingIdentificacaoParanormal(null)
                setIsIdentificacaoParanormalPromptOpen(false)
            }
            if (normalizeText(ability.name) === "especialista em elemento") {
                setElementSpecialistChoice(null)
                setIsElementSpecialistOpen(false)
                localStorage.removeItem(elementSpecialistStorageKey)
            }
            if (isMestreEmElementoName(ability.name)) {
                setElementMasterChoice(null)
                setIsElementMasterOpen(false)
                localStorage.removeItem(elementMasterStorageKey)
            }
            if (isRitualPrediletoName(ability.name)) {
                setRitualPrediletoId(null)
                setIsRitualPrediletoOpen(false)
                localStorage.removeItem(ritualPrediletoStorageKey)
            }
        } catch (err) {
            console.error(err)
            alert("Erro ao remover habilidade")
        } finally {
            setRemovingAbilityId(null)
        }
    }

    const handleOpenLevelUp = () => {
        if (!character) return

        if (character.nex_total >= 100) {
            alert("Nex Máximo Atingido")
            return
        }

        setIsLevelUpOpen(true)
    }

    const handleConfirmLevelUp = async (type: "class" | "subclass") => {
        if (!character) return

        setIsLevelingUp(true)

        const oldCharacter = structuredClone(character)

        const payload = type === "class" ? {
            nex_total: character.nex_total + 5,
            nex_class: character.nex_class + 5
        } : {
            nex_total: character.nex_total + 5,
            nex_subclass: character.nex_subclass + 5
        }

        try {
            const response = await api.patch(
                `characters/${character.id}/`,
                payload,
                {
                    headers: {Authorization: `Bearer ${token}`}
                }
            )

            const updated = response.data

            const newCharacter = {
                ...oldCharacter,
                ...updated,
                origin: formatEnum(getOriginName(updated.origin ?? oldCharacter.origin)),
                character_class: formatEnum(updated.character_class ?? oldCharacter.character_class),
                subclass: formatEnum(updated.subclass ?? oldCharacter.subclass),
                trail: formatEnum(updated.trail ?? oldCharacter.trail),
                rank: formatEnum(updated.rank ?? oldCharacter.rank)
            }

            setCharacter(newCharacter)
            maybeUpdateOriginInfo(updated)

            setLevelUpDiff({
                old: oldCharacter,
                new: newCharacter
            })

            const shouldOpenRitualPicker = (newCharacter.abilities ?? []).some(isRitualCasterAbility)
            setShouldOpenRitualAfterLevelUp(shouldOpenRitualPicker)

            setIsLevelUpOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao subir de nivel")
        } finally {
            setIsLevelingUp(false)
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
                    origin: formatEnum(getOriginName(updatedCharacter.origin ?? prev.origin)),
                    character_class: formatEnum(updatedCharacter.character_class ?? prev.character_class),
                    subclass: formatEnum(updatedCharacter.subclass ?? prev.subclass),
                    trail: formatEnum(updatedCharacter.trail ?? prev.trail),
                    rank: formatEnum(updatedCharacter.rank ?? payload.rank)
                }

                return merged
            })
            maybeUpdateOriginInfo(updatedCharacter)

            setIsEditOpen(false)
        } catch (err) {
            console.error(err)
            alert("Erro ao atualizar personagem")
        } finally {
            setIsSaving(false)
        }
    }

    const originDescription = originInfo?.description?.trim()
    const originExpertiseLabels = Array.from(
        new Set(
            (originInfo?.trained_expertise ?? []).map((name) => {
                const key = name.trim().toLowerCase()
                return expertiseLabelMap[key] ?? formatEnum(key)
            })
        )
    )
    const trailDescription = trailInfo?.description?.trim()

    if (!character) {
        return (
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center text-white">
                    Carregando Ficha...
                </div>
            </MainLayout>
        )
    }

    const originLabel =
        typeof character.origin === "string"
            ? character.origin
            : formatEnum(getOriginName(character.origin))
    const trailLabel = character.trail || "Sem trilha"
    const abilities = (character.abilities ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    )
    const originAbilityLabels = originInfo?.id != null
        ? Array.from(
            new Set(
                abilities
                    .filter((ability) => ability.origin_id === originInfo.id)
                    .map((ability) => ability.name)
            )
        ).sort((a, b) => a.localeCompare(b, "pt-BR"))
        : []
    const trailKey = normalizeText(reverseFormatEnum(trailInfo?.name ?? character.trail ?? ""))
    const trailAbilityDetails =
        trailKey && trailKey !== "none"
            ? abilities
                .filter((ability) => ability.ability_type === "trail_power")
                .filter((ability) => {
                    const requirement = getRequirementValue(ability.requirements, "trail")
                    if (requirement === null || requirement === undefined) return true
                    const requirementKey = normalizeText(reverseFormatEnum(String(requirement)))
                    return requirementKey === trailKey
                })
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            : []
    const proficiencies = (character.proficiencies ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    )
    const hasBalisticaAvancada = abilities.some(
        (ability) => normalizeText(ability.name) === "balistica avancada"
    )
    const hasNinjaUrbano = abilities.some(
        (ability) => normalizeText(ability.name) === "ninja urbano"
    )
    const normalizedProficiencyNames = new Set(
        proficiencies.map((proficiency) => normalizeText(proficiency.name))
    )
    const extraProficiencies: ProficiencySummary[] = []
    let hasTacticalProficiency = normalizedProficiencyNames.has("armas_taticas")
    if (hasBalisticaAvancada && !hasTacticalProficiency) {
        extraProficiencies.push({ id: -100, name: "armas_taticas" })
        hasTacticalProficiency = true
    }
    if (hasNinjaUrbano && !hasTacticalProficiency) {
        extraProficiencies.push({ id: -101, name: "armas_taticas" })
        hasTacticalProficiency = true
    }
    const displayProficiencies = [...proficiencies, ...extraProficiencies].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    )
    const baseWeapons = (character.weapons ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    )
    const unarmedWeapon: WeaponSummary = {
        id: UNARMED_WEAPON_ID,
        name: "Desarmado",
        description: "Ataque desarmado.",
        category: "desarmado",
        damage_formula: "1d4",
        threat_margin: 20,
        critical_multiplier: 2,
        weapon_range: "corpo_a_corpo",
        space: 0,
        weapon_type: "corpo_a_corpo"
    }
    const weapons = [unarmedWeapon, ...baseWeapons]
    const equipmentItems = getEquipmentItems(character)
    const equipmentEntries = equipmentItems
        .map((item, index) => {
            const name = getEquipmentLabel(item)
            if (!name) return null
            const record = item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : null
            const category = record && typeof record.category === "string" ? record.category : undefined
            const description = record && typeof record.description === "string" ? record.description : undefined
            return {
                id: getEquipmentId(item, index),
                name,
                space: getEquipmentSpace(item),
                category,
                description
            }
        })
        .filter((entry): entry is {
            id: string | number
            name: string
            space: number
            category?: string
            description?: string
        } => entry !== null)
    const weaponsSpaceUsed = weapons.reduce((sum, weapon) => sum + (Number(weapon.space) || 0), 0)
    const equipmentSpaceUsed = equipmentEntries.reduce((sum, item) => sum + item.space, 0)
    const inventorySpaceUsed = inventorySpace?.used ?? (weaponsSpaceUsed + equipmentSpaceUsed)
    const inventorySpaceTotal = inventorySpace?.max ?? getInventoryTotalSpace(character)
    const inventorySpaceLabel = inventorySpaceTotal > 0 ? inventorySpaceTotal : "--"
    const rituals = (character.rituals ?? []).slice().sort((a, b) =>
        a.circle - b.circle || a.name.localeCompare(b.name, "pt-BR")
    )
    const trainedExpertise = new Set(
        Object.entries(expertise ?? {})
            .filter(([, stats]) => (stats?.treino ?? 0) > 0)
            .map(([name]) => name)
    )
    const abilityNameSet = new Set(abilities.map((ability) => normalizeText(ability.name)))
    const baseResistanceBonus = character.resistance_bonus ?? 0
    const assignedAbilityIds = new Set(abilities.map((ability) => ability.id))
    const assignedWeaponIds = new Set(baseWeapons.map((weapon) => weapon.id))
    const assignedItemIds = new Set(
        equipmentItems
            .map((item) => {
                if (!item || typeof item !== "object") return null
                const record = item as Record<string, unknown>
                return record.id
            })
            .filter((id): id is number => typeof id === "number")
    )
    const assignedRitualIds = new Set(rituals.map((ritual) => ritual.id))
    const abilitySearchTerm = abilitySearch.trim().toLowerCase()
    const characterClassKey = reverseFormatEnum(character.character_class)
    const weaponSearchTerm = normalizeText(weaponSearch.trim())
    const itemSearchTerm = normalizeText(itemSearch.trim())
    const ritualSearchTerm = normalizeText(ritualSearch.trim())
    const availableWeapons = weaponOptions
        .filter((weapon) => !assignedWeaponIds.has(weapon.id))
        .filter((weapon) => {
            if (!weaponSearchTerm) return true
            const haystack = normalizeText(
                `${weapon.name} ${weapon.category ?? ""} ${weapon.description ?? ""}`
            )
            return haystack.includes(weaponSearchTerm)
        })
    const availableItems = itemOptions
        .filter((item) => !assignedItemIds.has(item.id))
        .filter((item) => {
            if (!itemSearchTerm) return true
            const haystack = normalizeText(
                `${item.name} ${item.category ?? ""} ${item.description ?? ""}`
            )
            return haystack.includes(itemSearchTerm)
        })
    const ritualCircleValue = clamp(toNumber(ritualForm.circle, 1), 1, 4)
    const ritualStandardCost = ritualStandardCostByCircle[ritualCircleValue] ?? 0
    const ritualDiscenteTotal =
        ritualStandardCost + Math.max(0, toNumber(ritualForm.pe_cost_discente, 0))
    const ritualVerdadeiroTotal =
        ritualStandardCost + Math.max(0, toNumber(ritualForm.pe_cost_verdadeiro, 0))
    const attributeValueMap: Record<string, number> = {
        strength: character.atrib_strength,
        agility: character.atrib_agility,
        intellect: character.atrib_intellect,
        presence: character.atrib_presence,
        vitallity: character.atrib_vitallity
    }
    const hasHacker = abilities.some(
        (ability) => normalizeText(ability.name) === "hacker"
    )
    const hasMaosRapidas = abilities.some(
        (ability) => normalizeText(ability.name) === "maos rapidas"
    )
    const hasPrimeiraImpressao = abilities.some(
        (ability) => normalizeText(ability.name) === "primeira impressao"
    )
    const hasEnvoltoMisterio = abilities.some(
        (ability) => normalizeText(ability.name) === "envolto em misterio"
    )
    const hasIdentificacaoParanormal = abilities.some(
        (ability) => isIdentificacaoParanormalName(ability.name)
    )
    const hasElementMaster = abilities.some(
        (ability) => isMestreEmElementoName(ability.name)
    )
    const hasRitualPredileto = abilities.some(
        (ability) => isRitualPrediletoName(ability.name)
    )
    const hasTatuagemRitualistica = abilities.some(
        (ability) => isTatuagemRitualisticaName(ability.name)
    )
    const ritualCasterAbility = abilities.find(isRitualCasterAbility)
    const ritualCasterEffect = parseRitualCasterEffect(ritualCasterAbility?.effect ?? null)
    const hasRitualCaster = Boolean(ritualCasterEffect)
    const ritualCasterMaxCircle = ritualCasterEffect
        ? getMaxRitualCircle(ritualCasterEffect.circles, character.nex_total)
        : 0
    const ritualCasterExtraCount = ritualCasterEffect
        ? ritualCasterEffect.startingCount
            + Math.floor(Math.max(0, character.nex_total) / 5)
            * ritualCasterEffect.learnOnNexCount
        : 0
    const ritualCasterRemainingCount = hasRitualCaster
        ? Math.max(0, ritualCasterExtraCount - rituals.length)
        : 0
    const canUseRitualCircle = (circle: number) =>
        !hasRitualCaster || circle <= ritualCasterMaxCircle
    const allowedRitualCircleOptions = ritualCircleOptions.filter((option) => {
        if (!hasRitualCaster) return true
        const value = toNumber(option.value, 0)
        if (value <= ritualCasterMaxCircle) return true
        return ritualPickerMode === "edit" && value === toNumber(ritualForm.circle, 0)
    })
    const availableRituals = ritualOptions
        .filter((ritual) => !assignedRitualIds.has(ritual.id))
        .filter((ritual) => canUseRitualCircle(ritual.circle ?? 0))
        .filter((ritual) => {
            if (!ritualSearchTerm) return true
            const haystack = normalizeText(
                `${ritual.name} ${ritual.description} ${ritual.element} ${ritual.execution} ${ritual.ritual_range} ${ritual.duration} ${ritual.circle}`
            )
            return haystack.includes(ritualSearchTerm)
        })
    const hasPerito = abilities.some(
        (ability) => normalizeText(ability.name) === "perito"
    )
    const hasNaTrilhaCerta = abilities.some(
        (ability) => normalizeText(ability.name) === "na trilha certa"
    )
    const hackerBonusValue = hasHacker ? 5 : 0
    const getHackerBonusForExpertise = (name: string) =>
        hackerBonusValue && normalizeText(name) === "tecnologia" ? hackerBonusValue : 0
    const getEffectiveExpertiseStats = (name: string, stats?: ExpertiseStats | null) => {
        if (!stats) return stats ?? null
        const bonus = getHackerBonusForExpertise(name)
        if (!bonus) return stats
        return {
            ...stats,
            extra: (stats.extra ?? 0) + bonus,
            total: (stats.total ?? 0) + bonus
        }
    }
    const peritoStorageKey = `perito_skills_${character.id}`
    const peritoSkillOptions = Object.entries(expertise ?? {})
        .filter(([, stats]) => (stats?.treino ?? 0) > 0)
        .map(([name]) => name)
        .filter((name) => {
            const normalized = normalizeText(name)
            return normalized !== "luta" && normalized !== "pontaria"
        })
        .map((name) => ({
            name,
            label: expertiseLabelMap[name] ?? formatEnum(name)
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
    const peritoSelectedSet = new Set(peritoSkills.map((name) => normalizeText(name)))
    const peritoSkillLabels = peritoSkills
        .map((name) => expertiseLabelMap[name] ?? formatEnum(name))
        .join(", ")
    const expertiseInfoList = Object.keys(expertiseLabelMap).sort((a, b) => {
        const aLabel = expertiseLabelMap[a] ?? formatEnum(a)
        const bLabel = expertiseLabelMap[b] ?? formatEnum(b)
        return aLabel.localeCompare(bLabel, "pt-BR")
    })
    const elementSpecialistStorageKey = `element_specialist_${character.id}`
    const elementMasterStorageKey = `element_master_${character.id}`
    const ritualPrediletoStorageKey = `ritual_predileto_${character.id}`

    const getAbilityRequirementIssues = (ability: AbilitySummary) => {
        const rawRequirements = ability.requirements as unknown
        if (!rawRequirements) return []
        if (!Array.isArray(rawRequirements)) return ["Requisitos especiais"]

        const issues: string[] = []
        rawRequirements.forEach((req) => {
            const requirement = req as Record<string, unknown>
            const type = typeof requirement.type === "string" ? requirement.type : ""

            if (type === "attribute_min") {
                const attribute = typeof requirement.attribute === "string" ? requirement.attribute : ""
                const requiredValue = typeof requirement.value === "number" ? requirement.value : 0
                const currentValue = attributeValueMap[attribute] ?? 0
                if (currentValue < requiredValue) {
                    const label = attributeKeyLabelMap[attribute as keyof typeof attributeKeyLabelMap]
                        ?? formatEnum(attribute)
                    issues.push(`${label} ${currentValue}/${requiredValue}`)
                }
                return
            }

            if (type === "nex_class_min") {
                const requiredValue = typeof requirement.value === "number" ? requirement.value : 0
                if (character.nex_class < requiredValue) {
                    issues.push(`NEX Classe ${character.nex_class}/${requiredValue}`)
                }
                return
            }

            if (type === "nex_total_min") {
                const requiredValue = typeof requirement.value === "number" ? requirement.value : 0
                if (character.nex_total < requiredValue) {
                    issues.push(`NEX Total ${character.nex_total}/${requiredValue}`)
                }
                return
            }

            if (type === "expertise_trained") {
                const name = typeof requirement.name === "string" ? requirement.name : ""
                if (!name || !trainedExpertise.has(name)) {
                    const label = expertiseLabelMap[name] ?? formatEnum(name)
                    issues.push(`Treinar ${label}`)
                }
                return
            }

            if (type === "expertise_any_trained") {
                const names = Array.isArray(requirement.names)
                    ? requirement.names.filter((item) => typeof item === "string")
                    : []
                const hasAny = names.some((name) => trainedExpertise.has(name))
                if (!hasAny && names.length > 0) {
                    const labels = names.map((name) => expertiseLabelMap[name] ?? formatEnum(name))
                    issues.push(`Treinar ${labels.join(" ou ")}`)
                }
                return
            }

            if (type === "ability_required") {
                const name = typeof requirement.name === "string" ? requirement.name : ""
                if (!name || !abilityNameSet.has(normalizeText(name))) {
                    issues.push(`Requer ${name}`)
                }
                return
            }

            if (type) {
                issues.push("Requisitos especiais")
            }
        })

        return issues
    }
    const availableAbilities = abilityOptions
        .filter((ability) => ability.origin_id == null)
        .filter((ability) => !assignedAbilityIds.has(ability.id))
        .filter((ability) => {
            if (!ability.class_name) return false
            return normalizeText(ability.class_name) === normalizeText(characterClassKey)
        })
        .filter((ability) => {
            if (!abilitySearchTerm) return true
            return ability.name.toLowerCase().includes(abilitySearchTerm)
        })
    const specialAttackAbility = abilities.find((ability) => {
        const effectType =
            ability.effect && typeof ability.effect === "object"
                ? (ability.effect as Record<string, unknown>).type
                : null
        return effectType === "attack_or_damage_bonus" || normalizeText(ability.name) === "ataque especial"
    })
    const specialAttackEffect = parseSpecialAttackEffect(
        (specialAttackAbility?.effect as Record<string, unknown> | null) ?? null
    )
    const specialAttackOptions = specialAttackEffect?.options ?? []
    const availableSpecialAttackOptions = specialAttackOptions.filter(
        (option) => character.nex_total >= option.nexMin
    )
    const specialAttackTargets = specialAttackEffect?.appliesTo ?? ["attack", "damage"]
    const specialAttackCostValues = Array.from(
        new Set(
            availableSpecialAttackOptions
                .map((option) => option.peCost)
                .filter((value) => Number.isFinite(value))
        )
    ).sort((a, b) => a - b)
    const specialAttackCostLabel =
        specialAttackCostValues.length > 0
            ? `PE: ${specialAttackCostValues.join("/")}`
            : "PE: -"
    const artistaMarcialAbility = abilities.find(
        (ability) => normalizeText(ability.name) === "artista marcial"
    )
    const hasArtistaMarcial = Boolean(artistaMarcialAbility)
    const hasGolpePesado = abilities.some(
        (ability) => normalizeText(ability.name) === "golpe pesado"
    )
    const tiroCerteiroAbility = abilities.find((ability) => {
        const effectType =
            ability.effect && typeof ability.effect === "object"
                ? (ability.effect as Record<string, unknown>).type
                : null
        return effectType === "firearm_damage_agility" || normalizeText(ability.name) === "tiro certeiro"
    })
    const hasTiroCerteiro = Boolean(tiroCerteiroAbility)
    const tiroCerteiroBonusValue = hasTiroCerteiro ? Number(character.atrib_agility) || 0 : 0
    const passiveBonusNotes = [
        tiroCerteiroBonusValue
            ? { label: "Tiro Certeiro", detail: `+${tiroCerteiroBonusValue} no dano (armas de disparo)` }
            : null
    ].filter((item): item is { label: string; detail: string } => item !== null)
    const activeAbilities = abilities.filter(
        (ability) =>
            Boolean(ability.is_active) || normalizeText(ability.name) === "golpe demolidor"
    )
    const passiveAbilities = abilities.filter(
        (ability) =>
            !ability.is_active && normalizeText(ability.name) !== "golpe demolidor"
    )
    const selectedAbilityRequirements = selectedAbility?.requirements ?? []
    const currentEffort = character.effort_points
    const selectedAbilityRequirementsText =
        selectedAbilityRequirements.length > 0
            ? toAbilityJson(selectedAbilityRequirements)
            : ""
    const selectedAbilityEffectText =
        selectedAbility && selectedAbility.effect && Object.keys(selectedAbility.effect).length > 0
            ? toAbilityJson(selectedAbility.effect)
            : ""
    const opportunityAttackCost = 1
    const demolishingStrikeCost = 1
    const tirelessCost = 2
    const athleticReadinessCost = 1
    const suppressiveFireCost = 1
    const tacticalMovementCost = 1
    const quickHandsCost = 1
    const nerdCost = 2
    const pensamentoAgilCost = 2
    const camuflarOcultismoCost = 2
    const guiadoParanormalCost = 2
    const trilhaCertaBaseCost = 1
    const triggerHoldBaseCost = 2
    const sentidoTaticoCost = 2
    const conhecimentoAplicadoCost = 2
    const ecleticoCost = 2
    const sentidoTaticoBonus = sentidoTaticoActive ? Number(character.atrib_intellect) || 0 : 0
    const defenseBonus = (defensiveCombatActive ? 5 : 0) + sentidoTaticoBonus
    const resistanceBonus = baseResistanceBonus + sentidoTaticoBonus
    const pePerRoundLimit = Number(character.PE_per_round) || 0
    const trilhaCertaNextCost = trilhaCertaBaseCost + trilhaCertaBonusDice
    const trilhaCertaTotalCost = (trilhaCertaBonusDice * (trilhaCertaBonusDice + 1)) / 2
    const trilhaCertaNextTotalCost = trilhaCertaTotalCost + trilhaCertaNextCost
    const canActivateTrilhaCerta =
        hasNaTrilhaCerta
        && trilhaCertaNextCost > 0
        && currentEffort >= trilhaCertaNextCost
        && (pePerRoundLimit <= 0 || trilhaCertaNextTotalCost <= pePerRoundLimit)
    const peritoOptions = [
        { nexMin: 0, peCost: 2, diceSides: 6 },
        { nexMin: 25, peCost: 3, diceSides: 8 },
        { nexMin: 55, peCost: 4, diceSides: 10 },
        { nexMin: 85, peCost: 5, diceSides: 12 }
    ]
    const availablePeritoOptions = peritoOptions.filter(
        (option) => character.nex_total >= option.nexMin
    )
    const triggerHoldMaxUses = 4
    const triggerHoldNextCost =
        triggerHoldUses < triggerHoldMaxUses ? (triggerHoldUses + 1) * 2 : 0
    const triggerHoldNextTotal = triggerHoldSpent + triggerHoldNextCost
    const canTriggerHoldReuse =
        triggerHoldActive
        && triggerHoldUses < triggerHoldMaxUses
        && currentEffort >= triggerHoldNextCost
        && (pePerRoundLimit <= 0 || triggerHoldNextTotal <= pePerRoundLimit)

    const openSpecialAttackModal = () => {
        const affordableOptions = availableSpecialAttackOptions.filter(
            (option) => currentEffort >= option.peCost
        )
        const defaultOption =
            affordableOptions[affordableOptions.length - 1]
            ?? availableSpecialAttackOptions[availableSpecialAttackOptions.length - 1]
            ?? null
        setSpecialAttackOption(defaultOption)
        const defaultTarget = specialAttackTargets.includes("attack")
            ? "attack"
            : (specialAttackTargets[0] ?? "attack")
        setSpecialAttackTarget(defaultTarget)
        setIsSpecialAttackModalOpen(true)
    }

    const handleApplySpecialAttack = () => {
        if (!specialAttackOption) return
        if (currentEffort < specialAttackOption.peCost) {
            alert("PE insuficiente para usar Ataque Especial.")
            return
        }
        if (specialAttackOption.peCost > 0) {
            handleStatusChange("effort_points", "effort_max", -specialAttackOption.peCost)
        }
        setPendingSpecialAttack({
            bonus: specialAttackOption.bonus,
            peCost: specialAttackOption.peCost,
            target: specialAttackTarget,
            label: `Ataque Especial (PE ${specialAttackOption.peCost})`
        })
        setIsSpecialAttackModalOpen(false)
    }

    const handleCancelPendingSpecialAttack = () => {
        if (!pendingSpecialAttack) return
        if (pendingSpecialAttack.peCost > 0) {
            handleStatusChange("effort_points", "effort_max", pendingSpecialAttack.peCost)
        }
        setPendingSpecialAttack(null)
    }

    const handleActivateDefensiveCombat = () => {
        setDefensiveCombatActive(true)
    }

    const handleDeactivateDefensiveCombat = () => {
        setDefensiveCombatActive(false)
    }

    const handleActivateDualWield = () => {
        setDualWieldActive(true)
    }

    const handleDeactivateDualWield = () => {
        setDualWieldActive(false)
    }

    const handleActivateSentidoTatico = () => {
        if (sentidoTaticoActive) return
        if (sentidoTaticoCost > currentEffort) {
            alert("PE insuficiente para Sentido Tático.")
            return
        }
        handleStatusChange("effort_points", "effort_max", -sentidoTaticoCost)
        setSentidoTaticoActive(true)
    }

    const handleDeactivateSentidoTatico = () => {
        setSentidoTaticoActive(false)
    }

    const handleActivateConhecimentoAplicado = () => {
        if (conhecimentoAplicadoActive) return
        if (conhecimentoAplicadoCost > currentEffort) {
            alert("PE insuficiente para Conhecimento Aplicado.")
            return
        }
        if (conhecimentoAplicadoCost > 0) {
            handleStatusChange("effort_points", "effort_max", -conhecimentoAplicadoCost)
        }
        setConhecimentoAplicadoActive(true)
    }

    const handleCancelConhecimentoAplicado = () => {
        if (!conhecimentoAplicadoActive) return
        if (conhecimentoAplicadoCost > 0) {
            handleStatusChange("effort_points", "effort_max", conhecimentoAplicadoCost)
        }
        setConhecimentoAplicadoActive(false)
    }

    const handleActivateEcletico = () => {
        if (ecleticoActive) return
        if (ecleticoCost > currentEffort) {
            alert("PE insuficiente para Eclético.")
            return
        }
        if (ecleticoCost > 0) {
            handleStatusChange("effort_points", "effort_max", -ecleticoCost)
        }
        setEcleticoActive(true)
    }

    const handleCancelEcletico = () => {
        if (!ecleticoActive) return
        if (ecleticoCost > 0) {
            handleStatusChange("effort_points", "effort_max", ecleticoCost)
        }
        setEcleticoActive(false)
    }

    const handleActivateDemolishingStrike = () => {
        if (pendingDemolishingStrike) return
        if (demolishingStrikeCost > currentEffort) {
            alert("PE insuficiente para Golpe Demolidor.")
            return
        }
        if (demolishingStrikeCost > 0) {
            handleStatusChange("effort_points", "effort_max", -demolishingStrikeCost)
        }
        setPendingDemolishingStrike(true)
    }

    const handleCancelDemolishingStrike = () => {
        if (!pendingDemolishingStrike) return
        if (demolishingStrikeCost > 0) {
            handleStatusChange("effort_points", "effort_max", demolishingStrikeCost)
        }
        setPendingDemolishingStrike(false)
    }

    const handleUseOpportunityAttack = () => {
        if (opportunityAttackCost > currentEffort) {
            alert("PE insuficiente para Ataque de Oportunidade.")
            return
        }
        if (opportunityAttackCost > 0) {
            handleStatusChange("effort_points", "effort_max", -opportunityAttackCost)
        }
        setOpportunityToast("Habilidade ataque de oportunidade ativa, gasto 1 PE")
    }

    const handleUseTireless = () => {
        if (tirelessCost > currentEffort) {
            alert("PE insuficiente para Incansável.")
            return
        }
        if (tirelessCost > 0) {
            handleStatusChange("effort_points", "effort_max", -tirelessCost)
        }
        setOpportunityToast("Habilidade Incansável ativa, gasto 2 PE")
    }

    const handleUseAthleticReadiness = () => {
        if (athleticReadinessCost > currentEffort) {
            alert("PE insuficiente para Presteza Atlética.")
            return
        }
        if (athleticReadinessCost > 0) {
            handleStatusChange("effort_points", "effort_max", -athleticReadinessCost)
        }
        setOpportunityToast("Habilidade Presteza Atlética ativa, gasto 1 PE")
    }

    const handleUseTacticalMovement = () => {
        if (tacticalMovementCost > currentEffort) {
            alert("PE insuficiente para Movimento Tático.")
            return
        }
        if (tacticalMovementCost > 0) {
            handleStatusChange("effort_points", "effort_max", -tacticalMovementCost)
        }
        setOpportunityToast("Habilidade Movimento Tático ativa, gasto 1 PE")
    }

    const handleUseQuickHands = () => {
        if (quickHandsCost > currentEffort) {
            alert("PE insuficiente para Mãos Rápidas.")
            return false
        }
        if (quickHandsCost > 0) {
            handleStatusChange("effort_points", "effort_max", -quickHandsCost)
        }
        setOpportunityToast("Habilidade Mãos Rápidas ativa, gasto 1 PE")
        return true
    }

    const handleUsePensamentoAgil = () => {
        if (pensamentoAgilCost > currentEffort) {
            alert("PE insuficiente para Pensamento Ágil.")
            return
        }
        if (pensamentoAgilCost > 0) {
            handleStatusChange("effort_points", "effort_max", -pensamentoAgilCost)
        }
        setOpportunityToast("Habilidade Pensamento Ágil ativa, gasto 2 PE")
    }

    const handleUseNerd = () => {
        if (nerdCost > currentEffort) {
            alert("PE insuficiente para Nerd.")
            return
        }
        if (nerdCost > 0) {
            handleStatusChange("effort_points", "effort_max", -nerdCost)
        }
        handleRollExpertise("atualidades", undefined, 0, {
            successMin: 20,
            successLabel: "Nerd"
        })
    }

    const handleActivateTrilhaCerta = () => {
        const nextCost = trilhaCertaBaseCost + trilhaCertaBonusDice
        if (nextCost > currentEffort) {
            alert("PE insuficiente para Na Trilha Certa.")
            return false
        }
        const totalCost = (trilhaCertaBonusDice * (trilhaCertaBonusDice + 1)) / 2
        const nextTotalCost = totalCost + nextCost
        if (pePerRoundLimit > 0 && nextTotalCost > pePerRoundLimit) {
            alert("Custo excede o PE por rodada.")
            return false
        }
        if (nextCost > 0) {
            handleStatusChange("effort_points", "effort_max", -nextCost)
        }
        setTrilhaCertaBonusDice((prev) => prev + 1)
        setOpportunityToast(`Habilidade Na Trilha Certa ativa, gasto ${nextCost} PE`)
        return true
    }

    const handleDeactivateTrilhaCerta = () => {
        setTrilhaCertaBonusDice(0)
        setIsTrilhaCertaPromptOpen(false)
    }

    const handleShowTrilhaCertaInfo = () => {
        setOpportunityToast(
            "Na Trilha Certa: uso somente nas rolagens de investigação, escutar e observar"
        )
    }

    const handleConfirmEnvoltoMisterio = (applyBonus: boolean) => {
        const pending = pendingEnvoltoMisterio
        if (!pending) {
            setIsEnvoltoMisterioPromptOpen(false)
            return
        }
        setIsEnvoltoMisterioPromptOpen(false)
        setPendingEnvoltoMisterio(null)
        const updatedBonus = applyBonus
            ? mergeExtraBonus(pending.extraBonus, {
                value: 5,
                label: "Envolto em Mistério"
            })
            : pending.extraBonus
        requestRollExpertise(
            pending.expertiseName,
            updatedBonus,
            pending.dicePenalty,
            pending.options,
            true
        )
    }

    const handleConfirmIdentificacaoParanormal = (applyBonus: boolean) => {
        const pending = pendingIdentificacaoParanormal
        if (!pending) {
            setIsIdentificacaoParanormalPromptOpen(false)
            return
        }
        setIsIdentificacaoParanormalPromptOpen(false)
        setPendingIdentificacaoParanormal(null)
        const updatedBonus = applyBonus
            ? mergeExtraBonus(pending.extraBonus, {
                value: 10,
                label: "Identificação Paranormal"
            })
            : pending.extraBonus
        requestRollExpertise(
            pending.expertiseName,
            updatedBonus,
            pending.dicePenalty,
            pending.options,
            false,
            true
        )
    }

    const handleConfirmPrimeiraImpressao = (applyBonus: boolean) => {
        const pending = pendingPrimeiraImpressao
        if (!pending) {
            setIsPrimeiraImpressaoPromptOpen(false)
            return
        }
        setIsPrimeiraImpressaoPromptOpen(false)
        setPendingPrimeiraImpressao(null)
        handleRollExpertise(
            pending.expertiseName,
            pending.extraBonus,
            pending.dicePenalty,
            {
                ...pending.options,
                extraDice: applyBonus ? 2 : 0,
                extraDiceLabel: applyBonus ? "Primeira Impressão" : undefined
            }
        )
    }

    const handleSelectElementSpecialist = (value: string) => {
        const normalized = normalizeText(value)
        const option = elementSpecialistOptions.find(
            (item) => normalizeText(item.value) === normalized
        )
        if (!option) return
        setElementSpecialistChoice(option.value)
        localStorage.setItem(elementSpecialistStorageKey, option.value)
        setIsElementSpecialistOpen(false)
    }

    const handleSelectElementMaster = (value: string) => {
        const normalized = normalizeText(value)
        const option = elementSpecialistOptions.find(
            (item) => normalizeText(item.value) === normalized
        )
        if (!option) return
        setElementMasterChoice(option.value)
        localStorage.setItem(elementMasterStorageKey, option.value)
        setIsElementMasterOpen(false)
    }

    const handleSelectRitualPredileto = (ritualId: number) => {
        if (!Number.isFinite(ritualId)) return
        setRitualPrediletoId(ritualId)
        localStorage.setItem(ritualPrediletoStorageKey, String(ritualId))
        setIsRitualPrediletoOpen(false)
    }

    const openPeritoConfig = () => {
        if (peritoSkillOptions.length === 0) {
            setOpportunityToast("Perito: nenhuma perícia treinada disponível.")
            return
        }
        setPeritoSkillDraft(peritoSkills)
        setIsPeritoConfigOpen(true)
    }

    const togglePeritoSkill = (name: string) => {
        setPeritoSkillDraft((prev) => {
            const normalized = normalizeText(name)
            const hasSkill = prev.some((item) => normalizeText(item) === normalized)
            if (hasSkill) {
                return prev.filter((item) => normalizeText(item) !== normalized)
            }
            if (prev.length >= 2) return prev
            return [...prev, name]
        })
    }

    const handleSavePeritoSkills = () => {
        if (peritoSkillDraft.length !== 2) return
        setPeritoSkills(peritoSkillDraft)
        localStorage.setItem(peritoStorageKey, JSON.stringify(peritoSkillDraft))
        setIsPeritoConfigOpen(false)
    }

    const handleOpenPeritoUse = () => {
        if (peritoSkills.length < 2) {
            openPeritoConfig()
            return
        }
        if (pendingPerito) {
            setOpportunityToast("Perito já está preparado para o próximo teste.")
            return
        }
        setIsPeritoUseOpen(true)
    }

    const handleActivatePerito = (option: { peCost: number; diceSides: number }) => {
        if (option.peCost > currentEffort) {
            alert("PE insuficiente para Perito.")
            return
        }
        if (option.peCost > 0) {
            handleStatusChange("effort_points", "effort_max", -option.peCost)
        }
        setPendingPerito({ peCost: option.peCost, diceSides: option.diceSides })
        setIsPeritoUseOpen(false)
    }

    const handleUseSuppressiveFire = () => {
        if (suppressiveFireCost > currentEffort) {
            alert("PE insuficiente para Tiro de Cobertura.")
            return
        }
        if (suppressiveFireCost > 0) {
            handleStatusChange("effort_points", "effort_max", -suppressiveFireCost)
        }
        setOpportunityToast("Habilidade Tiro de Cobertura ativa, gasto 1 PE")
    }

    const handleUseCamuflarOcultismo = () => {
        if (camuflarOcultismoCost > currentEffort) {
            alert("PE insuficiente para Camuflar Ocultismo.")
            return
        }
        if (camuflarOcultismoCost > 0) {
            handleStatusChange("effort_points", "effort_max", -camuflarOcultismoCost)
        }
        setOpportunityToast(
            `Camuflar Ocultismo ativo, gasto ${camuflarOcultismoCost} PE`
        )
    }

    const handleUseGuiadoParanormal = () => {
        if (guiadoParanormalCost > currentEffort) {
            alert("PE insuficiente para Guiado Pelo Paranormal.")
            return
        }
        if (guiadoParanormalCost > 0) {
            handleStatusChange("effort_points", "effort_max", -guiadoParanormalCost)
        }
        setOpportunityToast(
            `Guiado pelo paranormal ativado, gasto ${guiadoParanormalCost} PE`
        )
    }

    const handleUseRitual = (
        ritual: RitualSummary,
        variant: "padrao" | "discente" | "verdadeiro",
        cost: number
    ) => {
        if (cost > currentEffort) {
            alert("PE insuficiente para usar este ritual.")
            return
        }
        if (cost > 0) {
            handleStatusChange("effort_points", "effort_max", -cost)
        }
        const dt = 20 + cost
        setPendingRitualOccultismTest({
            ritualName: ritual.name,
            ritualVariant: variant,
            peCost: cost,
            dt
        })
        requestRollExpertise(
            "ocultismo",
            undefined,
            0,
            {
                successMin: dt,
                successLabel: `DT Ritual (${dt})`
            },
            false,
            true
        )
        const label =
            variant === "discente"
                ? "Discente"
                : variant === "verdadeiro"
                    ? "Verdadeiro"
                    : "Padrão"
        setOpportunityToast(
            `${ritual.name} (${label}) ativado, gasto ${cost} PE`
        )
    }

    const handleActivateTriggerHold = () => {
        if (triggerHoldActive) return
        if (triggerHoldBaseCost > currentEffort) {
            alert("PE insuficiente para Segurar Gatilho.")
            return
        }
        if (pePerRoundLimit > 0 && triggerHoldBaseCost > pePerRoundLimit) {
            alert("Custo excede o PE por rodada.")
            return
        }
        handleStatusChange("effort_points", "effort_max", -triggerHoldBaseCost)
        setTriggerHoldActive(true)
        setTriggerHoldUses(1)
        setTriggerHoldSpent(triggerHoldBaseCost)
    }

    const handleReuseTriggerHold = () => {
        if (!triggerHoldActive) return
        if (triggerHoldUses >= triggerHoldMaxUses) return
        if (triggerHoldNextCost > currentEffort) {
            alert("PE insuficiente para reutilizar Segurar Gatilho.")
            return
        }
        if (pePerRoundLimit > 0 && triggerHoldNextTotal > pePerRoundLimit) {
            alert("Custo total excede o PE por rodada.")
            return
        }
        handleStatusChange("effort_points", "effort_max", -triggerHoldNextCost)
        setTriggerHoldUses((prev) => prev + 1)
        setTriggerHoldSpent((prev) => prev + triggerHoldNextCost)
    }

    const handleDeactivateTriggerHold = () => {
        setTriggerHoldActive(false)
        setTriggerHoldUses(0)
        setTriggerHoldSpent(0)
    }

    const canAffordSpecialAttack =
        Boolean(specialAttackOption) && currentEffort >= (specialAttackOption?.peCost ?? 0)

    const renderAbilityItem = (ability: AbilitySummary) => {
        const isOriginAbility =
            originInfo?.id != null && ability.origin_id === originInfo.id
        const isSpecialAttack = specialAttackAbility?.id === ability.id
        const isOpportunityAttack = normalizeText(ability.name) === "ataque de oportunidade"
        const isDefensiveCombat = normalizeText(ability.name) === "combate defensivo"
        const isDualWield = normalizeText(ability.name) === "combater com duas armas"
        const isDemolishingStrike = normalizeText(ability.name) === "golpe demolidor"
        const isTireless = normalizeText(ability.name) === "incansavel"
        const isAthleticReadiness = normalizeText(ability.name) === "presteza atletica"
        const isTacticalMovement = normalizeText(ability.name) === "movimento tatico"
        const isQuickHands = normalizeText(ability.name) === "maos rapidas"
        const isNerd = normalizeText(ability.name) === "nerd"
        const isPensamentoAgil = normalizeText(ability.name) === "pensamento agil"
        const isPerito = normalizeText(ability.name) === "perito"
        const isNaTrilhaCerta = normalizeText(ability.name) === "na trilha certa"
        const isTriggerHold = normalizeText(ability.name) === "segurar gatilho"
        const isSentidoTatico = normalizeText(ability.name) === "sentido tatico"
        const isConhecimentoAplicado = normalizeText(ability.name) === "conhecimento aplicado"
        const isEcletico = normalizeText(ability.name) === "ecletico"
        const isSuppressiveFire = normalizeText(ability.name) === "tiro de cobertura"
        const isCamuflarOcultismo = normalizeText(ability.name) === "camuflar ocultismo"
        const isGuiadoParanormal = normalizeText(ability.name) === "guiado pelo paranormal"
        const isElementSpecialist = normalizeText(ability.name) === "especialista em elemento"
        const isElementMaster = isMestreEmElementoName(ability.name)
        const isRitualPredileto = isRitualPrediletoName(ability.name)
        const canChooseElementSpecialist = isElementSpecialist && !elementSpecialistChoice
        const canChooseElementMaster = isElementMaster && !elementMasterChoice
        const isClickableAbility =
            isSpecialAttack
            || isOpportunityAttack
            || isDefensiveCombat
            || isDualWield
            || isDemolishingStrike
            || isTireless
            || isAthleticReadiness
            || isTacticalMovement
            || isQuickHands
            || isNerd
            || isPensamentoAgil
            || isPerito
            || isNaTrilhaCerta
            || isTriggerHold
            || isSentidoTatico
            || isConhecimentoAplicado
            || isEcletico
            || isSuppressiveFire
            || isCamuflarOcultismo
            || isGuiadoParanormal
            || canChooseElementSpecialist
            || canChooseElementMaster
        const abilityClassKey = normalizeText(ability.class_name ?? "")
        const hoverBorderClass = isClickableAbility
            ? abilityClassKey === "ocultista"
                ? "hover:border-purple-500/60"
                : abilityClassKey === "combatente"
                    ? "hover:border-red-500/60"
                    : "hover:border-emerald-500/60"
            : ""
        const basePeCost = ability.pe_cost ?? 0
        const peCost = isDemolishingStrike
            ? Math.max(demolishingStrikeCost, basePeCost)
            : isTireless
                ? Math.max(tirelessCost, basePeCost)
                : isAthleticReadiness
                    ? Math.max(athleticReadinessCost, basePeCost)
                    : isTacticalMovement
                        ? Math.max(tacticalMovementCost, basePeCost)
                        : isQuickHands
                            ? Math.max(quickHandsCost, basePeCost)
                            : isNerd
                                ? Math.max(nerdCost, basePeCost)
                                : isPensamentoAgil
                                    ? Math.max(pensamentoAgilCost, basePeCost)
                                    : isPerito
                                        ? Math.max(2, basePeCost)
                                    : isTriggerHold
                        ? Math.max(triggerHoldBaseCost, basePeCost)
                        : isSentidoTatico
                            ? Math.max(sentidoTaticoCost, basePeCost)
                            : isConhecimentoAplicado
                                ? Math.max(conhecimentoAplicadoCost, basePeCost)
                                : isEcletico
                                    ? Math.max(ecleticoCost, basePeCost)
                                    : isSuppressiveFire
                                        ? Math.max(suppressiveFireCost, basePeCost)
                                        : basePeCost
        const isAbilityActive = ability.is_active || isDemolishingStrike
        const metaParts = [isAbilityActive ? "Ativa" : "Passiva"]
        if (isNaTrilhaCerta) {
            metaParts.push("PE 1 (Cumulativo)")
        } else if (isPerito) {
            const peritoCostLabel = availablePeritoOptions
                .map((option) => option.peCost)
                .join("/")
            metaParts.push(peritoCostLabel ? `PE ${peritoCostLabel}` : "PE -")
        } else if (isAbilityActive || peCost > 0) {
            if (!(isSpecialAttack && peCost === 0)) {
                metaParts.push(`PE ${peCost}`)
            }
        }
        if (isSpecialAttack && specialAttackCostValues.length > 0) {
            metaParts.push(specialAttackCostLabel)
        }
        if (isElementSpecialist) {
            metaParts.push(
                elementSpecialistChoice
                    ? `DT +2 (${formatEnum(elementSpecialistChoice)})`
                    : "Escolher Elemento"
            )
        }
        if (isElementMaster) {
            metaParts.push(
                elementMasterChoice
                    ? `PE -1 (${formatEnum(elementMasterChoice)})`
                    : "Escolher Elemento"
            )
        }
        if (isRitualPredileto) {
            const ritualName =
                ritualPrediletoId != null
                    ? rituals.find((ritual) => ritual.id === ritualPrediletoId)?.name
                    : null
            metaParts.push(
                ritualName
                    ? `PE -1 (${ritualName})`
                    : "Escolher Ritual"
            )
        }

        return (
            <div
                key={ability.id}
                onClick={
                    isSpecialAttack
                        ? openSpecialAttackModal
                        : isOpportunityAttack
                            ? handleUseOpportunityAttack
                            : isDefensiveCombat
                                ? handleActivateDefensiveCombat
                                : isDualWield
                                    ? handleActivateDualWield
                                    : isSentidoTatico
                                        ? handleActivateSentidoTatico
                                    : isConhecimentoAplicado
                                    ? handleActivateConhecimentoAplicado
                                        : isEcletico
                                            ? handleActivateEcletico
                                            : isDemolishingStrike
                                                ? handleActivateDemolishingStrike
                                                : isTireless
                                                    ? handleUseTireless
                                                    : isAthleticReadiness
                                                        ? handleUseAthleticReadiness
                                                        : isTacticalMovement
                                                            ? handleUseTacticalMovement
                                                            : isQuickHands
                                                                ? handleUseQuickHands
                                                                    : isNerd
                                                                        ? handleUseNerd
                                                                        : isPensamentoAgil
                                                                            ? handleUsePensamentoAgil
                                                                            : isPerito
                                                                                ? handleOpenPeritoUse
                                                                            : isNaTrilhaCerta
                                                                                ? handleShowTrilhaCertaInfo
                                    : isTriggerHold
                                        ? handleActivateTriggerHold
                                        : isSuppressiveFire
                                        ? handleUseSuppressiveFire
                                        : isCamuflarOcultismo
                                        ? handleUseCamuflarOcultismo
                                        : isGuiadoParanormal
                                        ? handleUseGuiadoParanormal
                                        : canChooseElementSpecialist
                                        ? () => setIsElementSpecialistOpen(true)
                                        : canChooseElementMaster
                                        ? () => setIsElementMasterOpen(true)
                                        : undefined
                }
                onKeyDown={(event) => {
                    if (!isClickableAbility) return
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        if (isSpecialAttack) {
                            openSpecialAttackModal()
                        } else if (isOpportunityAttack) {
                            handleUseOpportunityAttack()
                        } else if (isDefensiveCombat) {
                            handleActivateDefensiveCombat()
                        } else if (isDualWield) {
                            handleActivateDualWield()
                        } else if (isSentidoTatico) {
                            handleActivateSentidoTatico()
                        } else if (isConhecimentoAplicado) {
                            handleActivateConhecimentoAplicado()
                        } else if (isEcletico) {
                            handleActivateEcletico()
                        } else if (isDemolishingStrike) {
                            handleActivateDemolishingStrike()
                        } else if (isTireless) {
                            handleUseTireless()
                        } else if (isAthleticReadiness) {
                            handleUseAthleticReadiness()
                        } else if (isTacticalMovement) {
                            handleUseTacticalMovement()
                        } else if (isQuickHands) {
                            handleUseQuickHands()
                        } else if (isNerd) {
                            handleUseNerd()
                        } else if (isPensamentoAgil) {
                            handleUsePensamentoAgil()
                        } else if (isPerito) {
                            handleOpenPeritoUse()
                        } else if (isNaTrilhaCerta) {
                            handleShowTrilhaCertaInfo()
                        } else if (isTriggerHold) {
                            handleActivateTriggerHold()
                        } else if (isSuppressiveFire) {
                            handleUseSuppressiveFire()
                        } else if (isCamuflarOcultismo) {
                            handleUseCamuflarOcultismo()
                        } else if (isGuiadoParanormal) {
                            handleUseGuiadoParanormal()
                        } else if (canChooseElementSpecialist) {
                            setIsElementSpecialistOpen(true)
                        } else if (canChooseElementMaster) {
                            setIsElementMasterOpen(true)
                        }
                    }
                }}
                role={isClickableAbility ? "button" : undefined}
                tabIndex={isClickableAbility ? 0 : undefined}
                className={`flex items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-700 rounded-lg p-3 ${
                    isClickableAbility
                        ? `cursor-pointer ${hoverBorderClass} focus:outline-none`
                        : ""
                }`}
            >
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-text">
                            {ability.name}
                        </span>
                        {ability.class_name === "especialista" && (
                            <span className="text-emerald-300 border border-emerald-500/40 text-xs px-2 py-0.5 rounded">
                                Poder de Especialista
                            </span>
                        )}
                        {ability.class_name === "ocultista" && (
                            <span className="text-purple-300 border border-purple-500/40 text-xs px-2 py-0.5 rounded">
                                Poder de Ocultista
                            </span>
                        )}
                        {ability.class_name === "combatente" && (
                            <span className="text-red-400 border border-red-500/40 text-xs px-2 py-0.5 rounded">
                                Poder de Combatente
                            </span>
                        )}
                        {isOriginAbility && (
                            <span className="text-emerald-300 border border-emerald-500/40 text-xs px-2 py-0.5 rounded">
                                Origem
                            </span>
                        )}
                    </div>
                    {metaParts.length > 0 && (
                        <span className="text-zinc-400 text-xs font-text">
                            {metaParts.join(" | ")}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            setSelectedAbility(ability)
                            setIsAbilityModalOpen(true)
                        }}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Detalhes da habilidade"
                        aria-label="Detalhes da habilidade"
                    >
                        <Info size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            setAbilityToRemove(ability)
                            setIsRemoveConfirmOpen(true)
                        }}
                        disabled={
                            removingAbilityId === ability.id || isOriginAbility
                        }
                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        title={
                            isOriginAbility
                                ? "Habilidade de origem não pode ser removida"
                                : "Remover habilidade"
                        }
                        aria-label="Remover habilidade"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        )
    }

    const renderRitualItem = (ritual: RitualSummary) => {
        const isExpanded = expandedRitualIds.includes(ritual.id)
        const discenteDescription = ritual.description_discente?.trim()
        const verdadeiroDescription = ritual.description_verdadeiro?.trim()
        const normalizedElement = normalizeText(ritual.element ?? "")
        const elementStyles =
            ritualElementStyleMap[normalizedElement] ?? ritualElementStyleMap.default
        const elementIcon = ritualElementIconMap[normalizedElement]
        const ritualElementReduction =
            hasElementMaster
            && elementMasterChoice
            && normalizeText(elementMasterChoice) === normalizedElement
                ? 1
                : 0
        const ritualPrediletoReduction =
            hasRitualPredileto && ritualPrediletoId === ritual.id ? 1 : 0
        const ritualRangeReduction =
            hasTatuagemRitualistica && normalizeText(ritual.ritual_range ?? "") === "pessoal"
                ? 1
                : 0
        const ritualCostReduction =
            ritualElementReduction + ritualPrediletoReduction + ritualRangeReduction
        const standardCost = applyRitualCostReduction(ritual.pe_cost_standard, ritualCostReduction)
        const discenteCost = applyRitualCostReduction(ritual.pe_cost_discente, ritualCostReduction)
        const verdadeiroCost = applyRitualCostReduction(ritual.pe_cost_verdadeiro, ritualCostReduction)
        return (
            <div
                key={ritual.id}
                className={`w-full border rounded-lg overflow-hidden ${elementStyles.card}`}
            >
                <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-3 border-b border-zinc-700/70">
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {elementIcon && (
                                <div className="h-12 w-12 rounded-full bg-black/40 border border-zinc-700/60 flex items-center justify-center">
                                    <img
                                        src={elementIcon}
                                        alt={`Símbolo de ${formatEnum(ritual.element)}`}
                                        className="h-8 w-8 object-contain"
                                    />
                                </div>
                            )}
                            <span className="text-white font-text text-lg">
                                {ritual.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${elementStyles.badge}`}>
                                Círculo {ritual.circle}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${elementStyles.badge}`}>
                                {formatEnum(ritual.element)}
                            </span>
                        </div>
                        <div className="text-xs text-zinc-400 font-text">
                            Execução {formatEnum(ritual.execution)} | Alcance{" "}
                            {formatEnum(ritual.ritual_range)} | Duração{" "}
                            {formatEnum(ritual.duration)}
                        </div>
                        <div className="text-xs text-zinc-400 font-text">
                            PE padrão {standardCost} | Discente{" "}
                            {discenteCost} | Verdadeiro{" "}
                            {verdadeiroCost}
                        </div>
                        {ritualCostReduction > 0 && (
                            <div className="text-[11px] text-emerald-200 flex flex-wrap gap-x-2">
                                {ritualElementReduction > 0 && (
                                    <span>Mestre em Elemento: -{ritualElementReduction} PE</span>
                                )}
                                {ritualPrediletoReduction > 0 && (
                                    <span>Ritual Predileto: -{ritualPrediletoReduction} PE</span>
                                )}
                                {ritualRangeReduction > 0 && (
                                    <span>Tatuagem Ritualística: -{ritualRangeReduction} PE</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setExpandedRitualIds((prev) =>
                                    prev.includes(ritual.id)
                                        ? prev.filter((id) => id !== ritual.id)
                                        : [...prev, ritual.id]
                                )
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Descrição do ritual"
                            aria-label="Descrição do ritual"
                        >
                            {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => openRitualEdit(ritual)}
                            className="text-yellow-400 hover:text-yellow-200 transition-colors"
                            title="Editar ritual"
                            aria-label="Editar ritual"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setRitualToRemove(ritual)
                                setIsRitualRemoveConfirmOpen(true)
                            }}
                            disabled={removingRitualId === ritual.id}
                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Remover ritual"
                            aria-label="Remover ritual"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                {isExpanded && (
                    <div className="px-4 py-3 text-sm text-zinc-300 font-text flex flex-col gap-3">
                        <div className="text-zinc-200">
                            {ritual.description?.trim()
                                ? ritual.description
                                : "Descrição não disponível."}
                        </div>
                        <div>
                            <div className="text-xs uppercase text-zinc-500">Discente</div>
                            <div className="text-zinc-300">
                                {discenteDescription || "Sem descrição discente."}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs uppercase text-zinc-500">Verdadeiro</div>
                            <div className="text-zinc-300">
                                {verdadeiroDescription || "Sem descrição verdadeiro."}
                            </div>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-3 text-sm text-zinc-200 border-t border-zinc-700/70 rounded-none overflow-hidden">
                    <button
                        type="button"
                        onClick={() => handleUseRitual(ritual, "padrao", Number(standardCost ?? 0))}
                        className="py-2 border-r border-zinc-700 hover:bg-zinc-800 transition-colors font-text flex flex-col items-center leading-tight text-blue-300"
                    >
                        <span>Padrão</span>
                        <span className="text-xs text-blue-200">PE {standardCost ?? 0}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleUseRitual(ritual, "discente", Number(discenteCost ?? 0))}
                        disabled={!discenteDescription}
                        className="py-2 border-r border-zinc-700 hover:bg-zinc-800 transition-colors font-text text-red-300 flex flex-col items-center leading-tight disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Discente</span>
                        <span className="text-xs text-red-200">
                            {discenteDescription ? `PE ${discenteCost ?? 0}` : "-"}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleUseRitual(ritual, "verdadeiro", Number(verdadeiroCost ?? 0))}
                        disabled={!verdadeiroDescription}
                        className="py-2 hover:bg-zinc-800 transition-colors font-text text-red-400 flex flex-col items-center leading-tight disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Verdadeiro</span>
                        <span className="text-xs text-red-300">
                            {verdadeiroDescription ? `PE ${verdadeiroCost ?? 0}` : "-"}
                        </span>
                    </button>
                </div>
            </div>
        )
    }

    const renderDtHighlights = (text: string) => {
        const parts = text.split(/(DT\s*\d+)/g)
        return parts.map((part, index) => {
            if (/^DT\s*\d+$/.test(part)) {
                return (
                    <span key={`dt-${index}`} className="font-semibold text-red-400">
                        {part}
                    </span>
                )
            }
            return part
        })
    }

    const renderExpertiseDescription = (raw: string) => {
        const paragraphs = raw
            .split(/\n\s*\n/)
            .map((item) => item.trim())
            .filter(Boolean)
        return paragraphs.map((paragraph, index) => {
            if (paragraph.startsWith("## ")) {
                const [titleLine, ...restLines] = paragraph.split("\n")
                const title = titleLine.replace(/^##\s*/, "")
                const rest = restLines.join("\n").trim()
                return (
                    <div key={`exp-title-${index}`} className="text-sm flex flex-col gap-2">
                        <span className="font-semibold text-red-400">
                            {renderDtHighlights(title)}
                        </span>
                        {rest && (
                            <span className="text-zinc-300">
                                {renderDtHighlights(rest)}
                            </span>
                        )}
                    </div>
                )
            }
            return (
                <div key={`exp-body-${index}`} className="text-sm text-zinc-300">
                    {renderDtHighlights(paragraph)}
                </div>
            )
        })
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
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-300 font-text">Origem</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsOriginInfoOpen(true)}
                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                            title="Detalhes da origem"
                                            aria-label="Detalhes da origem"
                                        >
                                            <Info size={16} />
                                        </button>
                                    </div>
                                    <span className="text-white font-text text-lg">{originLabel}</span>
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
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-300 font-text">Trilha</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsTrailInfoOpen(true)}
                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                            title="Detalhes da trilha"
                                            aria-label="Detalhes da trilha"
                                        >
                                            <Info size={16} />
                                        </button>
                                    </div>
                                    <span className="text-white font-text text-lg">{trailLabel}</span>
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

                                <div className="bg-zinc-900/60 p-4 rounded-lg flex flex-col gap-3 col-span-2 md:col-span-3 border border-zinc-700/70">
                                    <div className="flex items-center justify-center gap-2 text-zinc-300 font-text text-base uppercase tracking-wide">
                                        <span>Proficiências</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsProficienciesInfoOpen(true)}
                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                            title="Informações sobre proficiências"
                                            aria-label="Informações sobre proficiências"
                                        >
                                            <Info size={16} />
                                        </button>
                                    </div>
                                    {displayProficiencies.length === 0 ? (
                                        <div className="text-zinc-400 font-text text-sm">
                                            Nenhuma proficiência registrada.
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {displayProficiencies.map((proficiency) => (
                                                <span
                                                    key={proficiency.id}
                                                    className="bg-zinc-900/70 border border-zinc-700 text-zinc-200 text-sm font-text px-3 py-1 rounded-full"
                                                >
                                                    {formatEnum(proficiency.name)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
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

                            <div className="border-t border-zinc-700 pt-4">
                                <div className="text-blue-300 font-smalltitle text-lg text-center">
                                    Defesas
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-3">
                                    <div className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-2 text-center">
                                        <div className="text-xs text-zinc-400 font-text">Passiva</div>
                                        <div className="text-white text-lg font-text">
                                            {character.defense_passive + defenseBonus}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-2 text-center">
                                        <div className="text-xs text-zinc-400 font-text">Esquiva</div>
                                        <div className="text-white text-lg font-text">
                                            {character.defense_dodging + defenseBonus}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-2 text-center">
                                        <div className="text-xs text-zinc-400 font-text">Bloqueio</div>
                                        <div className="text-white text-lg font-text">
                                            {character.defense_blocking + defenseBonus}
                                        </div>
                                    </div>
                                </div>
                                {resistanceBonus > 0 && (
                                    <div className="mt-3 text-center text-sm text-zinc-300 font-text">
                                        Testes de Resistência +{resistanceBonus}
                                    </div>
                                )}
                                {elementSpecialistChoice && (
                                    <div className="mt-2 text-center text-sm text-zinc-300 font-text">
                                        Resistir rituais ({formatEnum(elementSpecialistChoice)}) DT +2
                                    </div>
                                )}
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

                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={handleOpenLevelUp}
                                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-black rounded-lg font-text text-lg shadow-md mt-4"
                                >
                                    Transcender
                                </button>
                            </div>
                        </div>

                        {/* Card Habilidades */}
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3">
                                <h1 className="text-blue-400 font-smalltitle text-2xl">Habilidades</h1>
                                <button
                                    type="button"
                                    onClick={() => setIsAbilityPickerOpen(true)}
                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded flex items-center gap-2 font-text"
                                >
                                    <Plus size={16} />
                                    Adicionar
                                </button>
                            </div>
                            {abilities.length === 0 && (
                                <div className="text-zinc-300 font-text">
                                    Nenhuma habilidade registrada.
                                </div>
                            )}
                            {abilities.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAbilityTab("active")}
                                            className={`px-3 py-2 rounded text-sm font-text border ${
                                                abilityTab === "active"
                                                    ? "bg-blue-500 border-blue-400 text-black"
                                                    : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                            }`}
                                        >
                                            Ativas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAbilityTab("passive")}
                                            className={`px-3 py-2 rounded text-sm font-text border ${
                                                abilityTab === "passive"
                                                    ? "bg-blue-500 border-blue-400 text-black"
                                                    : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                            }`}
                                        >
                                            Passivas
                                        </button>
                                    </div>
                                    {abilityTab === "active" ? (
                                        activeAbilities.length === 0 ? (
                                            <div className="text-zinc-400 font-text text-sm">
                                                Nenhuma habilidade ativa.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {activeAbilities.map(renderAbilityItem)}
                                            </div>
                                        )
                                    ) : (
                                        passiveAbilities.length === 0 ? (
                                            <div className="text-zinc-400 font-text text-sm">
                                                Nenhuma habilidade passiva.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {passiveAbilities.map(renderAbilityItem)}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Card Perícias */}
                        <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
                            <div className="relative bg-black/60 rounded-md py-2 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <h1 className="text-blue-400 font-smalltitle text-3xl">Perícias</h1>
                                    <button
                                        type="button"
                                        onClick={() => setIsExpertiseInfoOpen(true)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                        title="Informações das perícias"
                                        aria-label="Informações das perícias"
                                    >
                                        <Info size={18} />
                                    </button>
                                </div>
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
                                        .sort((a, b) => {
                                            const aStats = getEffectiveExpertiseStats(a, expertise?.[a])
                                            const bStats = getEffectiveExpertiseStats(b, expertise?.[b])
                                            const treinoDiff = (bStats?.treino ?? 0) - (aStats?.treino ?? 0)
                                            if (treinoDiff !== 0) return treinoDiff
                                            const extraDiff = (bStats?.extra ?? 0) - (aStats?.extra ?? 0)
                                            if (extraDiff !== 0) return extraDiff
                                            const aLabel = expertiseLabelMap[a] ?? formatEnum(a)
                                            const bLabel = expertiseLabelMap[b] ?? formatEnum(b)
                                            return aLabel.localeCompare(bLabel, "pt-BR")
                                        })
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
                                                    const stats = getEffectiveExpertiseStats(name, expertise?.[name])
                                                    return (
                                                        <div
                                                            key={name}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const isResistance = resistanceExpertiseSet.has(name)
                                                                    const bonusValue =
                                                                        sentidoTaticoActive && isResistance
                                                                            ? Number(character.atrib_intellect) || 0
                                                                            : 0
                                                                    requestRollExpertise(
                                                                        name,
                                                                        bonusValue > 0
                                                                            ? {
                                                                                value: bonusValue,
                                                                                label: "Sentido Tático (Intelecto)"
                                                                            }
                                                                            : undefined
                                                                    )
                                                                }}
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

                        {/* Card Inventário */}
                        <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <h1 className="text-blue-400 font-smalltitle text-2xl">
                                    Inventário ({inventorySpaceUsed}/{inventorySpaceLabel})
                                </h1>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-zinc-300 font-text text-sm uppercase tracking-wide">
                                    Arsenal
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setWeaponPickerMode("list")
                                        setWeaponToEdit(null)
                                        setIsWeaponPickerOpen(true)
                                    }}
                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded flex items-center gap-2 font-text"
                                >
                                    <Plus size={16} />
                                    Adicionar arma
                                </button>
                            </div>
                            {weapons.length === 0 && (
                                <div className="text-zinc-300 font-text">
                                    Nenhuma arma registrada.
                                </div>
                            )}
                            {weapons.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {weapons.map((weapon) => {
                                        const isUnarmedWeapon = weapon.id === UNARMED_WEAPON_ID
                                        const effectiveDamageFormula =
                                            weapon.id === UNARMED_WEAPON_ID
                                                ? getUnarmedDamageFormula(character.nex_total, hasArtistaMarcial)
                                                : weapon.damage_formula
                                        const specialAttackAttackBonus =
                                            pendingSpecialAttack?.target === "attack"
                                                ? pendingSpecialAttack.bonus
                                                : 0
                                        const specialAttackDamageBonus =
                                            pendingSpecialAttack?.target === "damage"
                                                ? pendingSpecialAttack.bonus
                                                : 0
                                        const damageFormulaParsed = parseDamageFormula(
                                            effectiveDamageFormula
                                        )
                                        const demolishingStrikeLabel =
                                            pendingDemolishingStrike && damageFormulaParsed
                                                ? `+2d${damageFormulaParsed.diceSides}`
                                                : ""
                                        const golpePesadoLabel =
                                            hasGolpePesado
                                            && weapon.weapon_range === "corpo_a_corpo"
                                            && damageFormulaParsed
                                                ? `+1d${damageFormulaParsed.diceSides}`
                                                : ""
                                        const firearmDamageBonus =
                                            hasTiroCerteiro && weapon.weapon_range !== "corpo_a_corpo"
                                                ? Number(character.atrib_agility) || 0
                                                : 0
                                        const ninjaUrbanoDamageBonus =
                                            hasNinjaUrbano && isTacticalWeapon(weapon) && !isFirearmWeapon(weapon)
                                                ? 2
                                                : 0
                                        const tacticalDamageBonus =
                                            hasBalisticaAvancada && isTacticalWeapon(weapon) ? 2 : 0
                                        const damageBonusLabel = formatSignedBonus(
                                            firearmDamageBonus
                                            + specialAttackDamageBonus
                                            + tacticalDamageBonus
                                            + ninjaUrbanoDamageBonus
                                        )
                                        const extraDiceLabel = [demolishingStrikeLabel, golpePesadoLabel]
                                            .filter(Boolean)
                                            .join("")
                                        const damageExtraLabel = `${extraDiceLabel}${damageBonusLabel}`
                                        return (
                                            <div
                                                key={weapon.id}
                                                className="w-full border border-red-500/80 rounded-lg bg-zinc-900/70 overflow-hidden"
                                            >
                                            <div className="flex flex-col gap-3 px-4 pt-3 pb-0 border-b border-zinc-700/70">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-white font-text text-lg">
                                                            {capitalizeFirst(weapon.name)}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExpandedWeaponIds((prev) =>
                                                                    prev.includes(weapon.id)
                                                                        ? prev.filter((id) => id !== weapon.id)
                                                                        : [...prev, weapon.id]
                                                                )
                                                            }}
                                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                                            title="Descrição da arma"
                                                            aria-label="Descrição da arma"
                                                        >
                                                            {expandedWeaponIds.includes(weapon.id)
                                                                ? <EyeOff size={16} />
                                                                : <Eye size={16} />
                                                            }
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openWeaponEdit(weapon)}
                                                            disabled={isUnarmedWeapon}
                                                            className="text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title={isUnarmedWeapon ? "Arma desarmada não pode ser editada" : "Editar arma"}
                                                            aria-label="Editar arma"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (isUnarmedWeapon) return
                                                                setWeaponToRemove(weapon)
                                                                setIsWeaponRemoveConfirmOpen(true)
                                                            }}
                                                            disabled={isUnarmedWeapon}
                                                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title={isUnarmedWeapon ? "Arma desarmada não pode ser removida" : "Remover arma"}
                                                            aria-label="Remover arma"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {expandedWeaponIds.includes(weapon.id) && (
                                                    <div className="text-sm text-zinc-300 font-text">
                                                        {weapon.description?.trim()
                                                            ? weapon.description
                                                            : "Descrição não disponível."}
                                                    </div>
                                                )}
                                                <div className="-mx-4 w-[calc(100%+2rem)] flex flex-col text-sm text-zinc-300 font-text divide-y divide-zinc-700 border border-zinc-700/70 border-x-0 border-b-0 rounded-none overflow-hidden">
                                                    <div className="px-4 py-2 text-left">
                                                        Categoria: {formatEnum(weapon.category)}
                                                    </div>
                                                    <div className="px-4 py-2 text-left">
                                                        Alcance: {formatEnum(weapon.weapon_range)}
                                                    </div>
                                                    <div className="px-4 py-2 text-left">
                                                        Margem: {weapon.threat_margin}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 text-sm text-zinc-200">
                                                <button
                                                    type="button"
                                                    onClick={() => handleWeaponTestRoll(weapon)}
                                                    className="py-2 border-r border-zinc-700 hover:bg-zinc-800 transition-colors font-text flex flex-col items-center leading-tight text-blue-300"
                                                >
                                                    <span>Teste</span>
                                                    <span className="text-xs text-blue-200">
                                                        {getWeaponTestFormula(weapon, specialAttackAttackBonus)}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleWeaponDamageRoll(weapon, false)}
                                                    className="py-2 border-r border-zinc-700 hover:bg-zinc-800 transition-colors font-text text-red-300 flex flex-col items-center leading-tight"
                                                >
                                                    <span>Normal</span>
                                                    <span className="text-xs text-red-200">
                                                        {effectiveDamageFormula}
                                                        {damageExtraLabel}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleWeaponDamageRoll(weapon, true)}
                                                    className="py-2 hover:bg-zinc-800 transition-colors font-text text-red-400 flex flex-col items-center leading-tight"
                                                >
                                                    <span>Crítico</span>
                                                    <span className="text-xs text-red-300">
                                                        {getCriticalDamageLabel(weapon, effectiveDamageFormula)}
                                                        {damageExtraLabel}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        )
                                    })}
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-3 mt-4">
                                <div className="text-zinc-300 font-text text-sm uppercase tracking-wide">
                                    Equipamentos
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setItemPickerMode("list")
                                        setItemForm({ ...itemFormDefaults })
                                        setItemSearch("")
                                        setItemToEdit(null)
                                        setIsItemPickerOpen(true)
                                    }}
                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded flex items-center gap-2 font-text"
                                >
                                    <Plus size={16} />
                                    Adicionar item
                                </button>
                            </div>
                            {equipmentEntries.length === 0 ? (
                                <div className="text-zinc-300 font-text">
                                    Nenhum equipamento registrado.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {equipmentEntries.map((item) => {
                                        const isExpanded = expandedItemIds.includes(item.id)
                                        const canManage = typeof item.id === "number"
                                        const editPayload: ItemSummary = {
                                            id: typeof item.id === "number" ? item.id : 0,
                                            name: item.name,
                                            description: item.description ?? "",
                                            category: item.category ?? "",
                                            space: item.space
                                        }

                                        return (
                                            <div
                                                key={item.id}
                                                className="w-full border border-blue-500/80 rounded-lg bg-zinc-900/70 overflow-hidden"
                                            >
                                                <div className="flex flex-col gap-2 px-4 pt-3 pb-0 border-b border-zinc-700/70">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-white font-text text-lg">
                                                                {capitalizeFirst(item.name)}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExpandedItemIds((prev) =>
                                                                        prev.includes(item.id)
                                                                            ? prev.filter((id) => id !== item.id)
                                                                            : [...prev, item.id]
                                                                    )
                                                                }}
                                                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                                                title="Descrição do item"
                                                                aria-label="Descrição do item"
                                                            >
                                                                {isExpanded
                                                                    ? <EyeOff size={16} />
                                                                    : <Eye size={16} />
                                                                }
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!canManage) return
                                                                    openItemEdit(editPayload)
                                                                }}
                                                                disabled={!canManage}
                                                                className="text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                title="Editar item"
                                                                aria-label="Editar item"
                                                            >
                                                                <Pencil size={18} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!canManage) return
                                                                    setItemToRemove(editPayload)
                                                                    setIsItemRemoveConfirmOpen(true)
                                                                }}
                                                                disabled={!canManage}
                                                                className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                title="Remover item"
                                                                aria-label="Remover item"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="text-sm text-zinc-300 font-text">
                                                            {item.description?.trim()
                                                                ? item.description
                                                                : "Descrição não disponível."}
                                                        </div>
                                                    )}
                                                    <div className="-mx-4 w-[calc(100%+2rem)] flex flex-col text-sm text-zinc-300 font-text divide-y divide-zinc-700 border border-zinc-700/70 border-x-0 border-b-0 rounded-none overflow-hidden">
                                                        <div className="px-4 py-2 text-left">
                                                            Categoria: {item.category?.trim() ? formatEnum(item.category) : "-"}
                                                        </div>
                                                        <div className="px-4 py-2 text-left">
                                                            Espaço: {item.space}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Card Rituais */}
                        <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3">
                                <h1 className="text-blue-400 font-smalltitle text-2xl">Rituais</h1>
                                <button
                                    type="button"
                                    onClick={() => {
                                        openRitualPicker("manual")
                                    }}
                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded flex items-center gap-2 font-text"
                                >
                                    <Plus size={16} />
                                    Adicionar ritual
                                </button>
                            </div>
                            {hasRitualCaster && (
                                <div className="text-xs text-zinc-400 font-text">
                                    Escolhido Pelo Outro Lado: círculo máximo {ritualCasterMaxCircle} (NEX {character.nex_total}%)
                                    {ritualCasterExtraCount > 0 ? ` | Rituais bônus: ${ritualCasterExtraCount}` : ""}
                                </div>
                            )}
                            {rituals.length === 0 && (
                                <div className="text-zinc-300 font-text">
                                    Nenhum ritual registrado.
                                </div>
                            )}
                            {rituals.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {rituals.map(renderRitualItem)}
                                </div>
                            )}
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
            <Modal
                isOpen={isOriginInfoOpen}
                onClose={() => setIsOriginInfoOpen(false)}
                className="w-[min(100%-1.5rem,32rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Origem</div>
                    <button
                        type="button"
                        onClick={() => setIsOriginInfoOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    <div className="text-lg text-white">{originLabel}</div>
                    <div className="flex flex-col gap-1">
                        <span className="text-zinc-400 text-sm">Descrição</span>
                        <span className="text-zinc-200">
                            {originDescription
                                ? originDescription
                                : "Descrição da origem não disponível."}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-zinc-400 text-sm">Perícias treinadas</span>
                        <span className="text-zinc-200">
                            {originExpertiseLabels.length > 0
                                ? originExpertiseLabels.join(", ")
                                : "Sem perícias treinadas registradas."}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-zinc-400 text-sm">
                            {originAbilityLabels.length > 1
                                ? "Habilidades de origem"
                                : "Habilidade de origem"}
                        </span>
                        <span className="text-zinc-200">
                            {originAbilityLabels.length > 0
                                ? originAbilityLabels.join(", ")
                                : "Sem habilidades de origem registradas."}
                        </span>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isTrailInfoOpen}
                onClose={() => setIsTrailInfoOpen(false)}
                className="w-[min(100%-1.5rem,32rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Trilha</div>
                    <button
                        type="button"
                        onClick={() => setIsTrailInfoOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    <div className="text-lg text-white">{trailLabel}</div>
                    <div className="flex flex-col gap-1">
                        <span className="text-zinc-400 text-sm">Descrição</span>
                        <span className="text-zinc-200">
                            {trailDescription
                                ? trailDescription
                                : "Descrição da trilha não disponível."}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-zinc-400 text-sm">
                            {trailAbilityDetails.length > 1
                                ? "Habilidades da trilha"
                                : "Habilidade da trilha"}
                        </span>
                        {trailAbilityDetails.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {trailAbilityDetails.map((ability) => (
                                    <div
                                        key={ability.id}
                                        className="rounded border border-zinc-700/70 bg-zinc-900/70 px-3 py-2"
                                    >
                                        <div className="text-zinc-100 font-text">
                                            {ability.name}
                                        </div>
                                        <div className="text-zinc-300 text-sm whitespace-pre-wrap">
                                            {ability.description?.trim()
                                                ? ability.description.trim()
                                                : "Descrição da habilidade não disponível."}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-zinc-200">
                                Sem habilidades de trilha registradas.
                            </span>
                        )}
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isProficienciesInfoOpen}
                onClose={() => setIsProficienciesInfoOpen(false)}
                className="w-[min(100%-1.5rem,32rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">O que são Proficiências?</div>
                    <button
                        type="button"
                        onClick={() => setIsProficienciesInfoOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-3 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    <div className="text-zinc-200 text-sm">
                        Proficiências representam o que o personagem consegue usar e/ou manusear
                        (por exemplo, armas, equipamentos, ferramentas).
                    </div>
                    <div className="text-zinc-200 text-sm">
                        Elas são concedidas por classe e habilidade e podem destravar opções e requisitos dentro da ficha.
                    </div>
                    <div className="text-lg text-white mt-1">Tipos de proficiência</div>
                    <div className="flex flex-col gap-3">
                        {proficiencyDetails.map((item) => (
                            <div
                                key={item.name}
                                className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-3"
                            >
                                <div className="text-white font-text">
                                    {formatEnum(item.name)}
                                </div>
                                <div className="text-zinc-300 text-sm">
                                    {item.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isExpertiseInfoOpen}
                onClose={() => {
                    setIsExpertiseInfoOpen(false)
                    setExpandedExpertiseInfo(null)
                }}
                className="w-[min(100%-1.5rem,52rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Perícias</div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsExpertiseInfoOpen(false)
                            setExpandedExpertiseInfo(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-3 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    {expertiseInfoList.map((name) => {
                        const label = expertiseLabelMap[name] ?? formatEnum(name)
                        const attributeKey = expertiseAttributeMap[name]
                        const attributeLabel = attributeKey
                            ? attributeLabelMap[attributeKey as keyof typeof attributeLabelMap]
                                ?? formatEnum(attributeKey.replace("atrib_", ""))
                            : ""
                        const description =
                            expertiseDescriptionMap[name] ?? "Descrição não disponível."
                        const isOpen = expandedExpertiseInfo === name
                        return (
                            <div
                                key={name}
                                className="rounded-lg border border-zinc-700 bg-zinc-900/70"
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedExpertiseInfo(isOpen ? null : name)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left"
                                    aria-expanded={isOpen}
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-white">{label}</span>
                                        {attributeLabel && (
                                            <span className="text-xs text-zinc-400">
                                                Atributo: {attributeLabel}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown
                                        className={`h-4 w-4 text-zinc-400 transition-transform ${
                                            isOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="px-3 pb-3 flex flex-col gap-2">
                                        {renderExpertiseDescription(description)}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Modal>
            <Modal
                isOpen={isAbilityModalOpen}
                onClose={() => {
                    setIsAbilityModalOpen(false)
                    setSelectedAbility(null)
                }}
                className="w-[min(100%-1.5rem,36rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Habilidade</div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsAbilityModalOpen(false)
                            setSelectedAbility(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg text-white">
                            {selectedAbility?.name ?? "Habilidade"}
                        </div>
                        <div className="text-zinc-400 text-sm">
                            {selectedAbility?.ability_type
                                ? formatEnum(selectedAbility.ability_type)
                                : "Tipo não informado"}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {selectedAbility?.is_active !== undefined && (
                            <span className="border border-blue-500/40 text-blue-200 px-2 py-0.5 rounded">
                                {selectedAbility.is_active ? "Ativa" : "Passiva"}
                            </span>
                        )}
                        {selectedAbility?.element && (
                            <span className="border border-zinc-600 text-zinc-200 px-2 py-0.5 rounded">
                                Elemento: {formatEnum(selectedAbility.element)}
                            </span>
                        )}
                        {selectedAbility?.class_name && (
                            <span className="border border-zinc-600 text-zinc-200 px-2 py-0.5 rounded">
                                Classe: {formatEnum(selectedAbility.class_name)}
                            </span>
                        )}
                        {selectedAbility?.pe_cost != null && (
                            <span className="border border-zinc-600 text-zinc-200 px-2 py-0.5 rounded">
                                PE: {selectedAbility.pe_cost}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-zinc-400 text-sm">Descrição</span>
                        <span className="text-zinc-200">
                            {selectedAbility?.description?.trim()
                                ? selectedAbility.description
                                : "Descrição não disponível."}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-zinc-400 text-sm">Requisitos</span>
                        {selectedAbilityRequirementsText ? (
                            <pre className="text-zinc-200 text-xs whitespace-pre-wrap wrap-break-words bg-black/30 rounded p-2 border border-zinc-700">
                                {selectedAbilityRequirementsText}
                            </pre>
                        ) : (
                            <span className="text-zinc-200">Sem requisitos registrados.</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-zinc-400 text-sm">Efeito</span>
                        {selectedAbilityEffectText ? (
                            <pre className="text-zinc-200 text-xs whitespace-pre-wrap wrap-break-words bg-black/30 rounded p-2 border border-zinc-700">
                                {selectedAbilityEffectText}
                            </pre>
                        ) : (
                            <span className="text-zinc-200">Efeito não disponível.</span>
                        )}
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isSpecialAttackModalOpen}
                onClose={() => setIsSpecialAttackModalOpen(false)}
                className="w-[min(100%-1.5rem,36rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Ataque Especial</div>
                    <button
                        type="button"
                        onClick={() => setIsSpecialAttackModalOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg text-white">
                            {specialAttackAbility?.name ?? "Ataque Especial"}
                        </div>
                        <div className="text-sm text-zinc-400">
                            NEX atual: {character.nex_total}% | PE atual: {currentEffort}/{character.effort_max}
                        </div>
                        <div className="text-sm text-zinc-400">{specialAttackCostLabel}</div>
                    </div>
                    {specialAttackAbility?.description?.trim() && (
                        <div className="text-sm text-zinc-300">{specialAttackAbility.description}</div>
                    )}
                    <div className="flex flex-col gap-2">
                        <span className="text-zinc-400 text-sm">Bônus</span>
                        {availableSpecialAttackOptions.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {availableSpecialAttackOptions.map((option) => {
                                    const isSelected =
                                        specialAttackOption?.bonus === option.bonus &&
                                        specialAttackOption?.peCost === option.peCost &&
                                        specialAttackOption?.nexMin === option.nexMin
                                    return (
                                        <button
                                            key={`${option.nexMin}-${option.peCost}-${option.bonus}`}
                                            type="button"
                                            onClick={() => setSpecialAttackOption(option)}
                                            className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors ${
                                                isSelected
                                                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                                    : "border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-emerald-400/60"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-text">+{option.bonus}</span>
                                                <span className="text-xs text-zinc-400">PE {option.peCost}</span>
                                            </div>
                                            <span className="text-xs text-zinc-400">NEX {option.nexMin}%+</span>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-300">
                                Nenhum bônus disponível para o NEX atual.
                            </div>
                        )}
                        {specialAttackOption && !canAffordSpecialAttack && (
                            <div className="text-xs text-red-400">
                                PE insuficiente para o bônus selecionado.
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-zinc-400 text-sm">Aplicar em</span>
                        {specialAttackTargets.length > 1 ? (
                            <div className="flex flex-wrap gap-2">
                                {specialAttackTargets.map((target) => (
                                    <button
                                        key={target}
                                        type="button"
                                        onClick={() => setSpecialAttackTarget(target)}
                                        className={`px-3 py-2 rounded border text-sm font-text transition-colors ${
                                            specialAttackTarget === target
                                                ? "bg-blue-500 border-blue-400 text-black"
                                                : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-blue-400/60"
                                        }`}
                                    >
                                        {target === "attack" ? "Teste de ataque" : "Rolagem de dano"}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-200">
                                {specialAttackTargets[0] === "attack"
                                    ? "Teste de ataque"
                                    : "Rolagem de dano"}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-zinc-700/70 pt-3">
                        <button
                            type="button"
                            onClick={() => setIsSpecialAttackModalOpen(false)}
                            className="px-3 py-2 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleApplySpecialAttack}
                            disabled={!specialAttackOption || !canAffordSpecialAttack}
                            className="px-3 py-2 rounded bg-emerald-500 text-black hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {specialAttackTarget === "attack" ? "Preparar para teste" : "Preparar para dano"}
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isElementSpecialistOpen}
                onClose={() => setIsElementSpecialistOpen(false)}
                className="w-[min(100%-1.5rem,26rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Especialista em Elemento</div>
                    <button
                        type="button"
                        onClick={() => setIsElementSpecialistOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Selecione um elemento para receber +2 na DT de resistir a rituais.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {elementSpecialistOptions.map((option) => {
                            const isSelected =
                                elementSpecialistChoice
                                && normalizeText(option.value) === normalizeText(elementSpecialistChoice)
                            const style =
                                elementSpecialistStyleMap[option.value] ?? elementSpecialistStyleMap.conhecimento
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelectElementSpecialist(option.value)}
                                    className={`px-3 py-2 rounded border text-sm font-text transition-colors ${
                                        isSelected ? style.selected : style.base
                                    }`}
                                >
                                    {option.label}
                                </button>
                            )
                        })}
                    </div>
                    {elementSpecialistChoice && (
                        <div className="text-xs text-zinc-400">
                            Selecionado: {formatEnum(elementSpecialistChoice)}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={isElementMasterOpen}
                onClose={() => setIsElementMasterOpen(false)}
                className="w-[min(100%-1.5rem,26rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Mestre em Elemento</div>
                    <button
                        type="button"
                        onClick={() => setIsElementMasterOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Selecione um elemento para reduzir em 1 PE os rituais desse elemento.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {elementSpecialistOptions.map((option) => {
                            const isSelected =
                                elementMasterChoice
                                && normalizeText(option.value) === normalizeText(elementMasterChoice)
                            const style =
                                elementSpecialistStyleMap[option.value] ?? elementSpecialistStyleMap.conhecimento
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelectElementMaster(option.value)}
                                    className={`px-3 py-2 rounded border text-sm font-text transition-colors ${
                                        isSelected ? style.selected : style.base
                                    }`}
                                >
                                    {option.label}
                                </button>
                            )
                        })}
                    </div>
                    {elementMasterChoice && (
                        <div className="text-xs text-zinc-400">
                            Selecionado: {formatEnum(elementMasterChoice)}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={isRitualPrediletoOpen}
                onClose={() => setIsRitualPrediletoOpen(false)}
                className="w-[min(100%-1.5rem,30rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Ritual Predileto</div>
                    <button
                        type="button"
                        onClick={() => setIsRitualPrediletoOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    <div className="text-zinc-200">
                        Selecione um ritual conhecido para reduzir em 1 PE o custo de conjurá-lo.
                    </div>
                    {rituals.length === 0 && (
                        <div className="text-sm text-zinc-400">
                            Nenhum ritual disponível para selecionar.
                        </div>
                    )}
                    {rituals.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {rituals.map((ritual) => {
                                const isSelected = ritualPrediletoId === ritual.id
                                return (
                                    <button
                                        key={ritual.id}
                                        type="button"
                                        onClick={() => handleSelectRitualPredileto(ritual.id)}
                                        className={`rounded border px-3 py-2 text-left text-sm transition-colors ${
                                            isSelected
                                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-100"
                                                : "border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:border-emerald-500/60"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-text">{ritual.name}</span>
                                            <span className="text-xs text-zinc-400">
                                                Círculo {ritual.circle}
                                            </span>
                                        </div>
                                        <div className="text-xs text-zinc-400">
                                            {formatEnum(ritual.element)} | {formatEnum(ritual.execution)}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {ritualPrediletoId && (
                        <div className="text-xs text-zinc-400">
                            Selecionado: {rituals.find((ritual) => ritual.id === ritualPrediletoId)?.name}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={isAbilityPickerOpen}
                onClose={() => {
                    setIsAbilityPickerOpen(false)
                    setAbilitySearch("")
                }}
                className="w-[min(100%-1.5rem,40rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Adicionar habilidade</div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsAbilityPickerOpen(false)
                            setAbilitySearch("")
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    <input
                        type="text"
                        value={abilitySearch}
                        onChange={(e) => setAbilitySearch(e.target.value)}
                        placeholder="Buscar habilidade..."
                        className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                    />
                    {isAbilityOptionsLoading && (
                        <div className="text-zinc-300">Carregando habilidades...</div>
                    )}
                    {!isAbilityOptionsLoading && availableAbilities.length === 0 && (
                        <div className="text-zinc-300">
                            {abilitySearchTerm
                                ? "Nenhuma habilidade encontrada."
                                : "Nenhuma habilidade disponível para adicionar."}
                        </div>
                    )}
                    {!isAbilityOptionsLoading && availableAbilities.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {availableAbilities.map((ability) => {
                                const requirementIssues = getAbilityRequirementIssues(ability)
                                const canAdd = requirementIssues.length === 0
                                return (
                                    <div
                                        key={ability.id}
                                        className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3 bg-zinc-900/70"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-white">{ability.name}</span>
                                                <span className="text-xs text-zinc-400">
                                                    {ability.is_active ? "Ativa" : "Passiva"} | PE {ability.pe_cost ?? 0}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddAbility(ability)}
                                                disabled={isAddingAbility || !canAdd}
                                                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded text-sm font-text"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                        {requirementIssues.length > 0 && (
                                            <div className="text-xs text-red-400">
                                                Requisitos: {requirementIssues.join("; ")}
                                            </div>
                                        )}
                                        {ability.description?.trim() && (
                                            <div className="text-sm text-zinc-300">
                                                {ability.description}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={isWeaponPickerOpen}
                onClose={() => {
                    setIsWeaponPickerOpen(false)
                    setWeaponSearch("")
                    setWeaponPickerMode("list")
                    setWeaponToEdit(null)
                }}
                className="w-[min(100%-1.5rem,40rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">
                        {weaponPickerMode === "edit" ? "Editar arma" : "Adicionar arma"}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsWeaponPickerOpen(false)
                            setWeaponSearch("")
                            setWeaponPickerMode("list")
                            setWeaponToEdit(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    {weaponPickerMode !== "edit" && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setWeaponPickerMode("list")}
                                className={`px-3 py-2 rounded text-sm font-text border ${
                                    weaponPickerMode === "list"
                                        ? "bg-blue-500 border-blue-400 text-black"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                }`}
                            >
                                Catálogo
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setWeaponPickerMode("custom")
                                    setWeaponForm({ ...weaponFormDefaults })
                                    setWeaponToEdit(null)
                                }}
                                className={`px-3 py-2 rounded text-sm font-text border ${
                                    weaponPickerMode === "custom"
                                        ? "bg-blue-500 border-blue-400 text-black"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                }`}
                            >
                                Arma personalizada
                            </button>
                        </div>
                    )}

                    {weaponPickerMode === "list" && (
                        <>
                            <input
                                type="text"
                                value={weaponSearch}
                                onChange={(e) => setWeaponSearch(e.target.value)}
                                placeholder="Buscar arma..."
                                className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                            />
                            {isWeaponOptionsLoading && (
                                <div className="text-zinc-300">Carregando armas...</div>
                            )}
                            {!isWeaponOptionsLoading && availableWeapons.length === 0 && (
                                <div className="text-zinc-300">
                                    {weaponSearchTerm
                                        ? "Nenhuma arma encontrada."
                                        : "Nenhuma arma disponível para adicionar."}
                                </div>
                            )}
                            {!isWeaponOptionsLoading && availableWeapons.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    {availableWeapons.map((weapon) => (
                                        <div
                                            key={weapon.id}
                                            className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3 bg-zinc-900/70"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-white">{capitalizeFirst(weapon.name)}</span>
                                                    <span className="text-xs text-zinc-400">
                                                        {formatEnum(weapon.category)} | Dano {weapon.damage_formula} |{" "}
                                                        {formatEnum(weapon.weapon_range)} | Crítico {weapon.threat_margin}x{weapon.critical_multiplier}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddWeapon(weapon)}
                                                    disabled={isAddingWeapon}
                                                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded text-sm font-text"
                                                >
                                                    Adicionar
                                                </button>
                                            </div>
                                            {weapon.description?.trim() && (
                                                <div className="text-sm text-zinc-300">
                                                    {weapon.description}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {weaponPickerMode === "custom" && (
                        <form className="flex flex-col gap-3" onSubmit={handleCreateWeapon}>
                            <FloatingInput
                                label="Nome da arma"
                                name="name"
                                value={weaponForm.name}
                                onChange={handleWeaponInputChange}
                                required
                            />
                            <textarea
                                name="description"
                                value={weaponForm.description}
                                onChange={handleWeaponTextAreaChange}
                                placeholder="Descrição"
                                className="w-full min-h-24 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FloatingInput
                                    label="Categoria (ex: tática)"
                                    name="category"
                                    value={weaponForm.category}
                                    onChange={handleWeaponInputChange}
                                    required
                                />
                                <FloatingInput
                                    label="Dano (ex: 1d6)"
                                    name="damage_formula"
                                    value={weaponForm.damage_formula}
                                    onChange={handleWeaponInputChange}
                                    required
                                />
                                <FloatingInput
                                    label="Margem de ameaça"
                                    name="threat_margin"
                                    type="number"
                                    value={weaponForm.threat_margin}
                                    onChange={handleWeaponInputChange}
                                    min={1}
                                    max={20}
                                    step={1}
                                    required
                                />
                                <FloatingInput
                                    label="Multiplicador crítico"
                                    name="critical_multiplier"
                                    type="number"
                                    value={weaponForm.critical_multiplier}
                                    onChange={handleWeaponInputChange}
                                    min={1}
                                    step={1}
                                    required
                                />
                                <FloatingSelect
                                    label="Alcance"
                                    name="weapon_range"
                                    value={weaponForm.weapon_range}
                                    options={weaponRangeOptions}
                                    onChange={handleWeaponSelectChange}
                                />
                                <FloatingSelect
                                    label="Tipo de arma"
                                    name="weapon_type"
                                    value={weaponForm.weapon_type}
                                    options={weaponTypeOptions}
                                    onChange={handleWeaponSelectChange}
                                />
                                <FloatingSelect
                                    label="Proficiência necessária"
                                    name="proficiency_required"
                                    value={weaponForm.proficiency_required}
                                    options={weaponProficiencyOptions}
                                    onChange={handleWeaponSelectChange}
                                />
                                <FloatingInput
                                    label="Espaço"
                                    name="space"
                                    type="number"
                                    value={weaponForm.space}
                                    onChange={handleWeaponInputChange}
                                    min={0}
                                    step={1}
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWeaponPickerMode("list")}
                                    className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                                >
                                    Voltar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingWeapon}
                                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                                >
                                    {isCreatingWeapon ? "Criando..." : "Criar e adicionar"}
                                </button>
                            </div>
                        </form>
                    )}

                    {weaponPickerMode === "edit" && (
                        <form className="flex flex-col gap-3" onSubmit={handleUpdateWeapon}>
                            <FloatingInput
                                label="Nome da arma"
                                name="name"
                                value={weaponForm.name}
                                onChange={handleWeaponInputChange}
                                required
                            />
                            <textarea
                                name="description"
                                value={weaponForm.description}
                                onChange={handleWeaponTextAreaChange}
                                placeholder="Descrição"
                                className="w-full min-h-24 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FloatingInput
                                    label="Categoria (ex: tática)"
                                    name="category"
                                    value={weaponForm.category}
                                    onChange={handleWeaponInputChange}
                                    required
                                />
                                <FloatingInput
                                    label="Dano (ex: 1d6)"
                                    name="damage_formula"
                                    value={weaponForm.damage_formula}
                                    onChange={handleWeaponInputChange}
                                    required
                                />
                                <FloatingInput
                                    label="Margem de ameaça"
                                    name="threat_margin"
                                    type="number"
                                    value={weaponForm.threat_margin}
                                    onChange={handleWeaponInputChange}
                                    min={1}
                                    max={20}
                                    step={1}
                                    required
                                />
                                <FloatingInput
                                    label="Multiplicador crítico"
                                    name="critical_multiplier"
                                    type="number"
                                    value={weaponForm.critical_multiplier}
                                    onChange={handleWeaponInputChange}
                                    min={1}
                                    step={1}
                                    required
                                />
                                <FloatingSelect
                                    label="Alcance"
                                    name="weapon_range"
                                    value={weaponForm.weapon_range}
                                    options={weaponRangeOptions}
                                    onChange={handleWeaponSelectChange}
                                />
                                <FloatingSelect
                                    label="Tipo de arma"
                                    name="weapon_type"
                                    value={weaponForm.weapon_type}
                                    options={weaponTypeOptions}
                                    onChange={handleWeaponSelectChange}
                                />
                                <FloatingSelect
                                    label="Proficiência necessária"
                                    name="proficiency_required"
                                    value={weaponForm.proficiency_required}
                                    options={weaponProficiencyOptions}
                                    onChange={handleWeaponSelectChange}
                                />
                                <FloatingInput
                                    label="Espaço"
                                    name="space"
                                    type="number"
                                    value={weaponForm.space}
                                    onChange={handleWeaponInputChange}
                                    min={0}
                                    step={1}
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsWeaponPickerOpen(false)
                                        setWeaponPickerMode("list")
                                        setWeaponToEdit(null)
                                    }}
                                    className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingWeapon}
                                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                                >
                                    {isCreatingWeapon ? "Salvando..." : "Salvar alterações"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={isItemPickerOpen}
                onClose={() => {
                    setIsItemPickerOpen(false)
                    setItemSearch("")
                    setItemPickerMode("list")
                    setItemForm({ ...itemFormDefaults })
                    setItemToEdit(null)
                }}
                className="w-[min(100%-1.5rem,40rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">
                        {itemPickerMode === "edit"
                            ? "Editar item"
                            : itemPickerMode === "custom"
                                ? "Criar item"
                                : "Adicionar item"}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsItemPickerOpen(false)
                            setItemSearch("")
                            setItemPickerMode("list")
                            setItemForm({ ...itemFormDefaults })
                            setItemToEdit(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    {itemPickerMode !== "edit" && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setItemPickerMode("list")
                                    setItemToEdit(null)
                                }}
                                className={`px-3 py-2 rounded text-sm font-text border ${
                                    itemPickerMode === "list"
                                        ? "bg-blue-500 border-blue-400 text-black"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                }`}
                            >
                                Catálogo
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setItemPickerMode("custom")
                                    setItemForm({ ...itemFormDefaults })
                                    setItemToEdit(null)
                                }}
                                className={`px-3 py-2 rounded text-sm font-text border ${
                                    itemPickerMode === "custom"
                                        ? "bg-blue-500 border-blue-400 text-black"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                }`}
                            >
                                Item personalizado
                            </button>
                        </div>
                    )}

                    {itemPickerMode === "list" && (
                        <>
                            <input
                                type="text"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                                placeholder="Buscar item..."
                                className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                            />
                            {isItemOptionsLoading && (
                                <div className="text-zinc-300">Carregando itens...</div>
                            )}
                            {!isItemOptionsLoading && availableItems.length === 0 && (
                                <div className="text-zinc-300">
                                    {itemSearchTerm
                                        ? "Nenhum item encontrado."
                                        : "Nenhum item disponível para adicionar."}
                                </div>
                            )}
                            {!isItemOptionsLoading && availableItems.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    {availableItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3 bg-zinc-900/70"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-white">{item.name}</span>
                                                    <span className="text-xs text-zinc-400">
                                                        {formatEnum(item.category)} | Espaço {item.space}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddItem(item)}
                                                    disabled={isAddingItem}
                                                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded text-sm font-text"
                                                >
                                                    Adicionar
                                                </button>
                                            </div>
                                            {item.description?.trim() && (
                                                <div className="text-sm text-zinc-300">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {itemPickerMode === "custom" && (
                        <form className="flex flex-col gap-3" onSubmit={handleCreateItem}>
                            <FloatingInput
                                label="Nome do item"
                                name="name"
                                value={itemForm.name}
                                onChange={handleItemInputChange}
                                required
                            />
                            <textarea
                                name="description"
                                value={itemForm.description}
                                onChange={handleItemTextAreaChange}
                                placeholder="Descrição"
                                className="w-full min-h-24 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FloatingInput
                                    label="Categoria (ex: ferramenta)"
                                    name="category"
                                    value={itemForm.category}
                                    onChange={handleItemInputChange}
                                    required
                                />
                                <FloatingInput
                                    label="Espaço"
                                    name="space"
                                    type="number"
                                    value={itemForm.space}
                                    onChange={handleItemInputChange}
                                    min={0}
                                    step={1}
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsItemPickerOpen(false)
                                        setItemSearch("")
                                        setItemPickerMode("list")
                                        setItemForm({ ...itemFormDefaults })
                                        setItemToEdit(null)
                                    }}
                                    className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingItem}
                                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                                >
                                    {isCreatingItem ? "Salvando..." : "Criar item"}
                                </button>
                            </div>
                        </form>
                    )}

                    {itemPickerMode === "edit" && (
                        <form className="flex flex-col gap-3" onSubmit={handleUpdateItem}>
                            <FloatingInput
                                label="Nome do item"
                                name="name"
                                value={itemForm.name}
                                onChange={handleItemInputChange}
                                required
                            />
                            <textarea
                                name="description"
                                value={itemForm.description}
                                onChange={handleItemTextAreaChange}
                                placeholder="Descrição"
                                className="w-full min-h-24 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FloatingInput
                                    label="Categoria (ex: ferramenta)"
                                    name="category"
                                    value={itemForm.category}
                                    onChange={handleItemInputChange}
                                    required
                                />
                                <FloatingInput
                                    label="Espaço"
                                    name="space"
                                    type="number"
                                    value={itemForm.space}
                                    onChange={handleItemInputChange}
                                    min={0}
                                    step={1}
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsItemPickerOpen(false)
                                        setItemSearch("")
                                        setItemPickerMode("list")
                                        setItemForm({ ...itemFormDefaults })
                                        setItemToEdit(null)
                                    }}
                                    className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingItem}
                                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                                >
                                    {isCreatingItem ? "Salvando..." : "Salvar alterações"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={isRitualPickerOpen}
                onClose={() => {
                    setIsRitualPickerOpen(false)
                    setRitualSearch("")
                    setRitualPickerMode("list")
                    setRitualForm({ ...ritualFormDefaults })
                    setRitualToEdit(null)
                    setRitualPickerSource("manual")
                }}
                className="w-[min(100%-1.5rem,40rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">
                        {ritualPickerMode === "edit"
                            ? "Editar ritual"
                            : ritualPickerMode === "custom"
                                ? "Criar ritual"
                                : "Adicionar ritual"}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsRitualPickerOpen(false)
                            setRitualSearch("")
                            setRitualPickerMode("list")
                            setRitualForm({ ...ritualFormDefaults })
                            setRitualToEdit(null)
                            setRitualPickerSource("manual")
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text overflow-y-auto max-h-[calc(90vh-3.5rem)]">
                    {ritualPickerSource === "ritual_caster" && hasRitualCaster && (
                        <div className="rounded border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-100">
                            Escolhido Pelo Outro Lado: pode escolher {ritualCasterExtraCount} rituais bônus.
                            {" "}Já possui {rituals.length}. Disponíveis: {ritualCasterRemainingCount}.
                        </div>
                    )}
                    {ritualPickerMode !== "edit" && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setRitualPickerMode("list")}
                                className={`px-3 py-2 rounded text-sm font-text border ${
                                    ritualPickerMode === "list"
                                        ? "bg-blue-500 border-blue-400 text-black"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                }`}
                            >
                                Catálogo
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRitualPickerMode("custom")
                                    setRitualForm({ ...ritualFormDefaults })
                                }}
                                className={`px-3 py-2 rounded text-sm font-text border ${
                                    ritualPickerMode === "custom"
                                        ? "bg-blue-500 border-blue-400 text-black"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-200"
                                }`}
                            >
                                Ritual personalizado
                            </button>
                        </div>
                    )}

                    {ritualPickerMode === "list" && (
                        <>
                            <input
                                type="text"
                                value={ritualSearch}
                                onChange={(e) => setRitualSearch(e.target.value)}
                                placeholder="Buscar ritual..."
                                className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                            />
                            {hasRitualCaster && (
                                <div className="text-xs text-zinc-400">
                                    Círculo máximo disponível: {ritualCasterMaxCircle} (NEX {character.nex_total}%).
                                </div>
                            )}
                            {isRitualOptionsLoading && (
                                <div className="text-zinc-300">Carregando rituais...</div>
                            )}
                            {!isRitualOptionsLoading && availableRituals.length === 0 && (
                                <div className="text-zinc-300">
                                    {ritualSearchTerm
                                        ? "Nenhum ritual encontrado."
                                        : "Nenhum ritual disponível para adicionar."}
                                </div>
                            )}
                            {!isRitualOptionsLoading && availableRituals.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    {availableRituals.map((ritual) => (
                                        <div
                                            key={ritual.id}
                                            className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3 bg-zinc-900/70"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex flex-col gap-1">
                                                    {(() => {
                                                        const normalizedElement = normalizeText(ritual.element ?? "")
                                                        const ritualElementReduction =
                                                            hasElementMaster
                                                            && elementMasterChoice
                                                            && normalizeText(elementMasterChoice) === normalizedElement
                                                                ? 1
                                                                : 0
                                                        const ritualPrediletoReduction =
                                                            hasRitualPredileto && ritualPrediletoId === ritual.id
                                                                ? 1
                                                                : 0
                                                        const ritualRangeReduction =
                                                            hasTatuagemRitualistica
                                                            && normalizeText(ritual.ritual_range ?? "") === "pessoal"
                                                                ? 1
                                                                : 0
                                                        const ritualCostReduction =
                                                            ritualElementReduction
                                                            + ritualPrediletoReduction
                                                            + ritualRangeReduction
                                                        const standardCost = applyRitualCostReduction(
                                                            ritual.pe_cost_standard,
                                                            ritualCostReduction
                                                        )
                                                        const discenteCost = applyRitualCostReduction(
                                                            ritual.pe_cost_discente,
                                                            ritualCostReduction
                                                        )
                                                        const verdadeiroCost = applyRitualCostReduction(
                                                            ritual.pe_cost_verdadeiro,
                                                            ritualCostReduction
                                                        )
                                                        return (
                                                            <>
                                                                <span className="text-white">{ritual.name}</span>
                                                                <span className="text-xs text-zinc-400">
                                                                    Círculo {ritual.circle} | {formatEnum(ritual.element)} |{" "}
                                                                    {formatEnum(ritual.execution)}
                                                                </span>
                                                                <span className="text-xs text-zinc-400">
                                                                    PE padrão {standardCost} | Discente{" "}
                                                                    {discenteCost} | Verdadeiro{" "}
                                                                    {verdadeiroCost}
                                                                </span>
                                                                {ritualCostReduction > 0 && (
                                                                    <span className="text-[11px] text-emerald-200 flex flex-wrap gap-x-2">
                                                                        {ritualElementReduction > 0 && (
                                                                            <span>
                                                                                Mestre em Elemento: -{ritualElementReduction} PE
                                                                            </span>
                                                                        )}
                                                                        {ritualPrediletoReduction > 0 && (
                                                                            <span>
                                                                                Ritual Predileto: -{ritualPrediletoReduction} PE
                                                                            </span>
                                                                        )}
                                                                        {ritualRangeReduction > 0 && (
                                                                            <span>
                                                                                Tatuagem Ritualística: -{ritualRangeReduction} PE
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddRitual(ritual)}
                                                    disabled={isAddingRitual}
                                                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded text-sm font-text"
                                                >
                                                    Adicionar
                                                </button>
                                            </div>
                                            {ritual.description?.trim() && (
                                                <div className="text-sm text-zinc-300">
                                                    {ritual.description}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {(ritualPickerMode === "custom" || ritualPickerMode === "edit") && (
                        <form
                            className="flex flex-col gap-3"
                            onSubmit={ritualPickerMode === "edit" ? handleUpdateRitual : handleCreateRitual}
                        >
                            <FloatingInput
                                label="Nome do ritual"
                                name="name"
                                value={ritualForm.name}
                                onChange={handleRitualInputChange}
                                required
                            />
                            <textarea
                                name="description"
                                value={ritualForm.description}
                                onChange={handleRitualTextAreaChange}
                                placeholder="Descrição"
                                className="w-full min-h-24 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FloatingSelect
                                    label="Círculo"
                                    name="circle"
                                    value={ritualForm.circle}
                                    options={allowedRitualCircleOptions}
                                    onChange={handleRitualSelectChange}
                                />
                                <FloatingSelect
                                    label="Execução"
                                    name="execution"
                                    value={ritualForm.execution}
                                    options={ritualExecutionOptions}
                                    onChange={handleRitualSelectChange}
                                />
                                <FloatingSelect
                                    label="Alcance"
                                    name="ritual_range"
                                    value={ritualForm.ritual_range}
                                    options={ritualRangeOptions}
                                    onChange={handleRitualSelectChange}
                                />
                                <FloatingSelect
                                    label="Duração"
                                    name="duration"
                                    value={ritualForm.duration}
                                    options={ritualDurationOptions}
                                    onChange={handleRitualSelectChange}
                                />
                                <FloatingSelect
                                    label="Elemento"
                                    name="element"
                                    value={ritualForm.element}
                                    options={ritualElementOptions}
                                    onChange={handleRitualSelectChange}
                                />
                            </div>
                            {hasRitualCaster && (
                                <div className="text-xs text-zinc-400">
                                    Círculo máximo atual: {ritualCasterMaxCircle} (NEX {character.nex_total}%).
                                </div>
                            )}
                            <textarea
                                name="description_discente"
                                value={ritualForm.description_discente}
                                onChange={handleRitualTextAreaChange}
                                placeholder="Descrição discente"
                                className="w-full min-h-20 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                                required
                            />
                            <textarea
                                name="description_verdadeiro"
                                value={ritualForm.description_verdadeiro}
                                onChange={handleRitualTextAreaChange}
                                placeholder="Descrição verdadeiro"
                                className="w-full min-h-20 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-400"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FloatingInput
                                    label="PE Discente (extra)"
                                    name="pe_cost_discente"
                                    type="number"
                                    value={ritualForm.pe_cost_discente}
                                    onChange={handleRitualInputChange}
                                    min={0}
                                    step={1}
                                    required
                                />
                                <FloatingInput
                                    label="PE Verdadeiro (extra)"
                                    name="pe_cost_verdadeiro"
                                    type="number"
                                    value={ritualForm.pe_cost_verdadeiro}
                                    onChange={handleRitualInputChange}
                                    min={0}
                                    step={1}
                                    required
                                />
                            </div>
                            <div className="text-xs text-zinc-400">
                                Custo padrão do círculo: {ritualStandardCost}. Total discente:{" "}
                                {ritualDiscenteTotal}. Total verdadeiro: {ritualVerdadeiroTotal}.
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRitualPickerOpen(false)
                                        setRitualPickerMode("list")
                                        setRitualForm({ ...ritualFormDefaults })
                                        setRitualToEdit(null)
                                    }}
                                    className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingRitual}
                                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                                >
                                    {isCreatingRitual
                                        ? "Salvando..."
                                        : ritualPickerMode === "edit"
                                            ? "Salvar alterações"
                                            : "Criar ritual"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={isRemoveConfirmOpen}
                onClose={() => {
                    setIsRemoveConfirmOpen(false)
                    setAbilityToRemove(null)
                }}
                className="w-[min(100%-1.5rem,26rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Confirmar remoção</div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsRemoveConfirmOpen(false)
                            setAbilityToRemove(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Remover a habilidade{" "}
                        <span className="text-white font-semibold">
                            {abilityToRemove?.name ?? ""}
                        </span>
                        ?
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRemoveConfirmOpen(false)
                                setAbilityToRemove(null)
                            }}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (abilityToRemove) {
                                    handleRemoveAbility(abilityToRemove)
                                }
                                setIsRemoveConfirmOpen(false)
                                setAbilityToRemove(null)
                            }}
                            disabled={!abilityToRemove || removingAbilityId === abilityToRemove?.id}
                            className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isWeaponRemoveConfirmOpen}
                onClose={() => {
                    setIsWeaponRemoveConfirmOpen(false)
                    setWeaponToRemove(null)
                }}
                className="w-[min(100%-1.5rem,26rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Confirmar remoção</div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsWeaponRemoveConfirmOpen(false)
                            setWeaponToRemove(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Remover a arma{" "}
                        <span className="text-white font-semibold">
                            {weaponToRemove?.name ? capitalizeFirst(weaponToRemove.name) : ""}
                        </span>
                        ?
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsWeaponRemoveConfirmOpen(false)
                                setWeaponToRemove(null)
                            }}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (weaponToRemove) {
                                    handleRemoveWeapon(weaponToRemove)
                                }
                                setIsWeaponRemoveConfirmOpen(false)
                                setWeaponToRemove(null)
                            }}
                            disabled={!weaponToRemove || removingWeaponId === weaponToRemove?.id}
                            className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isItemRemoveConfirmOpen}
                onClose={() => {
                    setIsItemRemoveConfirmOpen(false)
                    setItemToRemove(null)
                }}
                className="w-[min(100%-1.5rem,26rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Confirmar remoção</div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsItemRemoveConfirmOpen(false)
                            setItemToRemove(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Remover o item{" "}
                        <span className="text-white font-semibold">
                            {itemToRemove?.name ?? ""}
                        </span>
                        ?
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsItemRemoveConfirmOpen(false)
                                setItemToRemove(null)
                            }}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (itemToRemove) {
                                    handleRemoveItem(itemToRemove)
                                }
                                setIsItemRemoveConfirmOpen(false)
                                setItemToRemove(null)
                            }}
                            disabled={!itemToRemove || removingItemId === itemToRemove?.id}
                            className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isRitualRemoveConfirmOpen}
                onClose={() => {
                    setIsRitualRemoveConfirmOpen(false)
                    setRitualToRemove(null)
                }}
                className="w-[min(100%-1.5rem,26rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Confirmar remoção</div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsRitualRemoveConfirmOpen(false)
                            setRitualToRemove(null)
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Remover o ritual{" "}
                        <span className="text-white font-semibold">
                            {ritualToRemove?.name ?? ""}
                        </span>
                        ?
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRitualRemoveConfirmOpen(false)
                                setRitualToRemove(null)
                            }}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (ritualToRemove) {
                                    handleRemoveRitual(ritualToRemove)
                                }
                                setIsRitualRemoveConfirmOpen(false)
                                setRitualToRemove(null)
                            }}
                            disabled={!ritualToRemove || removingRitualId === ritualToRemove?.id}
                            className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </Modal>
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

            <Modal
                isOpen={isWeaponRollOpen}
                onClose={() => setIsWeaponRollOpen(false)}
                className="w-[min(100%-1.5rem,32rem)] font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">
                        {weaponRollResult?.title ?? "Rolagem de arma"}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsWeaponRollOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4">
                    {!weaponRollResult && (
                        <div className="text-zinc-300">Nenhuma rolagem.</div>
                    )}
                    {weaponRollResult && (
                        <div className="flex flex-col gap-2">
                            <div className="text-2xl text-white">
                                Resultado:{" "}
                                <span className="text-blue-300">
                                    {weaponRollResult.bonus
                                        ? `${weaponRollResult.total - weaponRollResult.bonus} + ${weaponRollResult.bonus} = ${weaponRollResult.total}`
                                        : weaponRollResult.total}
                                </span>
                            </div>
                            <div className="text-sm text-zinc-300">
                                Fórmula:{" "}
                                <span className="text-white">{weaponRollResult.formula}</span>
                            </div>
                            <div className="text-sm text-zinc-300">
                                Dados:{" "}
                                <span className="text-white">
                                    {weaponRollResult.dice.join(", ") || "-"}
                                </span>
                            </div>
                            {weaponRollResult.bonusParts && weaponRollResult.bonusParts.length > 0 ? (
                                <div className="text-xs text-emerald-300 flex flex-col gap-1">
                                    {weaponRollResult.bonusParts.map((part, index) => (
                                        <div key={`${part.label}-${index}`}>
                                            {part.label}: +{part.value}
                                        </div>
                                    ))}
                                </div>
                            ) : weaponRollResult.bonus ? (
                                <div className="text-xs text-emerald-300">
                                    {weaponRollResult.bonusLabel ?? "Bônus extra"}: +{weaponRollResult.bonus}
                                </div>
                            ) : null}
                            {weaponRollResult.notes && weaponRollResult.notes.length > 0 && (
                                <div className="text-xs text-emerald-200 flex flex-col gap-1">
                                    {weaponRollResult.notes.map((note, index) => (
                                        <div key={`${note}-${index}`}>{note}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

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
            <Modal
                isOpen={isQuickHandsPromptOpen}
                onClose={() => setIsQuickHandsPromptOpen(false)}
                className="w-[min(100%-1.5rem,24rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Mãos Rápidas</div>
                    <button
                        type="button"
                        onClick={() => setIsQuickHandsPromptOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Usar Mãos Rápidas?
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsQuickHandsPromptOpen(false)}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Agora não
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (handleUseQuickHands()) {
                                    setIsQuickHandsPromptOpen(false)
                                }
                            }}
                            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-black"
                        >
                            Usar (1 PE)
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isEnvoltoMisterioPromptOpen}
                onClose={() => handleConfirmEnvoltoMisterio(false)}
                className="w-[min(100%-1.5rem,24rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Envolto em Mistério</div>
                    <button
                        type="button"
                        onClick={() => handleConfirmEnvoltoMisterio(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Usar Envolto em Mistério? (+5)
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => handleConfirmEnvoltoMisterio(false)}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Agora não
                        </button>
                        <button
                            type="button"
                            onClick={() => handleConfirmEnvoltoMisterio(true)}
                            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-black"
                        >
                            Usar (+5)
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isIdentificacaoParanormalPromptOpen}
                onClose={() => handleConfirmIdentificacaoParanormal(false)}
                className="w-[min(100%-1.5rem,24rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Identificação Paranormal</div>
                    <button
                        type="button"
                        onClick={() => handleConfirmIdentificacaoParanormal(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Usar Identificação Paranormal? (+10)
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => handleConfirmIdentificacaoParanormal(false)}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Agora não
                        </button>
                        <button
                            type="button"
                            onClick={() => handleConfirmIdentificacaoParanormal(true)}
                            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-black"
                        >
                            Usar (+10)
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isPrimeiraImpressaoPromptOpen}
                onClose={() => handleConfirmPrimeiraImpressao(false)}
                className="w-[min(100%-1.5rem,24rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Primeira Impressão</div>
                    <button
                        type="button"
                        onClick={() => handleConfirmPrimeiraImpressao(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Usar Primeira Impressão? (+2d20)
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => handleConfirmPrimeiraImpressao(false)}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Agora não
                        </button>
                        <button
                            type="button"
                            onClick={() => handleConfirmPrimeiraImpressao(true)}
                            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-black"
                        >
                            Usar
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isPeritoConfigOpen}
                onClose={() => setIsPeritoConfigOpen(false)}
                className="w-[min(100%-1.5rem,30rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Perito</div>
                    <button
                        type="button"
                        onClick={() => setIsPeritoConfigOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Selecione 2 perícias treinadas (exceto Luta e Pontaria).
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                        {peritoSkillOptions.map((option) => {
                            const normalized = normalizeText(option.name)
                            const isSelected = peritoSkillDraft.some(
                                (name) => normalizeText(name) === normalized
                            )
                            const isDisabled = !isSelected && peritoSkillDraft.length >= 2
                            return (
                                <label
                                    key={option.name}
                                    className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200"
                                >
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={isSelected}
                                        disabled={isDisabled}
                                        onChange={() => togglePeritoSkill(option.name)}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            )
                        })}
                    </div>
                    <div className="text-xs text-zinc-400">
                        Selecionadas: {peritoSkillDraft.length}/2
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsPeritoConfigOpen(false)}
                            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSavePeritoSkills}
                            disabled={peritoSkillDraft.length !== 2}
                            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isPeritoUseOpen}
                onClose={() => setIsPeritoUseOpen(false)}
                className="w-[min(100%-1.5rem,26rem)] max-h-[90vh] overflow-hidden font-sans"
            >
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">Perito</div>
                    <button
                        type="button"
                        onClick={() => setIsPeritoUseOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>
                <div className="px-4 py-4 flex flex-col gap-4 font-text">
                    <div className="text-zinc-200">
                        Perícias: {peritoSkillLabels || "Nenhuma selecionada"}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {availablePeritoOptions.map((option) => {
                            const disabled = option.peCost > currentEffort
                            return (
                                <button
                                    key={option.diceSides}
                                    type="button"
                                    onClick={() => handleActivatePerito(option)}
                                    disabled={disabled}
                                    className="w-full rounded bg-zinc-900/70 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-emerald-500/60 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    +1d{option.diceSides} (PE {option.peCost})
                                </button>
                            )
                        })}
                    </div>
                </div>
            </Modal>

            <ExpertiseEditModal
                isOpen={isExpertiseEditOpen}
                form={expertiseForm}
                isSaving={isSavingExpertise}
                onClose={() => setIsExpertiseEditOpen(false)}
                onChange={handleExpertiseEditChange}
                onSubmit={handleExpertiseEditSubmit}
            />

            <LevelUpModal 
                isOpen={isLevelUpOpen}
                isLoading={isLevelingUp}
                onClose={() => setIsLevelUpOpen(false)}
                onChoose={handleConfirmLevelUp}
            />

            <LevelUpResultModal 
                diff={levelUpDiff}
                onClose={() => {
                    setLevelUpDiff(null)
                    if (shouldOpenRitualAfterLevelUp) {
                        setShouldOpenRitualAfterLevelUp(false)
                        openRitualPicker("ritual_caster")
                    }
                }}
            />
            {(pendingSpecialAttack || pendingDemolishingStrike || opportunityToast || ritualOutcomeToast || defensiveCombatActive || dualWieldActive || triggerHoldActive || sentidoTaticoActive || conhecimentoAplicadoActive || ecleticoActive || isTrilhaCertaPromptOpen) && (
                <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                    {pendingSpecialAttack && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-3 text-red-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Ataque Especial</div>
                            <div className="text-lg text-white">
                                +{pendingSpecialAttack.bonus} no {formatSpecialAttackTarget(pendingSpecialAttack.target)}
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCancelPendingSpecialAttack}
                                    className="text-xs text-red-100 hover:text-white underline underline-offset-2"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                    {pendingDemolishingStrike && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-3 text-red-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Golpe Demolidor</div>
                            <div className="text-lg text-white">+2 dados de dano</div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCancelDemolishingStrike}
                                    className="text-xs text-red-100 hover:text-white underline underline-offset-2"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                    {opportunityToast && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-amber-500/40 bg-amber-900/30 px-4 py-3 text-amber-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">{opportunityToast}</div>
                        </div>
                    )}
                    {ritualOutcomeToast && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-rose-500/40 bg-rose-900/30 px-4 py-3 text-rose-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">{ritualOutcomeToast}</div>
                        </div>
                    )}
                    {defensiveCombatActive && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-blue-500/40 bg-blue-900/30 px-4 py-3 text-blue-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Combate defensivo ativo</div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleDeactivateDefensiveCombat}
                                    className="text-xs text-blue-100 hover:text-white underline underline-offset-2"
                                >
                                    Encerrar habilidade
                                </button>
                            </div>
                        </div>
                    )}
                    {sentidoTaticoActive && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-cyan-500/40 bg-cyan-900/30 px-4 py-3 text-cyan-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Sentido Tático ativo</div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleDeactivateSentidoTatico}
                                    className="text-xs text-cyan-100 hover:text-white underline underline-offset-2"
                                >
                                    Desligar
                                </button>
                            </div>
                        </div>
                    )}
                    {conhecimentoAplicadoActive && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-emerald-500/40 bg-emerald-900/30 px-4 py-3 text-emerald-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Conhecimento Aplicado ativo</div>
                            <div className="text-xs text-emerald-200">
                                Próxima perícia (exceto Luta/Pontaria) usa Intelecto
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCancelConhecimentoAplicado}
                                    className="text-xs text-emerald-100 hover:text-white underline underline-offset-2"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                    {isTrilhaCertaPromptOpen && hasNaTrilhaCerta && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-sky-500/40 bg-sky-900/30 px-4 py-3 text-sky-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Na Trilha Certa</div>
                            <div className="text-xs text-sky-200">
                                Bônus atual: {trilhaCertaBonusDice > 0 ? `+${trilhaCertaBonusDice}d20` : "-"}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                                <button
                                    type="button"
                                    onClick={handleDeactivateTrilhaCerta}
                                    className="text-sky-100 hover:text-white underline underline-offset-2"
                                >
                                    Encerrar habilidade
                                </button>
                                <button
                                    type="button"
                                    onClick={handleActivateTrilhaCerta}
                                    disabled={!canActivateTrilhaCerta}
                                    className="text-sky-100 hover:text-white underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {trilhaCertaBonusDice > 0
                                        ? `Adicionar +1d20 (${trilhaCertaNextCost} PE)`
                                        : `Ativar +1d20 (${trilhaCertaNextCost} PE)`}
                                </button>
                            </div>
                        </div>
                    )}
                    {ecleticoActive && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-indigo-500/40 bg-indigo-900/30 px-4 py-3 text-indigo-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Eclético ativo</div>
                            <div className="text-xs text-indigo-200">
                                Próxima perícia destreinada recebe +5
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCancelEcletico}
                                    className="text-xs text-indigo-100 hover:text-white underline underline-offset-2"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                    {triggerHoldActive && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-amber-500/40 bg-amber-900/30 px-4 py-3 text-amber-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Segurar Gatilho ativo</div>
                            <div className="text-lg text-white">PE gasto: {triggerHoldSpent}</div>
                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-amber-200">
                                <span>
                                    Próximo custo: {triggerHoldNextCost > 0 ? `${triggerHoldNextCost} PE` : "-"}
                                </span>
                                <span>
                                    Total/rodada: {pePerRoundLimit > 0 ? pePerRoundLimit : "-"}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleReuseTriggerHold}
                                    disabled={!canTriggerHoldReuse}
                                    className="text-xs text-amber-100 hover:text-white underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {triggerHoldNextCost > 0
                                        ? `Reutilizar (+${triggerHoldNextCost} PE)`
                                        : "Reutilizar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeactivateTriggerHold}
                                    className="text-xs text-amber-100 hover:text-white underline underline-offset-2"
                                >
                                    Desligar
                                </button>
                            </div>
                        </div>
                    )}
                    {dualWieldActive && (
                        <div className="min-w-[16rem] max-w-88 rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-3 text-red-100 shadow-lg backdrop-blur">
                            <div className="text-sm font-text">Combater com duas armas ativo</div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleDeactivateDualWield}
                                    className="text-xs text-red-100 hover:text-white underline underline-offset-2"
                                >
                                    Encerrar habilidade
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </MainLayout>
    )
}
