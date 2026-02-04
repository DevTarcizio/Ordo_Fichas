interface LevelUpModalProps {
    isOpen: boolean
    isLoading: boolean
    onClose: () => void
    onChoose: (type: "class" | "subclass") => void
}

export default function levelUpModal({
    isOpen,
    isLoading,
    onClose,
    onChoose
}: LevelUpModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 w-96 flex flex-col gap-4 shadow-xl">
                <h2 className="text-xl text-blue-400 font-smalltitle text-center">
                    Transceder
                </h2>

                <p className="text-zinc-300 text-center font-text">
                    Upar Classe ou Subclasse?
                </p>

                <button
                    disabled={isLoading}
                    onClick={() => onChoose("class")}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded text-black font-text"
                >
                    +5 nex de Classe
                </button>

                <button
                    disabled={isLoading}
                    onClick={() => onChoose("subclass")}
                    className="w-full py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded text-black font-text"
                >
                    +5 nex de Subclasse
                </button>

                <button 
                    onClick={onClose}
                    className="w-full py-2 bg-zinc-600 hover:bg-zinc-700 rounded text-white font-text"
                >
                    Cancelar    
                </button>
            </div>
        </div>
    )
}