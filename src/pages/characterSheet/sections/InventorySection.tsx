import { memo, type ReactNode } from "react"
import { Plus } from "lucide-react"

type InventorySectionProps = {
    inventorySpaceUsed: number
    inventorySpaceLabel: number | string
    weaponCards: ReactNode
    weaponCount: number
    itemCards: ReactNode
    itemCount: number
    onOpenWeaponPicker: () => void
    onOpenItemPicker: () => void
}

function InventorySectionBase({
    inventorySpaceUsed,
    inventorySpaceLabel,
    weaponCards,
    weaponCount,
    itemCards,
    itemCount,
    onOpenWeaponPicker,
    onOpenItemPicker
}: InventorySectionProps) {
    return (
        <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-blue-400 font-smalltitle text-2xl">
                    Inventário ({inventorySpaceUsed}/{inventorySpaceLabel})
                </h1>
            </div>
            <div className="flex items-center justify-between gap-3">
                <div className="text-zinc-300 font-text text-sm uppercase tracking-wide">
                    Arsenal
                </div>
                <button
                    type="button"
                    onClick={onOpenWeaponPicker}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded flex items-center gap-2 font-text"
                >
                    <Plus size={16} />
                    Adicionar arma
                </button>
            </div>
            {weaponCount === 0 ? (
                <div className="text-zinc-300 font-text">
                    Nenhuma arma registrada.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {weaponCards}
                </div>
            )}
            <div className="flex items-center justify-between gap-3 mt-4">
                <div className="text-zinc-300 font-text text-sm uppercase tracking-wide">
                    Equipamentos
                </div>
                <button
                    type="button"
                    onClick={onOpenItemPicker}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-black rounded flex items-center gap-2 font-text"
                >
                    <Plus size={16} />
                    Adicionar item
                </button>
            </div>
            {itemCount === 0 ? (
                <div className="text-zinc-300 font-text">
                    Nenhum equipamento registrado.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {itemCards}
                </div>
            )}
        </div>
    )
}

const InventorySection = memo(InventorySectionBase)

export default InventorySection
