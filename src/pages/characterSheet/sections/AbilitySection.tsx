import { memo, type ReactNode } from "react"
import { Plus } from "lucide-react"
import type { AbilitySummary } from "../../../types/character"

type AbilitySectionProps = {
    abilities: AbilitySummary[]
    abilityTab: "active" | "passive"
    onTabChange: (tab: "active" | "passive") => void
    activeAbilities: AbilitySummary[]
    passiveAbilities: AbilitySummary[]
    onOpenAbilityPicker: () => void
    renderAbilityItem: (ability: AbilitySummary) => ReactNode
}

function AbilitySectionBase({
    abilities,
    abilityTab,
    onTabChange,
    activeAbilities,
    passiveAbilities,
    onOpenAbilityPicker,
    renderAbilityItem
}: AbilitySectionProps) {
    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-amber-500 font-elegant_text text-2xl">Habilidades</h1>
                <button
                    type="button"
                    onClick={onOpenAbilityPicker}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded flex items-center gap-2 font-text"
                >
                    <Plus size={16} />
                    Adicionar
                </button>
            </div>
            {abilities.length === 0 ? (
                <div className="text-zinc-300 font-text">Nenhuma habilidade registrada.</div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => onTabChange("active")}
                            className={`px-3 py-2 rounded text-sm font-text border ${
                                abilityTab === "active"
                                    ? "bg-red-600 border-red-500 text-white"
                                    : "bg-zinc-800 border-zinc-700 text-white"
                            }`}
                        >
                            Ativas
                        </button>
                        <button
                            type="button"
                            onClick={() => onTabChange("passive")}
                            className={`px-3 py-2 rounded text-sm font-text border ${
                                abilityTab === "passive"
                                    ? "bg-green-500 border-green-400 text-black"
                                    : "bg-zinc-800 border-zinc-700 text-white"
                            }`}
                        >
                            Passivas
                        </button>
                    </div>
                    {abilityTab === "active" ? (
                        activeAbilities.length === 0 ? (
                            <div className="text-zinc-400 font-text text-sm">Nenhuma habilidade ativa.</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {activeAbilities.map(renderAbilityItem)}
                            </div>
                        )
                    ) : passiveAbilities.length === 0 ? (
                        <div className="text-zinc-400 font-text text-sm">Nenhuma habilidade passiva.</div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {passiveAbilities.map(renderAbilityItem)}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const AbilitySection = memo(AbilitySectionBase)

export default AbilitySection
