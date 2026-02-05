import AttributesCard from "./AttributesCard"
import Modal from "./Modal"

export type AttributesEditForm = {
    atrib_agility: string
    atrib_intellect: string
    atrib_vitallity: string
    atrib_presence: string
    atrib_strength: string
}

type Props = {
    isOpen: boolean
    form: AttributesEditForm | null
    isSaving: boolean
    avatarMarkSrc?: string
    onClose: () => void
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    onSubmit: (e: React.FormEvent) => void
}

export default function AttributesEditModal({
    isOpen,
    form,
    isSaving,
    avatarMarkSrc,
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
            className="w-[min(100%-1.5rem,64rem)] max-h-[85vh] overflow-y-auto p-4 md:p-6"
        >
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bigtitle text-2xl text-blue-400">Editar Atributos</h2>
            </div>

            <div className="flex justify-center">
                <AttributesCard
                    mode="edit"
                    avatarMarkSrc={avatarMarkSrc}
                    values={{
                        agility: form.atrib_agility,
                        intellect: form.atrib_intellect,
                        vitallity: form.atrib_vitallity,
                        presence: form.atrib_presence,
                        strength: form.atrib_strength
                    }}
                    inputNames={{
                        agility: "atrib_agility",
                        intellect: "atrib_intellect",
                        vitallity: "atrib_vitallity",
                        presence: "atrib_presence",
                        strength: "atrib_strength"
                    }}
                    onChange={onChange}
                />
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
