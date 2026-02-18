import type { LucideIcon } from "lucide-react"

type CompactStatusBarProps = {
    current: number
    max: number
    icon: LucideIcon
    gradient: string
}

export default function CompactStatusBar({ current, max, icon: Icon, gradient }: CompactStatusBarProps) {
    const normalizedCurrent = Number.isFinite(current) ? current : 0
    const normalizedMax = Number.isFinite(max) ? max : 0
    const safeMax = normalizedMax > 0 ? normalizedMax : 1
    const percent = Math.min(100, Math.max(0, (normalizedCurrent / safeMax) * 100))

    return (
        <div className="flex items-center gap-3">
            <Icon size={20} className="text-zinc-200 shrink-0" />
            <div className="relative w-full h-4 bg-zinc-700 rounded overflow-hidden">
                <div
                    className={`h-full ${gradient} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="min-w-[64px] text-right text-base font-smalltitle text-zinc-100">
                {normalizedCurrent} / {normalizedMax}
            </div>
        </div>
    )
}
