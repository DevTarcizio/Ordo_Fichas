interface FloatingSelectProps {
    label: string
    name: string
    value: string
    options: { value: string, label: string }[]
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export default function FloatingSelect({ label, name, value, options, onChange }: FloatingSelectProps) {
    return (
        <div className="relative w-full">
            <select 
                name={name}
                id={name}
                value={value}
                onChange={onChange}
                className="peer w-full px-4 pt-5 pb-3 border border-zinc-700 rounded-lg bg-zinc-800 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 font-text"
            >
                <option value="" disabled hidden></option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <label 
                htmlFor={name}
                className="absolute left-4 top-1 text-sm text-zinc-400 peer-focus:text-blue-400 pointer-events-none transition-colors duration-200 font-text"
            >
                {label}
            </label>
        </div>
    )
}
