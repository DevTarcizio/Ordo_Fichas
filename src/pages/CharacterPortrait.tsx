import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../services/api"
import type { CharacterDetails } from "../types/character"

export default function CharacterPortrait() {
    const { id } = useParams()

    const [character, setCharacter] = useState<CharacterDetails | null>(null)
    const [loading, setLoading] = useState(true)

    const firstName = character?.name
        .split(" ")[0]
        .toLowerCase()

    const portraitPath = `/avatars/${firstName}/${firstName}_portrait.png`

    useEffect(() => {
        async function loadCharacter() {
            try {
                const token = localStorage.getItem("token")

                const response = await api.get(`/characters/${id}/`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                setCharacter(response.data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        loadCharacter()
    }, [id])

    if (loading) return <div>Carregando...</div>

    if (!character) {
        return <div>Personagem não encontrado.</div>
    }


    return (
        <div className="relative min-h-screen bg-zinc-100 overflow-hidden">
        <img
            src={portraitPath}
            alt={character.name}
            className="
                absolute
                left-10
                top-1/2
                -translate-y-1/2
                w-[550px]
                object-contain
            "
        />

        <div
            className="
                absolute
                left-[420px]
                top-[45%]
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

            <div className="text-8xl font-elegant_text ml-4">
                {character.name.split(" ").slice(1).join(" ")}
            </div>
        </div>
    </div>
    )
}