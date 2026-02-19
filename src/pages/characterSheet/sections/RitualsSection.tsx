import { memo, type ReactNode } from "react"
import { Plus } from "lucide-react"

type RitualsSectionProps = {
    ritualCards: ReactNode
    ritualCount: number
    hasRitualCaster: boolean
    ritualCasterMaxCircle: number
    ritualCasterExtraCount: number
    nexTotal: number
    onOpenRitualPicker: () => void
}

function RitualsSectionBase({
    ritualCards,
    ritualCount,
    hasRitualCaster,
    ritualCasterMaxCircle,
    ritualCasterExtraCount,
    nexTotal,
    onOpenRitualPicker
}: RitualsSectionProps) {
    return (
        <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-blue-400 font-smalltitle text-2xl">Rituais</h1>
                <button
                    type="button"
                    onClick={onOpenRitualPicker}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded flex items-center gap-2 font-text"
                >
                    <Plus size={16} />
                    Adicionar ritual
                </button>
            </div>
            {hasRitualCaster && (
                <div className="text-xs text-zinc-400 font-text">
                    Escolhido Pelo Outro Lado: círculo máximo {ritualCasterMaxCircle} (NEX {nexTotal}%)
                    {ritualCasterExtraCount > 0 ? ` | Rituais bônus: ${ritualCasterExtraCount}` : ""}
                </div>
            )}
            {ritualCount === 0 ? (
                <div className="text-zinc-300 font-text">
                    Nenhum ritual registrado.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ritualCards}
                </div>
            )}
        </div>
    )
}

const RitualsSection = memo(RitualsSectionBase)

export default RitualsSection
