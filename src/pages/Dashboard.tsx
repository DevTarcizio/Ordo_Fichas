import { Trash2 } from "lucide-react"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import { formatEnum } from "../utils"
import type { CharacterSummary } from "../types/character"
import type { DocumentSummary } from "../types/document"
import CompactStatusBar from "../components/CompactStatusBar"
import {
    attributeKeyLabelMap,
    attributeLabelMap,
    expertiseAttributeMap,
    statusConfigs,
    type StatusField,
    type StatusMaxField
} from "../characterSheetConfig"

const getOriginName = (origin: CharacterSummary["origin"]) => {
    if (!origin) return ""
    if (typeof origin === "string") return origin
    if (typeof origin === "object" && typeof origin.name === "string") {
        return origin.name
    }
    return ""
}

const replaceNoneLabel = (value: string) => {
    if (!value) return value
    return value.trim().toLowerCase() === "none" ? "Não possui" : value
}

const getStatusValue = (
    character: CharacterSummary,
    field: StatusField | StatusMaxField
) => {
    const value = character[field]
    return typeof value === "number" ? value : 0
}

const actionTypeLabels: Record<string, string> = {
    attribute_test: "Teste de Atributo",
    skill_test: "Teste de Perícia",
    attack: "Ataque",
    attack_roll: "Teste de Ataque",
    damage_roll: "Dano",
    calm: "Acalmar"
}

const formatTimestamp = (value: string) => {
    if (!value) return ""
    try {
        return new Date(value).toLocaleString("pt-BR")
    } catch {
        return value
    }
}

