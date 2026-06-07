import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../services/api"
import type { CharacterDetails } from "../types/character"

export default function CharacterPortrait() {
    const { id } = useParams()

    const [character, setCharacter] = useState<CharacterDetails | null>(null)
    const [loading, setLoading] = useState(true)

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

    if (loading) {
        return <div>Carregando...</div>
    }

    if (!character) {
        return <div>Personagem não encontrado.</div>
    }

    const firstName = character.name
        .split(" ")[0]
        .toLowerCase()

    const portraitPath = `/avatars/${firstName}/${firstName}_portrait.png`

    return (
        <div className="relative min-h-screen bg-zinc-100 overflow-hidden">
            <img
                src={portraitPath}
                alt={character.name}
                className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    w-[550px]
                    object-contain
                "
            />

            {/* INDICADOR INFERIOR ESQUERDO */}
            {character.portrait_mode === "combat" ? (
                <div
                    className="
                        absolute
                        left-[85px]
                        bottom-[170px]
                        text-yellow-300
                        select-none
                    "
                >
                    <div className="text-6xl font-bold leading-none">
                        {character.effort_points}
                    </div>

                    <div className="h-[2px] w-24 bg-yellow-300 mt-1 opacity-70" />
                </div>
            ) : (
                <div
                    className="
                        absolute
                        left-[85px]
                        bottom-[170px]
                        text-emerald-500
                        select-none
                    "
                >
                    <div className="text-6xl font-bold leading-none">
                        {character.investigation_points}
                    </div>


                    <div className="h-[2px] w-24 bg-emerald-500 mt-1 opacity-70" />
                </div>
            )}

            {/* MODO PADRÃO */}
            {character.portrait_mode === "default" && (
                <div
                    className="
                        absolute
                        left-[400px]
                        top-[42%]
                        -translate-y-1/2
                        -rotate-12
                        text-zinc-400/70
                        leading-none
                        pointer-events-none
                        select-none
                    "
                >
                    <div className="text-8xl font-elegant_text">
                        {character.name.split(" ")[0]}
                    </div>

                    <div className="text-8xl font-elegant_text">
                        {character.name.split(" ").slice(1).join(" ")}
                    </div>
                </div>
            )}

            {/* MODO COMBATE */}
            {character.portrait_mode === "combat" && (
                <div
                    className="
                        absolute
                        left-[450px]
                        top-[42%]
                        -translate-y-1/2
                        flex
                        flex-col
                        gap-6
                        select-none
                    "
                >
                    <div>
                        <div className="text-red-500 text-7xl font-bold drop-shadow-lg">
                            {character.healthy_points}/{character.healthy_max}
                        </div>

                        <div className="h-3 w-80 bg-red-500/70 rounded-full mt-2" />
                    </div>

                    <div>
                        <div className="text-blue-500 text-7xl font-bold drop-shadow-lg">
                            {character.sanity_points}/{character.sanity_max}
                        </div>

                        <div className="h-3 w-80 bg-blue-500/70 rounded-full mt-2" />
                    </div>
                </div>
            )}
        </div>
    )
}