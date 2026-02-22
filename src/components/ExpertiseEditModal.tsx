import FloatingInput from "./FloatingInput"
import Modal from "./Modal"
import { attributeLabelMap, expertiseAttributeMap, expertiseAttributeOrder } from "../characterSheetConfig"
import { formatEnum } from "../utils"

type ExpertiseForm = Record<string, { treino: string; extra: string }>

type Props = {
    isOpen: boolean
    form: ExpertiseForm | null
    isSaving: boolean
    onClose: () => void
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSubmit: (e: React.FormEvent) => void
}

export default function ExpertiseEditModal({
    isOpen,
    form,
    isSaving,
    onClose,
    onChange,
    onSubmit
}: Props) {
    if (!isOpen || !form) return null

    return (
        <Modal
            as="form"
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onSubmit}
            className="w-[min(100%-1.5rem,72rem)] max-h-[85vh] overflow-y-auto scrollbar-ordo p-4 md:p-6"
        >
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bigtitle text-2xl text-blue-400">Editar Perícias</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-sans">
                {expertiseAttributeOrder.map((attr) => {
                    const items = Object.keys(expertiseAttributeMap)
                        .filter((name) => expertiseAttributeMap[name] === attr)
                    return (
                        <div key={attr} className="flex flex-col gap-3">
                            <div className="text-sm text-blue-300 font-smalltitle text-center">
                                {attributeLabelMap[attr] ?? attr}
                            </div>
                            <div className="flex flex-col gap-2">
                                {items.map((name) => (
                                    <div key={name} className="bg-zinc-900/70 border border-zinc-700 rounded p-2">
                                        <div className="text-sm text-zinc-200 font-sans mb-2">
                                            {formatEnum(name)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <FloatingInput
                                                label="Treino"
                                                name={`${name}_treino`}
                                                type="number"
                                                value={form[name]?.treino ?? "0"}
                                                onChange={onChange}
                                            />
                                            <FloatingInput
                                                label="Extra"
                                                name={`${name}_extra`}
                                                type="number"
                                                value={form[name]?.extra ?? "0"}
                                                onChange={onChange}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 disabled:opacity-70"
                >
                    {isSaving ? "Salvando..." : "Salvar"}
                </button>
            </div>
        </Modal>
    )
}