const formatBytes = (value: number) => {
    if (!Number.isFinite(value)) return ""
    if (value < 1024) return `${value} B`
    const kb = value / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(1)} GB`
}

const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return null
    return `/avatars/${avatar}/${avatar}.png`
}

const normalizeSkillKey = (value: unknown) => {
    if (typeof value !== "string") return ""
    return value.trim().toLowerCase().replace(/\s+/g, "_")
}

const resolveAttributeLabel = (skill: unknown, attributeLabel?: unknown) => {
    if (typeof attributeLabel === "string" && attributeLabel.trim().length > 0) {
        const normalized = normalizeSkillKey(attributeLabel)
        if (normalized && normalized in attributeKeyLabelMap) {
            return attributeKeyLabelMap[normalized as keyof typeof attributeKeyLabelMap]
        }
        return formatEnum(attributeLabel)
    }
    const normalized = normalizeSkillKey(skill)
    if (!normalized) return ""
    const attributeKey = expertiseAttributeMap[normalized]
    if (!attributeKey) return ""
    return attributeLabelMap[attributeKey] ?? formatEnum(attributeKey)
}

const computeResultValue = (
    dice: unknown,
    bonus: unknown,
    fallbackTotal: unknown,
    rollMode?: "best" | "worst" | "sum"
) => {
    const values = Array.isArray(dice)
        ? dice.filter((item): item is number => typeof item === "number")
        : []
    const bonusValue = typeof bonus === "number" ? bonus : 0
    if (values.length > 0) {
        if (rollMode === "sum") {
            return values.reduce((sum, value) => sum + value, 0) + bonusValue
        }
        if (rollMode === "worst") {
            return Math.min(...values) + bonusValue
        }
        return Math.max(...values) + bonusValue
    }
    if (typeof fallbackTotal === "number") {
        return fallbackTotal
    }
    return null
}

const normalizeDiceValues = (dice: unknown) => {
    if (!Array.isArray(dice)) return []
    return dice.filter((item): item is number => typeof item === "number")
}

const getD20ResultValue = (dice: number[], rollMode?: "best" | "worst") => {
    if (dice.length === 0) return 0
    return rollMode === "worst" ? Math.min(...dice) : Math.max(...dice)
}

const buildDiceBreakdown = (label: string, dice: number[], resultValue: number) => {
    if (dice.length === 0) return ""
    return `${label}: ${dice.join(" + ")} = ${resultValue}`
}

const buildResultLine = (
    label: string,
    diceResult: number,
    bonusValue: number,
    totalValue: number
) => {
    if (diceResult === null || diceResult === undefined) return ""
    if (diceResult === 0 && bonusValue === 0 && totalValue === 0) return ""
    if (bonusValue) {
        return `${label}: ${diceResult} + ${bonusValue} = ${totalValue}`
    }
    return `${label}: ${diceResult}`
}

const buildLogSummary = (log: ActionLogEntry) => {
    const payload = (log.payload ?? {}) as Record<string, unknown>
    if (log.action_type === "skill_test") {
        const skillLabel = formatEnum(payload.skill)
        const attributeLabel = resolveAttributeLabel(payload.skill, payload.attribute)
        const dc = typeof payload.dc === "number" ? payload.dc : null
        const success = typeof payload.success === "boolean" ? payload.success : null
        const notes = Array.isArray(payload.notes)
            ? payload.notes.filter((note) => typeof note === "string").join(" · ")
            : typeof payload.notes === "string"
                ? payload.notes
                : ""
        const dice = normalizeDiceValues(payload.dice)
        const diceCount = typeof payload.dice_count === "number" ? payload.dice_count : dice.length
        const bonusValue = typeof payload.bonus === "number" ? payload.bonus : 0
        const rollMode = payload.roll_mode === "worst" ? "worst" : "best"
        const diceResult = getD20ResultValue(dice, rollMode)
        const computedTotal = typeof payload.total === "number" ? payload.total : diceResult + bonusValue
        const breakdown = buildDiceBreakdown(`${diceCount}d20`, dice, diceResult)
        const detail = buildResultLine("Resultado", diceResult, bonusValue, computedTotal)
        const title = [skillLabel, attributeLabel].filter(Boolean).join(" · ")
        const extra = [
            dc !== null ? `DT ${dc}` : null,
            success === null ? null : success ? "Sucesso" : "Falha",
            notes || null
        ].filter(Boolean).join(" · ")
        const resultValue = computeResultValue(
            payload.dice,
            payload.bonus,
            payload.total,
            payload.roll_mode === "worst" ? "worst" : "best"
        )
        return {
            title,
            result: "",
            extra,
            resultValue,
            breakdownLines: breakdown ? [breakdown] : [],
            detailLines: detail ? [detail] : []
        }
    }

    if (log.action_type === "attribute_test") {
        const attributeLabel = resolveAttributeLabel(payload.attribute, payload.attribute)
        const dc = typeof payload.dc === "number" ? payload.dc : null
        const success = typeof payload.success === "boolean" ? payload.success : null
        const dice = normalizeDiceValues(payload.dice)
        const diceCount = typeof payload.dice_count === "number" ? payload.dice_count : dice.length
        const bonusValue = typeof payload.bonus === "number" ? payload.bonus : 0
        const rollMode = payload.roll_mode === "worst" ? "worst" : "best"
        const diceResult = getD20ResultValue(dice, rollMode)
        const computedTotal = typeof payload.total === "number" ? payload.total : diceResult + bonusValue
        const breakdown = buildDiceBreakdown(`${diceCount}d20`, dice, diceResult)
        const detail = buildResultLine("Resultado", diceResult, bonusValue, computedTotal)
        const title = attributeLabel || actionTypeLabels.attribute_test
        const extra = [
            dc !== null ? `DT ${dc}` : null,
            success === null ? null : success ? "Sucesso" : "Falha"
        ].filter(Boolean).join(" · ")
        const resultValue = computeResultValue(
            payload.dice,
            payload.bonus,
            payload.total,
            payload.roll_mode === "worst" ? "worst" : "best"
        )
        return {
            title,
            result: "",
            extra,
            resultValue,
            breakdownLines: breakdown ? [breakdown] : [],
            detailLines: detail ? [detail] : []
        }
    }

    if (log.action_type === "attack") {
        const skillLabel = formatEnum(payload.skill)
        const attackRoll = payload.attack_roll as Record<string, unknown> | undefined
        const damageRoll = payload.damage_roll as Record<string, unknown> | undefined
        const attributeLabel = resolveAttributeLabel(payload.skill)
        const title = [skillLabel, attributeLabel].filter(Boolean).join(" · ")

        const attackDice = normalizeDiceValues(attackRoll?.dice)
        const attackDiceCount = typeof attackRoll?.dice_count === "number"
            ? (attackRoll?.dice_count as number)
            : attackDice.length
        const attackBonus = typeof attackRoll?.bonus === "number" ? attackRoll.bonus : 0
        const attackRollMode = attackRoll?.roll_mode === "worst" ? "worst" : "best"
        const attackDiceResult = getD20ResultValue(attackDice, attackRollMode)
        const attackTotal = typeof attackRoll?.total === "number"
            ? attackRoll.total
            : attackDiceResult + attackBonus
        const attackBreakdown = buildDiceBreakdown(
            `Ataque ${attackDiceCount}d20`,
            attackDice,
            attackDiceResult
        )
        const attackDetail = buildResultLine(
            "Resultado ataque",
            attackDiceResult,
            attackBonus,
            attackTotal
        )

        const damageDice = normalizeDiceValues(damageRoll?.dice)
        const damageFormula = typeof damageRoll?.formula === "string" ? damageRoll.formula : ""
        const damageBonus = typeof damageRoll?.bonus === "number" ? damageRoll.bonus : 0
        const damageDiceTotal = damageDice.reduce((sum, value) => sum + value, 0)
        const damageTotal = typeof damageRoll?.total === "number"
            ? damageRoll.total
            : damageDiceTotal + damageBonus
        const damageBreakdown = buildDiceBreakdown(
            `Dano ${damageFormula || `${damageDice.length}d?`}`,
            damageDice,
            damageDiceTotal
        )
        const damageDetail = buildResultLine(
            "Resultado dano",
            damageDiceTotal,
            damageBonus,
            damageTotal
        )
        const resultValue = computeResultValue(
            attackRoll?.dice,
            attackRoll?.bonus,
            attackRoll?.total,
            attackRoll?.roll_mode === "worst" ? "worst" : "best"
        )
        return {
            title,
            result: "",
            extra: "",
            resultValue,
            breakdownLines: [attackBreakdown, damageBreakdown].filter(Boolean),
            detailLines: [attackDetail, damageDetail].filter(Boolean)
        }
    }

    if (log.action_type === "attack_roll") {
        const skillLabel = formatEnum(payload.skill)
        const attackRoll = payload.attack_roll as Record<string, unknown> | undefined
        const attributeLabel = resolveAttributeLabel(payload.skill)
        const title = [skillLabel, attributeLabel].filter(Boolean).join(" · ")
        const attackDice = normalizeDiceValues(attackRoll?.dice)
        const diceCount = typeof attackRoll?.dice_count === "number"
            ? (attackRoll?.dice_count as number)
            : attackDice.length
        const bonusValue = typeof attackRoll?.bonus === "number" ? attackRoll.bonus : 0
        const rollMode = attackRoll?.roll_mode === "worst" ? "worst" : "best"
        const diceResult = getD20ResultValue(attackDice, rollMode)
        const computedTotal = typeof attackRoll?.total === "number"
            ? attackRoll.total
            : diceResult + bonusValue
        const breakdown = buildDiceBreakdown(`${diceCount}d20`, attackDice, diceResult)
        const detail = buildResultLine("Resultado", diceResult, bonusValue, computedTotal)
        const resultValue = computeResultValue(
            attackRoll?.dice,
            attackRoll?.bonus,
            attackRoll?.total,
            attackRoll?.roll_mode === "worst" ? "worst" : "best"
        )
        return {
            title,
            result: "",
            extra: "",
            resultValue,
            breakdownLines: breakdown ? [breakdown] : [],
            detailLines: detail ? [detail] : []
        }
    }

    if (log.action_type === "damage_roll") {
        const damageRoll = payload.damage_roll as Record<string, unknown> | undefined
        const total = damageRoll && typeof damageRoll.total === "number" ? damageRoll.total : null
        const weaponName = typeof payload.weapon_name === "string" ? payload.weapon_name : ""
        const title = ""
        const result = ""
        const extra = weaponName ? `Arma: ${weaponName}` : ""
        const diceValues = normalizeDiceValues(damageRoll?.dice)
        const formula = typeof damageRoll?.formula === "string" ? damageRoll?.formula : ""
        const diceTotal = diceValues.reduce((sum, value) => sum + value, 0)
        const breakdown = buildDiceBreakdown(
            formula || `${diceValues.length}d?`,
            diceValues,
            diceTotal
        )
        const bonusValue = typeof damageRoll?.bonus === "number" ? damageRoll.bonus : 0
        const computedTotal = typeof total === "number" ? total : diceTotal + bonusValue
        const detail = buildResultLine("Resultado", diceTotal, bonusValue, computedTotal)
        return {
            title,
            result,
            extra,
            resultValue: null,
            breakdownLines: breakdown ? [breakdown] : [],
            detailLines: detail ? [detail] : []
        }
    }

    if (log.action_type === "calm") {
        const skillLabel = formatEnum(payload.skill)
        const dc = typeof payload.dc === "number" ? payload.dc : null
        const success = typeof payload.success === "boolean" ? payload.success : null
        const sanity = typeof payload.sanity_restored === "number" ? payload.sanity_restored : null
        const attributeLabel = resolveAttributeLabel(payload.skill)
        const title = [skillLabel || "Acalmar", attributeLabel].filter(Boolean).join(" · ")
        const dice = normalizeDiceValues(payload.dice)
        const diceCount = typeof payload.dice_count === "number" ? payload.dice_count : dice.length
        const bonusValue = typeof payload.bonus === "number" ? payload.bonus : 0
        const rollMode = payload.roll_mode === "worst" ? "worst" : "best"
        const diceResult = getD20ResultValue(dice, rollMode)
        const computedTotal = typeof payload.total === "number" ? payload.total : diceResult + bonusValue
        const breakdown = buildDiceBreakdown(`${diceCount}d20`, dice, diceResult)
        const detail = buildResultLine("Resultado", diceResult, bonusValue, computedTotal)
        const extra = [
            dc !== null ? `DT ${dc}` : null,
            success === null ? null : success ? "Sucesso" : "Falha",
            sanity !== null ? `Sanidade restaurada: ${sanity}` : null
        ].filter(Boolean).join(" · ")
        const resultValue = computeResultValue(
            payload.dice,
            payload.bonus,
            payload.total,
            payload.roll_mode === "worst" ? "worst" : "best"
        )
        return {
            title,
            result: "",
            extra,
            resultValue,
            breakdownLines: breakdown ? [breakdown] : [],
            detailLines: detail ? [detail] : []
        }
    }

    const fallbackTitle = formatEnum(log.action_type)
    const fallbackKeys = Object.keys(payload)
    const extra = fallbackKeys.length ? `Campos: ${fallbackKeys.join(", ")}` : ""
    const resultValue = computeResultValue(payload.dice, payload.bonus, payload.total)
    return {
        title: fallbackTitle,
        result: "",
        extra,
        resultValue,
        breakdownLines: [],
        detailLines: []
    }
}

type RealtimeCharacterStatus = {
    id: number
    name: string
    user_id: number
    healthy_points: number
    healthy_max: number
    sanity_points: number
    sanity_max: number
    effort_points: number
    effort_max: number
    investigation_points: number
    investigation_max: number
}

type ActionLogEntry = {
    id: number
    character_id: number
    user_id: number | null
    action_type: string
    payload: Record<string, unknown>
    created_at: string
}

type RealtimeMessage = {
    type: string
    character?: RealtimeCharacterStatus
    character_id?: number
    character_name?: string | null
    log?: ActionLogEntry
    document?: DocumentSummary
}

const realtimeStatusFields = [
    "healthy_points",
    "healthy_max",
    "sanity_points",
    "sanity_max",
    "effort_points",
    "effort_max",
    "investigation_points",
    "investigation_max"
] as const

type RealtimeStatusField = typeof realtimeStatusFields[number]

export default function Dashboard() {
    const { user, logout, isLoading, token } = useAuth()
    const navigate = useNavigate()
    const [characters, setCharacters] = useState<CharacterSummary[]>([])
    const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([])
    const [isLoadingLogs, setIsLoadingLogs] = useState(false)
    const [logsError, setLogsError] = useState<string | null>(null)
    const [isResettingHistory, setIsResettingHistory] = useState(false)
    const [documents, setDocuments] = useState<DocumentSummary[]>([])
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
    const [documentsError, setDocumentsError] = useState<string | null>(null)
    const [documentCharacterId, setDocumentCharacterId] = useState<number | "">("")
    const [documentFoundLocation, setDocumentFoundLocation] = useState("")
    const [documentFile, setDocumentFile] = useState<File | null>(null)
    const [isUploadingDocument, setIsUploadingDocument] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
    const [releasingDocumentId, setReleasingDocumentId] = useState<number | null>(null)
    const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null)
    const isFetchingRef = useRef(false)
    const hasFetchedLogsRef = useRef(false)
    const hasFetchedDocumentsRef = useRef(false)
    const refreshTimerRef = useRef<number | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const wsReconnectRef = useRef<number | null>(null)
    const wsHeartbeatRef = useRef<number | null>(null)
    const wsRetryRef = useRef(0)
    const documentFileInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (!user && !isLoading) {
            navigate("/")
        }
    }, [navigate, user, isLoading])

    const fetchCharacters = useCallback(async () => {
        if (!user || isFetchingRef.current) return
        isFetchingRef.current = true
        try {
            let response
            try {
                response = await api.get("/characters/list")
            } catch (err) {
                const status = (err as { response?: { status?: number } })?.response?.status
                if (status === 404 && user.role === "master") {
                    response = await api.get("/characters/list/all")
                } else {
                    throw err
                }
            }
            const formattedCharacters = response.data.characters.map((char: CharacterSummary) => ({
                ...char,
                origin: formatEnum(getOriginName(char.origin)),
                character_class: formatEnum(char.character_class),
                rank: formatEnum(char.rank)
            }))

            setCharacters(formattedCharacters)
        } catch (err) {
            console.error("Erro ao buscar personagens: ", err)
        } finally {
            isFetchingRef.current = false
        }
    }, [user])

    const fetchActionLogs = useCallback(async () => {
        if (!user || user.role !== "master") return
        setIsLoadingLogs(true)
        setLogsError(null)
        try {
            const response = await api.get("/actions/history", {
                params: { limit: 60, offset: 0 }
            })
            const logs = Array.isArray(response.data?.logs) ? response.data.logs : []
            setActionLogs(logs as ActionLogEntry[])
        } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status
            if (status === 404) {
                setActionLogs([])
                setLogsError(null)
            } else {
                console.error("Erro ao buscar histórico de testes: ", err)
                setLogsError("Erro ao buscar histórico de testes.")
            }
        } finally {
            setIsLoadingLogs(false)
            hasFetchedLogsRef.current = true
        }
    }, [user])

    const fetchDocuments = useCallback(async () => {
        if (!user || user.role !== "master") return
        setIsLoadingDocuments(true)
        setDocumentsError(null)
        try {
            const response = await api.get("/documents/")
            const list = Array.isArray(response.data?.documents) ? response.data.documents : []
            setDocuments(list as DocumentSummary[])
        } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status
            if (status === 404) {
                setDocuments([])
                setDocumentsError(null)
            } else {
                console.error("Erro ao buscar documentos: ", err)
                setDocumentsError("Erro ao buscar documentos.")
            }
        } finally {
            setIsLoadingDocuments(false)
            hasFetchedDocumentsRef.current = true
        }
    }, [user])

    const handleUploadDocument = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!user || user.role !== "master") return
        setUploadError(null)
        setUploadSuccess(null)

        if (!documentCharacterId) {
            setUploadError("Selecione um personagem.")
            return
        }
        if (!documentFoundLocation.trim()) {
            setUploadError("Informe onde o documento foi encontrado.")
            return
        }
        if (!documentFile) {
            setUploadError("Selecione um arquivo para enviar.")
            return
        }

        const formData = new FormData()
        formData.append("file", documentFile)
        formData.append("character_id", String(documentCharacterId))
        formData.append("found_location", documentFoundLocation.trim())

        try {
            setIsUploadingDocument(true)
            const response = await api.post("/documents/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            const created = response.data as DocumentSummary
            setDocuments((prev) => [created, ...prev])
            setUploadSuccess("Documento enviado com sucesso.")
            setDocumentFile(null)
            if (documentFileInputRef.current) {
                documentFileInputRef.current.value = ""
            }
        } catch (err) {
            console.error("Erro ao enviar documento: ", err)
            setUploadError("Erro ao enviar documento.")
        } finally {
            setIsUploadingDocument(false)
        }
    }, [documentCharacterId, documentFile, documentFoundLocation, user])

    const fetchDocumentBlob = useCallback(async (doc: DocumentSummary) => {
        return api.get(`/documents/${doc.id}/file`, { responseType: "blob" })
    }, [])

    const handleDownloadDocument = useCallback(async (doc: DocumentSummary) => {
        try {
            const response = await fetchDocumentBlob(doc)
            const blob = new Blob([response.data], { type: doc.content_type })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = doc.original_name
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error("Erro ao baixar documento: ", err)
            alert("Erro ao baixar documento.")
        }
    }, [fetchDocumentBlob])

    const handleSetDocumentRelease = useCallback(async (
        doc: DocumentSummary,
        isReleased: boolean,
        releasedToUserId?: number | null
    ) => {
        if (!user || user.role !== "master") return
        try {
            setReleasingDocumentId(doc.id)
            const payload = isReleased
                ? { is_released: true, released_to_user_id: releasedToUserId }
                : { is_released: false }
            const response = await api.patch(`/documents/${doc.id}/release`, payload)
            const updated = response.data as DocumentSummary
            setDocuments((prev) => prev.map((item) => (item.id === doc.id ? updated : item)))
        } catch (err) {
            console.error("Erro ao atualizar documento: ", err)
            alert("Erro ao atualizar documento.")
        } finally {
            setReleasingDocumentId(null)
        }
    }, [user])

    const handleDeleteDocument = useCallback(async (doc: DocumentSummary) => {
        if (!user || user.role !== "master") return
        const confirmDelete = window.confirm("Deseja realmente excluir este documento?")
        if (!confirmDelete) return
        try {
            setDeletingDocumentId(doc.id)
            await api.delete(`/documents/${doc.id}`)
            setDocuments((prev) => prev.filter((item) => item.id !== doc.id))
        } catch (err) {
            console.error("Erro ao excluir documento: ", err)
            alert("Erro ao excluir documento.")
        } finally {
            setDeletingDocumentId(null)
        }
    }, [user])

    const handleResetHistory = useCallback(async () => {
        if (!user || user.role !== "master") return
        const confirmReset = window.confirm("Deseja realmente limpar o histórico de testes?")
        if (!confirmReset) return
        try {
            setIsResettingHistory(true)
            await api.post("/actions/history/reset", {})
            setActionLogs([])
        } catch (err) {
            console.error("Erro ao resetar histórico: ", err)
            setLogsError("Erro ao resetar o histórico de testes.")
        } finally {
            setIsResettingHistory(false)
        }
    }, [user])

    const applyStatusUpdate = useCallback((status: RealtimeCharacterStatus) => {
        let didUpdate = false
        setCharacters((prev) => {
            const index = prev.findIndex((char) => char.id === status.id)
            if (index === -1) return prev
            const current = prev[index]
            const updated: CharacterSummary = {
                ...current,
                name: status.name ?? current.name
            }
            realtimeStatusFields.forEach((field: RealtimeStatusField) => {
                const value = status[field]
                if (typeof value === "number") {
                    updated[field] = value
                }
            })
            didUpdate = true
            return [...prev.slice(0, index), updated, ...prev.slice(index + 1)]
        })
        return didUpdate
    }, [])

    const characterMap = useMemo(() => {
        return new Map(characters.map((char) => [char.id, char]))
    }, [characters])

    useEffect(() => {
        if (!user || user.role !== "master") return
        if (hasFetchedLogsRef.current || isLoadingLogs) return
        void fetchActionLogs()
    }, [user, isLoadingLogs, fetchActionLogs])

    useEffect(() => {
        if (!user || user.role !== "master") return
        if (hasFetchedDocumentsRef.current || isLoadingDocuments) return
        void fetchDocuments()
    }, [user, isLoadingDocuments, fetchDocuments])

    useEffect(() => {
        void fetchCharacters()
    }, [fetchCharacters])

    useEffect(() => {
        if (documentCharacterId !== "" || characters.length === 0) return
        setDocumentCharacterId(characters[0].id)
    }, [characters, documentCharacterId])

    useEffect(() => {
        if (!user || user.role !== "master") return

        const refresh = () => {
            void fetchCharacters()
            void fetchActionLogs()
            void fetchDocuments()
        }

        window.addEventListener("focus", refresh)

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                refresh()
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)

        refreshTimerRef.current = window.setInterval(refresh, 60_000)

        const baseUrl = api.defaults.baseURL ?? ""
        const wsBase = baseUrl.replace(/\/$/, "").replace(/^http/i, "ws")
        const tokenValue = token ?? localStorage.getItem("token")
        let shouldReconnect = true

        const clearRealtimeTimers = () => {
            if (wsReconnectRef.current) {
                clearTimeout(wsReconnectRef.current)
                wsReconnectRef.current = null
            }
            if (wsHeartbeatRef.current) {
                clearInterval(wsHeartbeatRef.current)
                wsHeartbeatRef.current = null
            }
        }

        const connect = () => {
            if (!shouldReconnect || !tokenValue || !wsBase) return
            clearRealtimeTimers()
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close(1000, "reconnect")
            }
            const wsUrl = `${wsBase}/realtime/ws?token=${encodeURIComponent(tokenValue)}`
            const websocket = new WebSocket(wsUrl)
            wsRef.current = websocket

            websocket.onopen = () => {
                wsRetryRef.current = 0
                clearRealtimeTimers()
                wsHeartbeatRef.current = window.setInterval(() => {
                    if (websocket.readyState === WebSocket.OPEN) {
                        websocket.send("ping")
                    }
                }, 25_000)
            }

            websocket.onmessage = (event) => {
                let data: RealtimeMessage | null = null
                try {
                    data = JSON.parse(event.data) as RealtimeMessage
                } catch {
                    return
                }
                if (!data || typeof data.type !== "string") return

                if (data.type === "character_deleted") {
                    if (typeof data.character_id === "number") {
                        setCharacters((prev) => prev.filter((char) => char.id !== data.character_id))
                    }
                    return
                }

                if (data.type === "action_logged") {
                    if (!data.log || typeof data.log.id !== "number") return
                    setActionLogs((prev) => {
                        if (prev.some((entry) => entry.id === data.log?.id)) return prev
                        return [data.log as ActionLogEntry, ...prev].slice(0, 120)
                    })
                    return
                }

                if (data.type === "action_history_reset") {
                    setActionLogs([])
                    return
                }

                if (data.type.startsWith("document_")) {
                    if (!data.document || typeof data.document.id !== "number") return
                    setDocuments((prev) => {
                        const filtered = prev.filter((doc) => doc.id !== data.document?.id)
                        const next = [data.document as DocumentSummary, ...filtered]
                        return next.sort(
                            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )
                    })
                    return
                }

                if (data.type === "character_updated" || data.type === "character_created") {
                    if (!data.character || typeof data.character.id !== "number") return
                    const didUpdate = applyStatusUpdate(data.character)
                    if (!didUpdate) {
                        refresh()
                    }
                }
            }

            websocket.onerror = () => {
                websocket.close()
            }

            websocket.onclose = () => {
                clearRealtimeTimers()
                if (!shouldReconnect) return
                wsRetryRef.current += 1
                const delay = Math.min(1000 * 2 ** (wsRetryRef.current - 1), 30_000)
                wsReconnectRef.current = window.setTimeout(connect, delay)
            }
        }

        if (tokenValue && wsBase) {
            connect()
        }

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current)
            }
            window.removeEventListener("focus", refresh)
            document.removeEventListener("visibilitychange", handleVisibility)
            shouldReconnect = false
            clearRealtimeTimers()
            wsRetryRef.current = 0
            if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
                wsRef.current.close(1000, "cleanup")
            }
            wsRef.current = null
        }
    }, [user, token, fetchCharacters, fetchActionLogs, fetchDocuments, applyStatusUpdate])

    if (isLoading) {
        return null
    }

    if (!user) {
        return null
    }

    const handleLogout = () => {
        logout()
        navigate("/")
    }

    async function handleDeleteCharacter(id: number) {
        const confirmDelete = window.confirm("Tem certeza que deseja excluir esse personagem?")
        if (!confirmDelete) return

        try {
            await api.delete(`/characters/${id}/`)
            setCharacters(prev => prev.filter(char => char.id !== id))
        } catch (err) {
            console.log(err)
            alert("Erro ao excluir personagem")
        }
    }

    function renderPlayerDashboard() {
        return (
            <div className="w-full px-4 md:px-8 flex flex-col gap-6">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-md flex flex-col gap-6 w-full mb-8">
                    <h2 className="text-2xl text-amber-500 font-elegant_text mb-4">PERSONAGENS</h2>

                    {/* Lista de Personagens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 w-full">
                        {characters.length === 0 ? (
                            <p className="text-zinc-300 font-text">Não existem personagens criados</p>
                        ) : (
                            characters.map((char) => {
                                const avatarUrl = getAvatarUrl(char.avatar)
                                const trailLabel = replaceNoneLabel(char.trail ? formatEnum(char.trail) : "—")
                                const subclassLabel = replaceNoneLabel(char.subclass ? formatEnum(char.subclass) : "—")
                                const originLabel = replaceNoneLabel(formatEnum(getOriginName(char.origin))) || "Desconhecida"
                                const nexTotalLabel =
                                    typeof char.nex_total === "number" ? `${char.nex_total}%` : "—"
                                return (
                                    <div
                                        key={char.id}
                                        className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 w-full flex flex-col gap-4"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="text-amber-500 font-elegant_text text-lg truncate">
                                                {char.name}
                                            </h3>
                                            {/* Botão de excluir */}
                                            <button
                                                onClick={() => handleDeleteCharacter(char.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 transition text-white rounded shrink-0"
                                                title="Excluir personagem"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="flex items-start gap-4 min-w-0">
                                            {avatarUrl && (
                                                <img
                                                    src={avatarUrl}
                                                    alt={char.name}
                                                    className="w-24 h-24 rounded-full border border-zinc-600 object-cover"
                                                />
                                            )}
                                            <div className="w-px bg-zinc-600/80 self-stretch" />
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 min-w-0">
                                                <p className="text-zinc-300 font-text">Classe: {char.character_class}</p>
                                                <p className="text-zinc-300 font-text">Trilha: {trailLabel}</p>
                                                <p className="text-zinc-300 font-text">Patente: {char.rank}</p>
                                                <p className="text-zinc-300 font-text">Subclasse: {subclassLabel}</p>
                                                <p className="text-zinc-300 font-text">
                                                    Origem: {originLabel}
                                                </p>
                                                <p className="text-zinc-300 font-text">NEX total: {nexTotalLabel}</p>
                                            </div>
                                        </div>

                                        <button
                                            className="w-full py-2 px-4 bg-yellow-700 hover:bg-yellow-600 rounded text-white font-simple_text transition"
                                            onClick={() => { navigate(`/characters/${char.id}`) }}
                                        >
                                            Ver Ficha
                                        </button>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Card Criar Personagem */}
                    <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 flex flex-col gap-3 w-full">
                        <h3 className="text-amber-500 text-xl font-elegant_text">Criar Personagem</h3>
                        <p className="text-zinc-300 font-simple_text">
                            Crie seu personagem e comece sua aventura!
                        </p>
                        <button
                            className="mt-2 py-3 px-6 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-white font-simple_text transition w-full"
                            onClick={() => navigate("/characters/create")}
                        >
                            Criar Personagem
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    function renderMasterDashboard() {
        const renderStatusGrid = () => {
            if (characters.length === 0) {
                return <p className="text-zinc-300 font-text">Não existem personagens criados</p>
            }
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {characters.map((char) => {
                        const originLabel =
                            typeof char.origin === "string" && char.origin.trim().length > 0
                                ? char.origin
                                : "Desconhecida"

                        return (
                            <div
                                key={char.id}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col gap-3"
                            >
                                <div className="flex items-center justify-between gap-4 min-w-0">
                                    <h3 className="flex-1 min-w-0 text-amber-400 font-smalltitle text-lg leading-5 h-10 clamp-2">
                                        {char.name}
                                    </h3>
                                    <button
                                        className="py-2 px-3 bg-amber-500 hover:bg-amber-600 rounded text-white text-sm font-smalltitle transition"
                                        onClick={() => navigate(`/characters/${char.id}`)}
                                    >
                                        Ver ficha
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-zinc-300 font-text text-sm min-w-0">
                                    <p className="min-w-0 leading-5 h-10 clamp-2">Classe: {char.character_class}</p>
                                    <p className="min-w-0 leading-5 h-10 clamp-2">Patente: {char.rank}</p>
                                    <p className="min-w-0 leading-5 h-10 clamp-2">Origem: {originLabel}</p>
                                    <p className="min-w-0 leading-5 h-10 clamp-2">Idade: {char.age}</p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {statusConfigs.map((status) => {
                                        const current = getStatusValue(char, status.field)
                                        const max = getStatusValue(char, status.maxField)

                                        return (
                                            <CompactStatusBar
                                                key={`${char.id}-${status.field}`}
                                                current={current}
                                                max={max}
                                                icon={status.icon}
                                                gradient={status.gradient}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        const renderHistory = () => {
            if (isLoadingLogs) {
                return <p className="text-zinc-300 font-text">Carregando histórico...</p>
            }
            if (logsError) {
                return <p className="text-red-400 font-text">{logsError}</p>
            }
            if (actionLogs.length === 0) {
                return <p className="text-zinc-300 font-text">Nenhum teste registrado.</p>
            }
            return (
                <div className="flex flex-col gap-3 max-h-176 overflow-y-auto pr-2 scrollbar-ordo">
                    {actionLogs.map((log) => {
                        const summary = buildLogSummary(log)
                        const actionLabel = actionTypeLabels[log.action_type] ?? formatEnum(log.action_type)
                        const character = characterMap.get(log.character_id)
                        const characterName = character?.name ?? `Personagem #${log.character_id}`
                        const avatarUrl = getAvatarUrl(character?.avatar)
                        const typeLabel = summary.title || actionLabel
                        const initials = characterName
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("")
                        return (
                            <div
                                key={log.id}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                            >
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex items-center gap-3 md:w-52">
                                        <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex items-center justify-center text-zinc-200 font-smalltitle text-xl">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={characterName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                initials || "?"
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-zinc-200 font-text">{characterName}</div>
                                            <div className="text-xs text-zinc-400">{formatTimestamp(log.created_at)}</div>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="text-sm text-zinc-300 font-text">
                                            <span className="text-zinc-400">Tipo de teste: </span>
                                            {typeLabel}
                                        </div>
                                        {summary.breakdownLines.map((line, index) => (
                                            <div key={`breakdown-${log.id}-${index}`} className="text-sm text-zinc-200">
                                                {line}
                                            </div>
                                        ))}
                                        {summary.detailLines.map((line, index) => (
                                            <div key={`detail-${log.id}-${index}`} className="text-sm text-zinc-200">
                                                {line}
                                            </div>
                                        ))}
                                        {summary.extra && (
                                            <div className="text-xs text-zinc-400">{summary.extra}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        const renderDocuments = () => {
            if (isLoadingDocuments) {
                return <p className="text-zinc-300 font-text">Carregando documentos...</p>
            }
            if (documentsError) {
                return <p className="text-red-400 font-text">{documentsError}</p>
            }
            if (documents.length === 0) {
                return <p className="text-zinc-300 font-text">Nenhum documento encontrado.</p>
            }
            return (
                <div className="flex flex-col gap-3 max-h-112 overflow-y-auto pr-2 scrollbar-ordo">
                    {documents.map((doc) => {
                        const characterName = characterMap.get(doc.character_id)?.name ?? `Personagem #${doc.character_id}`
                        const releaseCharacter = characterMap.get(doc.character_id)
                        return (
                            <div
                                key={`document-${doc.id}`}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col gap-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-zinc-200 font-text truncate">{doc.original_name}</div>
                                    <span
                                        className={`text-xs font-smalltitle ${doc.is_released ? "text-emerald-400" : "text-amber-400"}`}
                                    >
                                        {doc.is_released ? "Liberado" : "Bloqueado"}
                                    </span>
                                </div>
                                <div className="text-xs text-zinc-400">
                                    Personagem: {characterName}
                                </div>
                                <div className="text-xs text-zinc-400">
                                    Local: {doc.found_location}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {formatTimestamp(doc.created_at)} · {formatBytes(doc.size_bytes)}
                                </div>
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadDocument(doc)}
                                            className="px-3 py-1 rounded text-xs font-smalltitle bg-amber-500 text-white hover:bg-amber-600 transition"
                                        >
                                            Baixar arquivo
                                        </button>
                                        {!doc.is_released ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!releaseCharacter?.user_id) {
                                                        alert("Personagem não encontrado para liberar.")
                                                        return
                                                    }
                                                    void handleSetDocumentRelease(
                                                        doc,
                                                        true,
                                                        releaseCharacter.user_id
                                                    )
                                                }}
                                                disabled={releasingDocumentId === doc.id}
                                                className="px-3 py-1 rounded text-xs font-smalltitle bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {releasingDocumentId === doc.id ? "Liberando..." : "Desbloquear"}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSetDocumentRelease(doc, false)}
                                                disabled={releasingDocumentId === doc.id}
                                                className="px-3 py-1 rounded text-xs font-smalltitle bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {releasingDocumentId === doc.id ? "Bloqueando..." : "Bloquear"}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteDocument(doc)}
                                            disabled={deletingDocumentId === doc.id}
                                            className="px-3 py-1 rounded text-xs font-smalltitle bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {deletingDocumentId === doc.id ? "Excluindo..." : "Excluir"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        return (
            <div className="w-full px-4 md:px-8 flex flex-col gap-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-md flex flex-col gap-6 w-full">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-2xl text-amber-500 font-bigtitle">
                                Status dos Personagens
                            </h2>
                        </div>
                        {renderStatusGrid()}
                    </div>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-md flex flex-col gap-6 w-full">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-2xl text-amber-500 font-bigtitle">
                                Histórico de Testes
                            </h2>
                            <button
                                type="button"
                                onClick={handleResetHistory}
                                disabled={isResettingHistory}
                                className="px-4 py-2 rounded text-sm font-smalltitle transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isResettingHistory ? "Limpando..." : "Resetar histórico"}
                            </button>
                        </div>
                        {renderHistory()}
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-md flex flex-col gap-6 w-full">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-2xl text-amber-500 font-bigtitle">
                            Documentos
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6">
                        <form
                            onSubmit={handleUploadDocument}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col gap-4"
                        >
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-zinc-300 font-text">Personagem</label>
                                <select
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100 font-text"
                                    value={documentCharacterId}
                                    onChange={(event) => {
                                        const value = event.target.value
                                        setDocumentCharacterId(value ? Number(value) : "")
                                    }}
                                >
                                    {characters.length === 0 && (
                                        <option value="">Nenhum personagem encontrado</option>
                                    )}
                                    {characters.map((char) => (
                                        <option key={`doc-char-${char.id}`} value={char.id}>
                                            {char.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-zinc-300 font-text">Local encontrado</label>
                                <input
                                    type="text"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100 font-text"
                                    value={documentFoundLocation}
                                    onChange={(event) => setDocumentFoundLocation(event.target.value)}
                                    placeholder="Ex.: Biblioteca, sala de arquivos..."
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-zinc-300 font-text">Arquivo</label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label
                                        htmlFor="document-upload"
                                        className="inline-flex items-center justify-center px-3 py-2 rounded text-sm font-smalltitle bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer"
                                    >
                                        Escolher arquivo
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDocumentFile(null)
                                            if (documentFileInputRef.current) {
                                                documentFileInputRef.current.value = ""
                                            }
                                        }}
                                        className="inline-flex items-center justify-center px-3 py-2 rounded text-sm font-smalltitle bg-zinc-700 text-white hover:bg-zinc-600 transition"
                                        disabled={!documentFile}
                                    >
                                        Remover arquivo
                                    </button>
                                    <span className="text-xs text-zinc-400">
                                        {documentFile ? `${documentFile.name} (${formatBytes(documentFile.size)})` : "Nenhum arquivo selecionado"}
                                    </span>
                                </div>
                                <input
                                    id="document-upload"
                                    ref={documentFileInputRef}
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="sr-only"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null
                                        setDocumentFile(file)
                                    }}
                                />
                            </div>
                            {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
                            {uploadSuccess && <p className="text-sm text-emerald-400">{uploadSuccess}</p>}
                            <button
                                type="submit"
                                disabled={isUploadingDocument}
                                className="mt-2 py-2 px-4 bg-amber-500 hover:bg-amber-600 rounded text-white font-smalltitle transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isUploadingDocument ? "Enviando..." : "Enviar documento"}
                            </button>
                            <p className="text-xs text-zinc-400">
                                Máximo 20 MB. Formatos aceitos: PDF, PNG, JPG.
                            </p>
                        </form>
                        <div className="flex flex-col gap-3">
                            <h3 className="text-lg text-zinc-200 font-smalltitle">
                                Arquivos enviados
                            </h3>
                            {renderDocuments()}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <MainLayout>
            <div className="w-full flex justify-between items-center p-6">
                <div>
                    <h1 className="text-4xl font-elegant_text">DASHBOARD</h1>
                    <p>
                        Bem-vindo, <span className="font-text">{user.username ?? user.email}</span>!
                    </p>
                </div>

                {/* Botão de logout*/}
                <button
                    onClick={handleLogout}
                    className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition font-text"
                >
                    Sair
                </button>
            </div>

            <div className="flex flex-1 justify-start items-start w-full">
                {user.role === "master" ? renderMasterDashboard() : renderPlayerDashboard()}
            </div>
        </MainLayout>
    )
}
