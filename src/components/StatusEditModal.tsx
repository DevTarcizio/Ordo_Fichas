import FloatingInput from "./FloatingInput"

export type StatusEditForm = {
    healthy_max: string
    sanity_max: string
    effort_max: string
    investigation_max: string
    defense_passive: string
    defense_dodging: string
    defense_blocking: string
}

type Props = {
    isOpen: boolean
    form: StatusEditForm | null
    isSaving: boolean
    onClose: () => void
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSubmit: (e: React.FormEvent) => void
}

export default function StatusEditModal({
    isOpen,
    form,
    isSaving,
    onClose,
    onChange,
    onSubmit
}: Props) {
    if (!isOpen || !form) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            <form
                onSubmit={onSubmit}
                className="relative z-10 w-[min(100%-1.5rem,64rem)] max-h-[85vh] overflow-y-auto bg-zinc-900 p-4 md:p-6 rounded-2xl shadow-xl text-white"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bigtitle text-2xl text-blue-400">Editar Status</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FloatingInput
                        label="Vida Máxima"
                        name="healthy_max"
                        type="number"
                        value={form.healthy_max}
                        onChange={onChange}
                    />

                    <FloatingInput
                        label="Sanidade Máxima"
                        name="sanity_max"
                        type="number"
                        value={form.sanity_max}
                        onChange={onChange}
                    />

                    <FloatingInput
                        label="Esforço Máximo"
                        name="effort_max"
                        type="number"
                        value={form.effort_max}
                        onChange={onChange}
                    />

                    <FloatingInput
                        label="Investigação Máxima"
                        name="investigation_max"
                        type="number"
                        value={form.investigation_max}
                        onChange={onChange}
                    />

                    <FloatingInput
                        label="Defesa Passiva"
                        name="defense_passive"
                        type="number"
                        value={form.defense_passive}
                        onChange={onChange}
                    />

                    <FloatingInput
                        label="Defesa Esquiva"
                        name="defense_dodging"
                        type="number"
                        value={form.defense_dodging}
                        onChange={onChange}
                    />

                    <FloatingInput
                        label="Defesa Bloqueio"
                        name="defense_blocking"
                        type="number"
                        value={form.defense_blocking}
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
            </form>
        </div>
    )
}
