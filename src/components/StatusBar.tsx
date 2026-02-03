import type { LucideIcon } from "lucide-react"
import { ChevronsLeft, ChevronLeft, ChevronsRight, ChevronRight } from "lucide-react"

interface StatusBarProps {
    label: string
    current: number
    max: number
    icon: LucideIcon
    gradient: string
    onChange: (delta: number) => void
}

export default function StatusBar({ label, current, max, icon: Icon, gradient, onChange }: StatusBarProps) {
    const percent = Math.min(100, (current / max) * 100)

    return (
        <div className="w-full flex flex-col gap-2">

            {/* Linha de Controles */}
            <div className="flex items-center justify-between gap-2 mb-1 text-2xl font-smalltitle">

                <div className="flex items-center gap-2">
                    <button 
                        className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                        onClick={() => onChange(-5)}    
                    >
                        <ChevronsLeft size={16}/>
                        - 5
                    </button>

                    <button 
                        className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                        onClick={() => onChange(-1)}
                    >
                        <ChevronLeft size={16}/>
                        - 1
                    </button>
                </div>  

                <div className="flex items-center gap-1">
                    <Icon size={24} />
                    <span className="">{label}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                        onClick={() => onChange(1)}
                    >
                        + 1
                        <ChevronRight size={16}/>
                    </button>

                    <button 
                        className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
                        onClick={() => onChange(5)}
                    >
                        + 5
                        <ChevronsRight size={16}/>
                    </button>
                </div>

            </div>


            {/* Barra */}
            <div className="relative w-full h-8 bg-zinc-700 rounded overflow-hidden">
                <div 
                    className={`h-full ${gradient} transition-all duration-500`}
                    style={{width: `${percent}%`}}
                />

                <div className="absolute inset-0 flex items-center justify-center text-lg font-text text-white drop-shadow">
                    {current} / {max}
                </div>
            </div>
        </div>
    )
}