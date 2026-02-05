import FloatingInput from "./FloatingInput"
import FloatingSelect from "./FloatingSelect"
import Modal from "./Modal"
import { ranks } from "../constants"
import { formatEnum } from "../utils"

type EditForm = {
    name: string
    age: string
    nationality: string
    rank: string
    nex_total: string
    nex_class: string
    nex_subclass: string
    PE_per_round: string
    displacement: string
}

type Props = {
    isOpen: boolean
    editForm: EditForm | null
    isSaving: boolean
    onClose: () => void
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    onSubmit: (e: React.FormEvent) => void
}

export default function CharacterEditModal({
    isOpen,
    editForm,
    isSaving,
    onClose,
    onChange,
    onSubmit
}: Props) {
    if (!isOpen || !editForm) return null

    return (
        <Modal
            as="form"
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onSubmit}
            className="w-[min(100%-1.5rem,72rem)] max-h-[85vh] overflow-y-auto p-4 md:p-6"
        >
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bigtitle text-2xl text-blue-400">Editar Informações</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FloatingInput
                    label="Nome"
                    name="name"
                    value={editForm.name}
                    onChange={onChange}
                />

                <FloatingInput
                    label="Nacionalidade"
                    name="nationality"
                    value={editForm.nationality}
                    onChange={onChange}
                />

                <FloatingInput
                    label="Idade"
                    name="age"
                    type="number"
                    value={editForm.age}
                    onChange={onChange}
                />

                <FloatingSelect
                    label="Patente"
                    name="rank"
                    value={editForm.rank}
                    onChange={onChange}
                    options={ranks.map((rank) => ({
                        value: rank,
                        label: formatEnum(rank)
                    }))}
                />

                <FloatingInput
                    label="PE por rodada"
                    name="PE_per_round"
                    type="number"
                    value={editForm.PE_per_round}
                    onChange={onChange}
                />

                <FloatingInput
                    label="Deslocamento"
                    name="displacement"
                    type="number"
                    value={editForm.displacement}
                    onChange={onChange}
                />

                <FloatingInput
                    label="Nex Total"
                    name="nex_total"
                    type="number"
                    value={editForm.nex_total}
                    onChange={onChange}
                />

                <FloatingInput
                    label="Nex da Classe"
                    name="nex_class"
                    type="number"
                    value={editForm.nex_class}
                    onChange={onChange}
                />

                <FloatingInput
                    label="Nex da Subclasse"
                    name="nex_subclass"
                    type="number"
                    value={editForm.nex_subclass}
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

export type { EditForm }
