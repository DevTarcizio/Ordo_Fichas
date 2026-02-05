import Modal from "./Modal"

const avatarList = [
    "brock",
    "jose",
    "cain",
    "mauro",
    "ryuma",
    "none"
]

interface AvatarModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (avatar: string) => void
}

export default function AvatarModal({
    isOpen,
    onClose,
    onSelect
}: AvatarModalProps) {
    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-full max-w-5xl p-6"
        >
            <h2 className="font-bigtitle text-xl mb-4 text-blue-400">
                Escolha um Avatar
            </h2>

            <div className="flex flex-wrap gap-4 justify-center">
                {avatarList.map(avatar => (
                    <img
                        key={avatar}
                        src={`/avatars/${avatar}/${avatar}.png`}
                        alt={avatar}
                        className="w-24 h-24 rounded cursor-pointer border-2 border-transparent hover:border-blue-500 shrink-0"
                        onClick={() => {
                            onSelect(avatar)
                            onClose()
                        }}
                    />
                ))}
            </div>

            <div className="flex justify-end mt-4">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-zinc-700 rounded font-text"
                >
                    Cancelar
                </button>
            </div>
        </Modal>
    )
}
