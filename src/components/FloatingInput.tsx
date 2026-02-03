interface FloatingInputsProps {
    label: string
    name: string
    value: string | number
    type?: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function FloatingInput({ label, name, value, type = "text", onChange }: FloatingInputsProps) {
    return (
        <div className="relative w-full">
            <input 
                type={type}
                name={name}
                id={name}
                value={value}
                onChange={onChange}
                placeholder=""
                className="peer w-full px-4 pt-5 pb-3 border border-zinc-700 rounded-lg bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-text"
            />
            <label 
                htmlFor={name}
                className={`absolute left-4 text-zinc-400 transition-all duration-200 ${value ? "top-1 text-sm text-blue-400" : "top-3 text-base text-zinc-400"} peer-focus:top-1 peer-focus:text-sm peer-focus:text-blue-400 font-text`}
            >
                {label}
            </label>
        </div>
    )
}
