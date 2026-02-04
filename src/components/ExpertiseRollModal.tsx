import { X } from "lucide-react"

type RollResult = {
    expertise: string
    attribute: string
    attribute_value: number
    dice_count: number
    dice: number[]
    treino: number
    extra: number
    bonus: number
    total: number
}

type Props = {
    isOpen: boolean
    result: RollResult | null
    isRolling: boolean
    onClose: () => void
}

export default function ExpertiseRollModal({
    isOpen,
    result,
    isRolling,
    onClose
}: Props) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative z-10 w-[min(100%-1.5rem,32rem)] rounded-xl border border-cyan-500/60 bg-zinc-900/90 shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_10px_40px_rgba(0,0,0,0.6)] text-white font-sans">
                <div className="flex items-center justify-between border-b border-zinc-700/70 px-4 py-3">
                    <div className="text-sm text-zinc-300">
                        {result ? result.expertise : "Rolagem"}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X />
                    </button>
                </div>

                <div className="px-4 py-4">
                    {isRolling && (
                        <div className="text-zinc-300">Rolando...</div>
                    )}

                    {!isRolling && result && (
                        <div className="flex flex-col gap-2">
                            <div className="text-2xl text-white">
                                {(() => {
                                    const maxDie = result.dice.length ? Math.max(...result.dice) : 0
                                    const bonus = result.bonus
                                    return bonus > 0
                                        ? (
                                            <>
                                                Resultado:{" "}
                                                <span className="text-blue-300">
                                                    {maxDie} + {bonus} = {result.total}
                                                </span>
                                            </>
                                        )
                                        : (
                                            <>
                                                Resultado:{" "}
                                                <span className="text-blue-300">{maxDie}</span>
                                            </>
                                        )
                                })()}
                            </div>
                            <div className="text-sm text-zinc-300">
                                D20: <span className="text-white">{result.dice.join(", ") || "-"}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
