import { memo } from "react"
import { Pencil } from "lucide-react"
import StatusBar from "../../../components/StatusBar"
import { getAvatarSrc, statusConfigs, type StatusField, type StatusMaxField } from "../../../characterSheetConfig"
import { formatEnum } from "../../../utils"
import type { CharacterDetails } from "../../../types/character"

type StatusSectionProps = {
    character: CharacterDetails
    defenseBonus: number
    resistanceBonus: number
    elementSpecialistChoice: string | null
    onOpenStatusEdit: () => void
    onStatusChange: (field: StatusField, maxField: StatusMaxField, delta: number) => void
    lifeNote?: string | null
}

function StatusSectionBase({
    character,
    defenseBonus,
    resistanceBonus,
    elementSpecialistChoice,
    onOpenStatusEdit,
    onStatusChange,
    lifeNote
}: StatusSectionProps) {
    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-amber-500 font-elegant_text text-2xl">Status</h1>
                <button
                    onClick={onOpenStatusEdit}
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
                            onStatusChange(config.field, config.maxField, delta)
                        }}
                    />
                ))}
                {lifeNote && (
                    <div className="text-xs text-emerald-200 font-text">
                        {lifeNote}
                    </div>
                )}
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
    )
}

const StatusSection = memo(StatusSectionBase)

export default StatusSection
