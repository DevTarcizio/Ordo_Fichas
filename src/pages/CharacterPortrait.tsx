import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../services/api"
import type { CharacterDetails } from "../types/character"

export default function CharacterPortrait() {
    const { id } = useParams()

    const [character, setCharacter] = useState<CharacterDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [displayMode, setDisplayMode] = useState<string | null>(null)
    const [animating, setAnimating] = useState(false)
    const animDuration = 450 // ms, matches CSS
    const timers = {
        t1: null as any,
        t2: null as any,
    }

    async function loadCharacter() {
        try {
            const response = await api.get(`/characters/public/${id}/`)

            setCharacter(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCharacter()

        const interval = setInterval(() => {
            loadCharacter()
        }, 2000)

        return () => clearInterval(interval)
    }, [id])

    useEffect(() => {
        if (!character) return

        if (displayMode === null) {
            setDisplayMode(character.portrait_mode)
            return
        }

        if (character.portrait_mode === displayMode) return

        setAnimating(true)
        timers.t1 = setTimeout(() => {
            setDisplayMode(character.portrait_mode)
        }, animDuration / 2)

        timers.t2 = setTimeout(() => {
            setAnimating(false)
        }, animDuration)

        return () => {
            clearTimeout(timers.t1)
            clearTimeout(timers.t2)
        }
    }, [character?.portrait_mode])

    if (loading) {
        return <div>Carregando...</div>
    }

    if (!character) {
        return <div>Personagem não encontrado.</div>
    }


    const firstName = character.name
        .split(" ")[0]
        .toLowerCase()

    const portraitPath = character.portrait_url
        ? new URL(character.portrait_url, api.defaults.baseURL).toString()
        : `/avatars/${firstName}/${firstName}_portrait.png`

    const healthPercent = character.healthy_max > 0
        ? Math.round((character.healthy_points / character.healthy_max) * 100)
        : 0
    const sanityPercent = character.sanity_max > 0
        ? Math.round((character.sanity_points / character.sanity_max) * 100)
        : 0
    const mainStat = character.portrait_mode === "combat"
        ? {
            label: "Esforço",
            value: `${character.effort_points}`,
            color: "amber"
        }
        : {
            label: "Investigação",
            value: `${character.investigation_points}`,
            color: "emerald"
        }

    return (
        <div className={`relative min-h-screen bg-zinc-950 text-white overflow-hidden ${animating ? "animate-fade-switch" : ""}`}>
            <div className="absolute inset-0 bg-black/90" />
            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-10">
                <div className="w-full overflow-hidden rounded-[2rem] border border-zinc-700 bg-black/40 shadow-2xl">
                    <img
                        key={displayMode ?? "portrait"}
                        src={portraitPath}
                        alt={character.name}
                        className="w-full object-contain"
                    />
                </div>

                <div className="grid w-full gap-4 sm:grid-cols-[1.4fr_0.8fr]">
                    <div className="rounded-[1.5rem] border border-zinc-700 bg-zinc-900/80 p-5 text-center">
                        <div className="text-xs uppercase tracking-[0.4em] text-zinc-400">Personagem</div>
                        <div className="mt-4 text-4xl font-elegant_text leading-tight text-amber-300 sm:text-5xl">
                            {character.name}
                        </div>
                    </div>

                    <div className={`rounded-[1.5rem] border p-5 ${mainStat.color === "amber" ? "border-amber-500/40 bg-amber-950/70" : "border-emerald-500/40 bg-emerald-950/70"}`}>
                        <div className="text-xs uppercase tracking-[0.4em] text-zinc-400">{mainStat.label}</div>
                        <div className={`mt-4 text-5xl font-bold ${mainStat.color === "amber" ? "text-amber-300" : "text-emerald-300"}`}>
                            {mainStat.value}
                        </div>
                    </div>
                </div>

                <div className="grid w-full gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-red-500/40 bg-red-950/70 p-5">
                        <div className="text-xs uppercase tracking-[0.4em] text-red-300">Vida</div>
                        <div className="mt-4 text-4xl font-bold text-red-400">{character.healthy_points}/{character.healthy_max}</div>
                        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-red-500/20">
                            <div className="h-full rounded-full bg-red-400" style={{ width: `${healthPercent}%` }} />
                        </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-blue-500/40 bg-slate-950/70 p-5">
                        <div className="text-xs uppercase tracking-[0.4em] text-blue-300">Sanidade</div>
                        <div className="mt-4 text-4xl font-bold text-blue-300">{character.sanity_points}/{character.sanity_max}</div>
                        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-blue-500/20">
                            <div className="h-full rounded-full bg-blue-400" style={{ width: `${sanityPercent}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}