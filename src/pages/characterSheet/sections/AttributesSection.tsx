import { memo } from "react"
import { Pencil } from "lucide-react"
import AttributesCard from "../../../components/AttributesCard"
import type { CharacterDetails } from "../../../types/character"

type AttributesSectionProps = {
    character: CharacterDetails
    avatarMarkSrc: string
    onOpenAttributesEdit: () => void
    onOpenLevelUp: () => void
    onRollAttribute: (attribute: "agility" | "intellect" | "vitallity" | "presence" | "strength", value: number) => void
}

function AttributesSectionBase({
    character,
    avatarMarkSrc,
    onOpenAttributesEdit,
    onOpenLevelUp,
    onRollAttribute
}: AttributesSectionProps) {
    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4 min-h-110">
            <div className="flex items-center justify-between">
                <h1 className="text-blue-400 font-smalltitle text-2xl">Atributos</h1>
                <button
                    onClick={onOpenAttributesEdit}
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
                    avatarMarkSrc={avatarMarkSrc}
                    onRollAttribute={onRollAttribute}
                />
            </div>

            <div className="flex justify-center mt-4">
                <button
                    onClick={onOpenLevelUp}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-black rounded-lg font-text text-lg shadow-md mt-4"
                >
                    Transcender
                </button>
            </div>
        </div>
    )
}

const AttributesSection = memo(AttributesSectionBase)

export default AttributesSection
