import { X } from "lucide-react"
import Modal from "./Modal"

export type ExpertiseRollResult = {
    expertise: string
    attribute: string
    attribute_value: number
    dice_count: number
    dice: number[]
    treino: number
    extra: number
    bonus: number
    total: number
    extra_bonus?: number
    extra_label?: string
    trilha_certa_bonus_dice?: number
    primeira_impressao_bonus_dice?: number
    primeira_impressao_label?: string
    success_min?: number
    success_label?: string
    perito_bonus_value?: number
    perito_bonus_dice?: string
    roll_mode?: "best" | "worst"
}

type Props = {
    isOpen: boolean
    result: ExpertiseRollResult | null
    isRolling: boolean
    onClose: () => void
}

export default function ExpertiseRollModal({
    isOpen,
    result,
    isRolling,
    onClose
}: Props) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-[min(100%-1.5rem,32rem)] font-sans"
        >
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
                                const rollMode = result.roll_mode ?? "best"
                                const dieValue = result.dice.length
                                    ? rollMode === "worst"
                                        ? Math.min(...result.dice)
                                        : Math.max(...result.dice)
                                    : 0
                                const bonus = result.bonus
                                const label = rollMode === "worst" ? "Pior Resultado" : "Resultado"
                                return bonus > 0
                                    ? (
                                        <>
                                            {label}:{" "}
                                            <span className="text-blue-300">
                                                {dieValue} + {bonus} = {result.total}
                                            </span>
                                        </>
                                    )
                                    : (
                                        <>
                                            {label}:{" "}
                                            <span className="text-blue-300">{dieValue}</span>
                                        </>
                                    )
                            })()}
                        </div>
                        <div className="text-sm text-zinc-300">
                            D20: <span className="text-white">{result.dice.join(", ") || "-"}</span>
                        </div>
                        {result.trilha_certa_bonus_dice ? (
                            <div className="text-xs text-sky-300">
                                Na Trilha Certa: +{result.trilha_certa_bonus_dice}d20
                            </div>
                        ) : null}
                        {result.primeira_impressao_bonus_dice ? (
                            <div className="text-xs text-emerald-300">
                                {result.primeira_impressao_label ?? "Primeira Impressão"}: +{result.primeira_impressao_bonus_dice}d20
                            </div>
                        ) : null}
                        {result.perito_bonus_value ? (
                            <div className="text-xs text-emerald-300">
                                Perito: +{result.perito_bonus_value}
                                {result.perito_bonus_dice ? ` (${result.perito_bonus_dice})` : ""}
                            </div>
                        ) : null}
                        {result.success_min ? (
                            <div className="text-xs text-amber-300">
                                {result.success_label ?? "Sucesso"}: DT = {result.success_min}
                            </div>
                        ) : null}
                        {result.extra_bonus ? (
                            <div className="text-xs text-emerald-300">
                                {result.extra_label ?? "Bônus extra"}: +{result.extra_bonus}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </Modal>
    )
}
