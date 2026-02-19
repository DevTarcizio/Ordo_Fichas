import { memo, type ReactNode } from "react"
import { Info, Pencil } from "lucide-react"

type ExpertiseSectionProps = {
    columns: ReactNode
    onOpenInfo: () => void
    onOpenEdit: () => void
}

function ExpertiseSectionBase({ columns, onOpenInfo, onOpenEdit }: ExpertiseSectionProps) {
    return (
        <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
            <div className="relative bg-black/60 rounded-md py-2 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    <h1 className="text-blue-400 font-smalltitle text-3xl">Perícias</h1>
                    <button
                        type="button"
                        onClick={onOpenInfo}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Informações das perícias"
                        aria-label="Informações das perícias"
                    >
                        <Info size={18} />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onOpenEdit}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded flex items-center gap-2 font-text"
                    title="Editar perícias"
                >
                    <Pencil size={18} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
                {columns}
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
    )
}

const ExpertiseSection = memo(ExpertiseSectionBase)

export default ExpertiseSection
