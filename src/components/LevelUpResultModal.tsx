import type { CharacterDetails } from "../types/character"
import Modal from "./Modal"

type LevelUpResultModalProps = {
    diff: {
        old: CharacterDetails
        new: CharacterDetails
    } | null
    onClose: () => void
}

export default function LevelUpResultModal({
    diff,
    onClose
}: LevelUpResultModalProps) {
    if (!diff) return null
    
    const rows = [
        {label: "Nex Total", key: "nex_total"},
        {label: "Vida Máxima", key: "healthy_max"},
        {label: "Sanidade Máxima", key: "sanity_max"},
        {label: "Esforço Máximo", key: "effort_max"},
        {label: "PE por Rodada", key: "PE_per_round"},
    ] as const

    return (
        <Modal
            isOpen
            onClose={onClose}
            closeOnBackdrop={false}
            backdropClassName="bg-black/70"
            className="p-6 w-96"
        >
            <h2 className="text-2xl text-green-400 mb-4 text-center">
                Transcendeu
            </h2>

            <div className="flex flex-col gap-2">
                {rows.map(row => {
                    const oldVal = diff.old[row.key]
                    const newVal = diff.new[row.key]
                    if (oldVal == newVal) return null

                    return (
                        <div 
                            key={row.key}
                            className="flex justify-between text-white"
                        >
                            <span>{row.label}</span>
                            <span>
                                {oldVal} {" -> "}
                                <span className="text-green-400 font-text">
                                    {newVal}
                                </span>
                            </span>
                        </div>
                    )
                })}
            </div>

            <button
                onClick={onClose}
                className="mt-6 w-full bg-green-500 hover:bg-green-600 text-black py-2 rounded"
            >
                Confirmar
            </button>
        </Modal>
    )
}


