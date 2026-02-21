import { Trash2 } from "lucide-react"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import { formatEnum } from "../utils"
import type { CharacterSummary } from "../types/character"
import CompactStatusBar from "../components/CompactStatusBar"
import {
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

const getStatusValue = (
    character: CharacterSummary,
    field: StatusField | StatusMaxField
) => {
    const value = character[field]
    return typeof value === "number" ? value : 0
}

const actionTypeLabels: Record<string, string> = {
    skill_test: "Teste de Perícia",
    attack: "Ataque",
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
        return attributeLabel
    }
    const normalized = normalizeSkillKey(skill)
    if (!normalized) return ""
    const attributeKey = expertiseAttributeMap[normalized]
    if (!attributeKey) return ""
    return attributeLabelMap[attributeKey] ?? formatEnum(attributeKey)
}

const computeResultValue = (dice: unknown, bonus: unknown, fallbackTotal: unknown) => {
    const values = Array.isArray(dice)
        ? dice.filter((item): item is number => typeof item === "number")
        : []
    const bonusValue = typeof bonus === "number" ? bonus : 0
    if (values.length > 0) {
        return Math.max(...values) + bonusValue
    }
    if (typeof fallbackTotal === "number") {
        return fallbackTotal
    }
    return null
}

const buildLogSummary = (log: ActionLogEntry) => {
    const payload = (log.payload ?? {}) as Record<string, unknown>
    if (log.action_type === "skill_test") {
        const skillLabel = formatEnum(payload.skill)
        const attributeLabel = resolveAttributeLabel(payload.skill, payload.attribute)
        const total = typeof payload.total === "number" ? payload.total : null
        const dc = typeof payload.dc === "number" ? payload.dc : null
        const success = typeof payload.success === "boolean" ? payload.success : null
        const notes = typeof payload.notes === "string" ? payload.notes : ""
        const title = [skillLabel, attributeLabel].filter(Boolean).join(" · ")
        const result = [
            total !== null ? `Total ${total}` : null,
            dc !== null ? `DT ${dc}` : null,
            success === null ? null : success ? "Sucesso" : "Falha"
        ].filter(Boolean).join(" · ")
        const extra = notes
        const resultValue = computeResultValue(payload.dice, payload.bonus, payload.total)
        return { title, result, extra, resultValue }
    }

    if (log.action_type === "attack") {
        const skillLabel = formatEnum(payload.skill)
        const attackType = typeof payload.attack_type === "string" ? payload.attack_type : ""
        const attackRoll = payload.attack_roll as Record<string, unknown> | undefined
        const damageRoll = payload.damage_roll as Record<string, unknown> | undefined
        const attackTotal = attackRoll && typeof attackRoll.total === "number" ? attackRoll.total : null
        const damageTotal = damageRoll && typeof damageRoll.total === "number" ? damageRoll.total : null
        const attributeLabel = resolveAttributeLabel(payload.skill)
        const title = [skillLabel, attributeLabel].filter(Boolean).join(" · ")
        const result = [
            attackTotal !== null ? `Ataque ${attackTotal}` : null,
            damageTotal !== null ? `Dano ${damageTotal}` : null
        ].filter(Boolean).join(" · ")
        const resultValue = computeResultValue(attackRoll?.dice, attackRoll?.bonus, attackRoll?.total)
        return { title, result, extra: "", resultValue }
    }

    if (log.action_type === "calm") {
        const skillLabel = formatEnum(payload.skill)
        const total = typeof payload.total === "number" ? payload.total : null
        const dc = typeof payload.dc === "number" ? payload.dc : null
        const success = typeof payload.success === "boolean" ? payload.success : null
        const sanity = typeof payload.sanity_restored === "number" ? payload.sanity_restored : null
        const attributeLabel = resolveAttributeLabel(payload.skill)
        const title = [skillLabel || "Acalmar", attributeLabel].filter(Boolean).join(" · ")
        const result = [
            total !== null ? `Total ${total}` : null,
            dc !== null ? `DT ${dc}` : null,
            success === null ? null : success ? "Sucesso" : "Falha"
        ].filter(Boolean).join(" · ")
        const extra = sanity !== null ? `Sanidade restaurada: ${sanity}` : ""
        const resultValue = computeResultValue(payload.dice, payload.bonus, payload.total)
        return { title, result, extra, resultValue }
    }

    const fallbackTitle = formatEnum(log.action_type)
    const fallbackKeys = Object.keys(payload)
    const extra = fallbackKeys.length ? `Campos: ${fallbackKeys.join(", ")}` : ""
    const resultValue = computeResultValue(payload.dice, payload.bonus, payload.total)
    return { title: fallbackTitle, result: "", extra, resultValue }
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
    const [masterTab, setMasterTab] = useState<"status" | "history">("status")
    const isFetchingRef = useRef(false)
    const refreshTimerRef = useRef<number | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const wsReconnectRef = useRef<number | null>(null)
    const wsHeartbeatRef = useRef<number | null>(null)
    const wsRetryRef = useRef(0)

    useEffect(() => {
        if (!user && !isLoading) {
            navigate("/")
        }
    }, [navigate, user, isLoading])

    const fetchCharacters = useCallback(async () => {
        if (!user || isFetchingRef.current) return
        isFetchingRef.current = true
        try {
            const response = await api.get("/characters/list")
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
            console.error("Erro ao buscar histórico de testes: ", err)
            setLogsError("Erro ao buscar histórico de testes.")
        } finally {
            setIsLoadingLogs(false)
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
        if (masterTab !== "history") return
        if (actionLogs.length > 0 || isLoadingLogs) return
        void fetchActionLogs()
    }, [user, masterTab, actionLogs.length, isLoadingLogs, fetchActionLogs])

    useEffect(() => {
        void fetchCharacters()
    }, [fetchCharacters])

    useEffect(() => {
        if (!user || user.role !== "master") return

        const refresh = () => {
            void fetchCharacters()
            if (masterTab === "history") {
                void fetchActionLogs()
            }
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
    }, [user, token, fetchCharacters, fetchActionLogs, applyStatusUpdate, masterTab])

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
                    <h2 className="text-2xl text-blue-500 font-bigtitle mb-4">Personagens</h2>

                    {/* Lista de Personagens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 w-full">
                        {characters.length === 0 ? (
                            <p className="text-zinc-300 font-text">Não existem personagens criados</p>
                        ) : (
                            characters.map((char) => (
                                <div
                                    key={char.id}
                                    className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 flex flex-col gap-1 w-full"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-blue-400 font-smalltitle text-lg">
                                            {char.name}
                                        </h3>
                                        {/* Botão de excluir */}
                                        <button
                                            onClick={() => handleDeleteCharacter(char.id)}
                                            className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 transition text-white rounded"
                                            title="Excluir personagem"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <p className="text-zinc-300 font-text">Classe: {char.character_class}</p>
                                    <p className="text-zinc-300 font-text">Patente: {char.rank}</p>
                                    <p className="text-zinc-300 font-text">
                                        Origem: {formatEnum(getOriginName(char.origin)) || "Desconhecida"}
                                    </p>
                                    <p className="text-zinc-300 font-text">Idade: {char.age}</p>

                                    <button
                                        className="mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-smalltitle transition"
                                        onClick={() => { navigate(`/characters/${char.id}`) }}
                                    >
                                        Ver Ficha
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Card Criar Personagem */}
                    <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 flex flex-col gap-3 w-full">
                        <h3 className="text-blue-400 text-xl font-smalltitle">Criar Personagem</h3>
                        <p className="text-zinc-300 font-text">
                            Crie seu personagem e comece sua aventura!
                        </p>
                        <button
                            className="mt-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-smalltitle transition w-full"
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                                    <h3 className="flex-1 min-w-0 text-blue-400 font-smalltitle text-lg leading-5 h-10 clamp-2">
                                        {char.name}
                                    </h3>
                                    <button
                                        className="py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-smalltitle transition"
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
                <div className="flex flex-col gap-3">
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-300 font-text">
                                            <div>
                                                <span className="text-zinc-400">Tipo de teste: </span>
                                                {typeLabel}
                                            </div>
                                            <div>
                                                <span className="text-zinc-400">Resultado: </span>
                                                {summary.resultValue !== null ? summary.resultValue : "-"}
                                            </div>
                                        </div>
                                        {summary.result && (
                                            <div className="text-sm text-zinc-100">{summary.result}</div>
                                        )}
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

        return (
            <div className="w-full px-4 md:px-8 flex flex-col gap-6">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-md flex flex-col gap-6 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-2xl text-blue-500 font-bigtitle">
                            {masterTab === "history" ? "Histórico de Testes" : "Status dos Personagens"}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setMasterTab("status")}
                                className={`px-4 py-2 rounded text-sm font-smalltitle transition ${
                                    masterTab === "status"
                                        ? "bg-blue-600 text-white"
                                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                }`}
                            >
                                Status
                            </button>
                            <button
                                type="button"
                                onClick={() => setMasterTab("history")}
                                className={`px-4 py-2 rounded text-sm font-smalltitle transition ${
                                    masterTab === "history"
                                        ? "bg-blue-600 text-white"
                                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                }`}
                            >
                                Histórico
                            </button>
                        </div>
                    </div>

                    {masterTab === "history" ? renderHistory() : renderStatusGrid()}
                </div>
            </div>
        )
    }

    return (
        <MainLayout>
            <div className="w-full flex justify-between items-center p-6">
                <div>
                    <h1 className="text-4xl font-bigtitle">Dashboard</h1>
                    <p>
                        Bem-vindo, <span className="font-text">{user.email}</span>!
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
