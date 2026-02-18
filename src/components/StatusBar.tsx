import type { LucideIcon } from "lucide-react"
import { ChevronsLeft, ChevronLeft, ChevronsRight, ChevronRight } from "lucide-react"

interface StatusBarProps {
    label: string
    current: number
    max: number
    icon: LucideIcon
    gradient: string
    onChange?: (delta: number) => void
    readOnly?: boolean
}

export default function StatusBar({ label, current, max, icon: Icon, gradient, onChange, readOnly }: StatusBarProps) {
    const normalizedCurrent = Number.isFinite(current) ? current : 0
    const normalizedMax = Number.isFinite(max) ? max : 0
    const safeMax = normalizedMax > 0 ? normalizedMax : 1
    const percent = Math.min(100, Math.max(0, (normalizedCurrent / safeMax) * 100))
    const headerClass = readOnly
        ? "flex items-center gap-2 mb-1 text-2xl font-smalltitle"
        : "flex items-center justify-between gap-2 mb-1 text-2xl font-smalltitle"

    const handleChange = (delta: number) => {
        if (readOnly) return
        onChange?.(delta)
    }

    return (
        <div className="w-full flex flex-col gap-2">

            {/* Linha de Controles */}
            <div className={headerClass}>

                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <button 
                            className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                            onClick={() => handleChange(-5)}    
                        >
                            <ChevronsLeft size={16}/>
                            - 5
                        </button>

                        <button 
                            className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                            onClick={() => handleChange(-1)}
                        >
                            <ChevronLeft size={16}/>
                            - 1
                        </button>
                    </div>  
                )}

                <div className="flex items-center gap-1">
                    <Icon size={24} />
                    <span className="">{label}</span>
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <button 
                            className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                            onClick={() => handleChange(1)}
                        >
                            + 1
                            <ChevronRight size={16}/>
                        </button>

                        <button 
                            className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                            onClick={() => handleChange(5)}
                        >
                            + 5
                            <ChevronsRight size={16}/>
                        </button>
                    </div>
                )}

            </div>


            {/* Barra */}
            <div className="relative w-full h-8 bg-zinc-700 rounded overflow-hidden">
                <div 
                    className={`h-full ${gradient} transition-all duration-500`}
                    style={{width: `${percent}%`}}
                />

                <div className="absolute inset-0 flex items-center justify-center text-lg font-text text-white drop-shadow">
                    {normalizedCurrent} / {normalizedMax}
                </div>
            </div>
        </div>
    )
}
