export default function formatEnum(value: string): string {
    if (!value) return ""
    return value
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

export function reverseFormatEnum(display: string): string {
    return display
        .trim()               // remove espaços extras
        .toLowerCase()        // deixa tudo em minúsculas
        .replace(/\s+/g, "_") // substitui espaços por underline
}