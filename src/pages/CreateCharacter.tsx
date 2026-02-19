import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import AvatarModal from "../components/AvatarModal"
import FloatingInput from "../components/FloatingInput"
import FloatingSelect from "../components/FloatingSelect"
import AttributesCard from "../components/AttributesCard"
import { formatEnum } from "../utils"
import {
    classTrailMap,
    classes,
    origins,
    ranks,
    subclasses,
    trails
} from "../constants"
import {
    attributeLabelMap,
    expertiseAttributeMap,
    expertiseAttributeOrder,
    expertiseLabelMap
} from "../characterSheetConfig"

const trainingOptions = [
    { value: 0, label: "Destreinado (0)" },
    { value: 5, label: "Treinado (5)" },
    { value: 10, label: "Veterano (10)" },
    { value: 15, label: "Expert (15)" }
]

const expertiseNames = Object.keys(expertiseAttributeMap)

type OriginOption = {
    id?: number
    name?: string
    trained_expertise?: unknown
    expertise?: unknown
    expertises?: unknown
}

type TrailOption = {
    id?: number
    name?: string
}

const normalizeOriginName = (origin: OriginOption) => {
    if (typeof origin.name === "string") return origin.name
    return ""
}

const normalizeTrailName = (trail: TrailOption) => {
    if (typeof trail.name === "string") return trail.name
    return ""
}

const normalizeKey = (value: string) => value.trim().toLowerCase()

const extractOriginExpertise = (origin: OriginOption): string[] => {
    const raw = origin.trained_expertise ?? origin.expertise ?? origin.expertises
    if (!raw) return []
    if (Array.isArray(raw)) {
        if (raw.length === 0) return []
        if (typeof raw[0] === "string") {
            return raw.map((item) => String(item))
        }
        return raw
            .map((item) => {
                if (!item || typeof item !== "object") return ""
                return (
                    (item as { name?: string }).name ??
                    (item as { expertise?: string }).expertise ??
                    (item as { expertise_name?: string }).expertise_name ??
                    ""
                )
            })
            .filter(Boolean)
    }
    return []
}

export default function CreateCharacter() {
    const navigate = useNavigate()
    const token = localStorage.getItem("token")
    const [avatarModalOpen, setAvatarModalOpen] = useState(false)
    const [formErrors, setFormErrors] = useState<string[]>([])
    const [step, setStep] = useState<"details" | "attributes" | "expertise">("details")
    const [originOptions, setOriginOptions] = useState<OriginOption[]>([])
    const [trailOptions, setTrailOptions] = useState<TrailOption[]>([])
    const [originExpertiseNames, setOriginExpertiseNames] = useState<string[]>([])
    const [manualTraining, setManualTraining] = useState<Record<string, boolean>>({})

    const [expertiseTraining, setExpertiseTraining] = useState<Record<string, number>>(
        () =>
            expertiseNames.reduce((acc, name) => {
                acc[name] = 0
                return acc
            }, {} as Record<string, number>)
    )

    const [form, setForm] = useState({
        name: "",
        nationality: "",
        age: "",
        avatar: "",

        nex_total: "",
        nex_class: "",
        nex_subclass: "",

        origin: "",
        origin_id: "",
        trail_id: "",
        character_class: "",
        rank: "",
        trail: "",
        subclass: "",
        investigation_points: "",
        investigation_max: "",

        atrib_agility: 1,
        atrib_intellect: 1,
        atrib_vitallity: 1,
        atrib_presence: 1,
        atrib_strength: 1,

        displacement: 9,
        defense_passive: 10,
        defense_dodging: 10,
        defense_blocking: 10,
    })

    useEffect(() => {
        let isMounted = true
        api.get("/origins/")
            .then((res) => {
                const list = Array.isArray(res.data?.origins)
                    ? res.data.origins
                    : Array.isArray(res.data)
                        ? res.data
                        : []
                if (!isMounted) return
                setOriginOptions(list)
            })
            .catch(() => {
                if (isMounted) setOriginOptions([])
            })

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        let isMounted = true
        api.get("/trails/")
            .then((res) => {
                const list = Array.isArray(res.data?.trails)
                    ? res.data.trails
                    : Array.isArray(res.data)
                        ? res.data
                        : []
                if (!isMounted) return
                setTrailOptions(list)
            })
            .catch(() => {
                if (isMounted) setTrailOptions([])
            })

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (!form.character_class) return
        const allowedTrails = classTrailMap[form.character_class]
        if (allowedTrails && form.trail && !allowedTrails.includes(form.trail)) {
            setForm(prev => ({ ...prev, trail: "", trail_id: "" }))
        }
        if (form.subclass && form.subclass === form.character_class) {
            setForm(prev => ({ ...prev, subclass: "" }))
        }
        const allowedNexClasses = new Set(["combatente", "especialista", "ocultista"])
        const hasInvalidNex =
            form.nex_total !== "0" ||
            form.nex_class !== "0" ||
            form.nex_subclass !== "0"
        if (!allowedNexClasses.has(form.character_class) && hasInvalidNex) {
            setForm(prev => ({
                ...prev,
                nex_total: "0",
                nex_class: "0",
                nex_subclass: "0"
            }))
        }
        if (!["mundano", "combatente", "especialista", "ocultista"].includes(form.character_class)) {
            setExpertiseTraining((prev) => {
                const hasTraining = Object.values(prev).some((value) => value > 0)
                if (!hasTraining) return prev
                return Object.keys(prev).reduce((acc, name) => {
                    acc[name] = 0
                    return acc
                }, {} as Record<string, number>)
            })
        }
    }, [
        form.character_class,
        form.subclass,
        form.trail,
        form.nex_total,
        form.nex_class,
        form.nex_subclass
    ])

    useEffect(() => {
        if (!form.trail) {
            setForm(prev => ({ ...prev, trail_id: "" }))
            return
        }
        const match = trailOptions.find(
            (trail) => normalizeKey(normalizeTrailName(trail)) === normalizeKey(form.trail)
        )
        if (match?.id != null) {
            setForm(prev => ({ ...prev, trail_id: String(match.id) }))
        } else {
            setForm(prev => ({ ...prev, trail_id: "" }))
        }
    }, [form.trail, trailOptions])

    useEffect(() => {
        if (!form.origin) {
            setOriginExpertiseNames([])
            return
        }

        const match = originOptions.find((origin) => normalizeOriginName(origin) === form.origin)
        if (match) {
            const names = extractOriginExpertise(match)
            if (names.length > 0) {
                setOriginExpertiseNames(names)
                return
            }
            if (match.id != null) {
                api.get(`/origins/${match.id}`)
                    .then((res) => {
                        const namesFromDetail = extractOriginExpertise(res.data as OriginOption)
                        setOriginExpertiseNames(namesFromDetail)
                    })
                    .catch(() => setOriginExpertiseNames([]))
                return
            }
        }

        setOriginExpertiseNames([])
    }, [form.origin, originOptions])

    useEffect(() => {
        const normalizedOrigin = new Set(
            originExpertiseNames
                .map((rawName) => rawName.toLowerCase())
                .filter((name) => expertiseAttributeMap[name])
        )

        setExpertiseTraining((prev) => {
            let changed = false
            const next = { ...prev }

            Object.keys(next).forEach((name) => {
                const isManual = manualTraining[name]
                const isOrigin = normalizedOrigin.has(name)

                if (isOrigin) {
                    const nextValue = Math.max(next[name] ?? 0, 5)
                    if (nextValue !== next[name]) {
                        next[name] = nextValue
                        changed = true
                    }
                    return
                }

                if (!isManual && (next[name] ?? 0) !== 0) {
                    next[name] = 0
                    changed = true
                }
            })

            return changed ? next : prev
        })
    }, [originExpertiseNames, manualTraining])

    const availableTrails = useMemo(
        () =>
            form.character_class
                ? classTrailMap[form.character_class] ?? []
                : trails,
        [form.character_class]
    )

    const availableSubclasses = useMemo(
        () =>
            form.character_class
                ? subclasses.filter((subclass) => subclass !== form.character_class)
                : subclasses,
        [form.character_class]
    )

    const canTrainExpertise = ["mundano", "combatente", "especialista", "ocultista"].includes(form.character_class)
    const intellectValue = Math.max(0, Number(form.atrib_intellect) || 0)
    const nexTotalValue = Math.max(0, Number(form.nex_total) || 0)
    const attributePoints = useMemo(() => {
        if (nexTotalValue >= 95) return 8
        if (nexTotalValue >= 80) return 7
        if (nexTotalValue >= 50) return 6
        if (nexTotalValue >= 20) return 5
        return 4
    }, [nexTotalValue])
    const normalizedOriginExpertise = useMemo(
        () =>
            originExpertiseNames
                .map((name) => name.toLowerCase())
                .filter((name) => expertiseAttributeMap[name]),
        [originExpertiseNames]
    )
    const uniqueOriginExpertise = useMemo(
        () => Array.from(new Set(normalizedOriginExpertise)),
        [normalizedOriginExpertise]
    )
    const originExpertiseLabels = useMemo(
        () => uniqueOriginExpertise.map((name) => expertiseLabelMap[name] ?? formatEnum(name)),
        [uniqueOriginExpertise]
    )
    const originTrainingCount = uniqueOriginExpertise.length

    const classTrainingCount = useMemo(() => {
        switch (form.character_class) {
            case "mundano":
                return 1 + intellectValue
            case "combatente":
                return 1 + intellectValue
            case "especialista":
                return 7 + intellectValue
            case "ocultista":
                return 5 + intellectValue
            default:
                return 0
        }
    }, [form.character_class, intellectValue])

    const requiredTrainingCount = useMemo(
        () =>
            canTrainExpertise
                ? classTrainingCount + originTrainingCount + (form.character_class === "combatente" ? 2 : 0)
                : 0,
        [canTrainExpertise, classTrainingCount, originTrainingCount, form.character_class]
    )

    const selectedTrainingCount = useMemo(
        () => Object.values(expertiseTraining).filter((value) => value > 0).length,
        [expertiseTraining]
    )

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const {name, value} = e.target
        
        setForm(prev => ({
            ...prev,
            [name]: value
        }))
    }

    function handleOriginChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const originName = e.target.value
        const match = originOptions.find((origin) => normalizeOriginName(origin) === originName)
        setForm(prev => ({
            ...prev,
            origin: originName,
            origin_id: match?.id != null ? String(match.id) : ""
        }))
    }

    function handleExpertiseTrainingChange(name: string, value: number) {
        setManualTraining((prev) => ({
            ...prev,
            [name]: true
        }))
        setExpertiseTraining(prev => ({
            ...prev,
            [name]: value
        }))
    }

    function getTrainingErrors() {
        const errors: string[] = []
        const allowedTrainingClasses = ["mundano", "combatente", "especialista", "ocultista"]
        if (!form.character_class) {
            errors.push("Escolha uma classe para definir as perícias treinadas.")
            return errors
        }
        if (!allowedTrainingClasses.includes(form.character_class)) {
            if (selectedTrainingCount > 0) {
                errors.push("Essa classe não permite perícias treinadas.")
            }
            return errors
        }
        if (form.character_class === "combatente") {
            const combatSkills = ["luta", "pontaria"]
            const defenseSkills = ["fortitude", "reflexos"]
            const combatCount = combatSkills.filter((name) => (expertiseTraining[name] ?? 0) > 0).length
            const defenseCount = defenseSkills.filter((name) => (expertiseTraining[name] ?? 0) > 0).length
            if (combatCount < 1) {
                errors.push("Combatente precisa treinar luta ou pontaria.")
            }
            if (defenseCount < 1) {
                errors.push("Combatente precisa treinar fortitude ou reflexos.")
            }
            if (selectedTrainingCount < requiredTrainingCount) {
                errors.push(`Você precisa treinar pelo menos ${requiredTrainingCount} perícias.`)
            }
        } else if (selectedTrainingCount !== requiredTrainingCount) {
            errors.push(`Você precisa treinar exatamente ${requiredTrainingCount} perícias.`)
        }
        if (form.character_class === "ocultista") {
            if ((expertiseTraining.ocultismo ?? 0) === 0 || (expertiseTraining.vontade ?? 0) === 0) {
                errors.push("Ocultista precisa treinar ocultismo e vontade.")
            }
        }
        return errors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormErrors([])

        if (step === "details") {
            setStep("attributes")
            return
        }

        if (step === "attributes") {
            setStep("expertise")
            return
        }

        const trainingErrors = getTrainingErrors()
        if (trainingErrors.length > 0) {
            setFormErrors(trainingErrors)
            return
        }

        if (!form.origin_id) {
            setFormErrors(["Selecione uma origem válida."])
            return
        }
        if (!form.trail_id) {
            setFormErrors(["Selecione uma trilha válida."])
            return
        }

        const expertise_training = Object.fromEntries(
            Object.entries(expertiseTraining).filter(([, value]) => value > 0)
        )

        try {
            await api.post("/characters/create/", {
                name: form.name,
                nationality: form.nationality,
                age: Number(form.age),
                avatar: form.avatar,
                origin_id: Number(form.origin_id),
                character_class: form.character_class,
                rank: form.rank,
                trail_id: Number(form.trail_id),
                trail: form.trail,
                subclass: form.subclass,
                nex_total: Number(form.nex_total),
                nex_class: Number(form.nex_class),
                nex_subclass: Number(form.nex_subclass),
                expertise_training,
                investigation_points: Number(form.investigation_points),
                investigation_max: Number(form.investigation_points),
                atrib_agility: Number(form.atrib_agility),
                atrib_intellect: Number(form.atrib_intellect),
                atrib_vitallity: Number(form.atrib_vitallity),
                atrib_presence: Number(form.atrib_presence),
                atrib_strength: Number(form.atrib_strength),
                displacement: Number(form.displacement)
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
            )

            navigate("/dashboard/")
        } catch (err) {
            console.error(err)
            alert("Erro ao criar personagem")
        }
    }

    return (
        <MainLayout>
            <div className="min-h-screen text-white flex justify-center items-center px-4 md:px-6 py-4 md:py-6">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-7xl border border-zinc-700 rounded-lg overflow-hidden"
                >

                    {/* Header do Card*/}
                    <div className="bg-zinc-900 p-6">
                        <h1 className="text-3xl font-bigtitle text-blue-500">
                            Criar Personagem
                        </h1>
                    </div>

                    {/* Body do Card */}
                    <div className="bg-zinc-800 p-6 flex flex-col gap-6">

                        {step === "details" && (
                            <>
                                {/* Container com as duas colunas */}
                                <div className="flex w-full gap-6">
                                    
                                    {/* Coluna 1 - Inputs Principais */}
                                    <div className="flex-1 flex flex-col gap-4">

                                <h2 className="text-xl font-smalltitle text-blue-400 mb-2 text-center">
                                    Detalhes Principais
                                </h2>

                                {/* Primeira Linha */}
                                <div className="grid w-full grid-cols-4 gap-4">

                                    
                                    <div className="w-full"> 
                                        
                                        <FloatingInput 
                                            label="Nome"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                        />

                                    </div>

                                    <div className="w-full">

                                        <FloatingInput 
                                            label="Nacionalidade"
                                            name="nationality"
                                            value={form.nationality}
                                            onChange={handleChange}
                                        />

                                    </div>

                                    <div className="w-full">

                                        <FloatingInput 
                                            label="Idade"
                                            type="number"
                                            name="age"
                                            value={form.age}
                                            onChange={handleChange}
                                        />

                                    </div>


                                    <div className="w-full">
                                        <button
                                            type="button"
                                            onClick={() => setAvatarModalOpen(true)}
                                            className="w-full h-full px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600 font-text"
                                        >
                                            {form.avatar ? `Avatar: ${form.avatar}`: "Selecionar Avatar"}
                                        </button>
                                    </div>  
                                </div>

                                {/* Segunda Linha */}
                                <div className="grid w-full grid-cols-3 gap-4 mt-2">
                                    <div className="w-full">

                                        <FloatingSelect 
                                            label="Origem"
                                            name="origin"
                                            value={form.origin}
                                            onChange={handleOriginChange}
                                            options={
                                                originOptions.length > 0
                                                    ? originOptions
                                                        .map((origin) => normalizeOriginName(origin))
                                                        .filter(Boolean)
                                                        .map((originName) => ({
                                                            value: originName,
                                                            label: formatEnum(originName)
                                                        }))
                                                    : origins.map(origin => ({
                                                        value: origin,
                                                        label: formatEnum(origin)
                                                    }))
                                            }
                                        />

                                    </div>

                                    <div className="w-full">

                                        <FloatingSelect 
                                            label="Classe"
                                            name="character_class"
                                            value={form.character_class}
                                            onChange={handleChange}
                                            options={classes.map(character_class => ({
                                                value: character_class,
                                                label: formatEnum(character_class)
                                            }))}
                                        />

                                    </div>

                                    <div className="w-full">

                                        <FloatingSelect 
                                            label="Trilha"
                                            name="trail"
                                            value={form.trail}
                                            onChange={handleChange}
                                            options={availableTrails.map(trail => ({
                                                value: trail,
                                                label: formatEnum(trail)
                                            }))}
                                        />

                                    </div>
                                </div>

                                {/* Terceira Linha */}
                                <div className="grid w-full grid-cols-2 gap-4 mt-2">
                                    <div className="w-full">

                                        <FloatingSelect 
                                            label="Subclasse"
                                            name="subclass"
                                            value={form.subclass}
                                            onChange={handleChange}
                                            options={availableSubclasses.map(subclass => ({
                                                value: subclass,
                                                label: formatEnum(subclass)
                                            }))}
                                        />

                                    </div>

                                    <div className="w-full">

                                        <FloatingSelect 
                                            label="Patente"
                                            name="rank"
                                            value={form.rank}
                                            onChange={handleChange}
                                            options={ranks.map(rank => ({
                                                value: rank,
                                                label: formatEnum(rank)
                                            }))}
                                        />

                                    </div>
                                </div>


                                {/* Quarta Linha */}
                                <div className="grid w-full grid-cols-3 gap-4 mt-2"> 
                                    <FloatingInput 
                                        label="Nex Total"
                                        name="nex_total" 
                                        type="number"
                                        value={form.nex_total} 
                                        onChange={handleChange}
                                    />

                                    <FloatingInput 
                                        label="Nex da Classe"
                                        name="nex_class" 
                                        type="number"
                                        value={form.nex_class} 
                                        onChange={handleChange}
                                    />

                                    <FloatingInput
                                        label="Nex da Sub-Classe"
                                        name="nex_subclass" 
                                        type="number"
                                        value={form.nex_subclass}
                                        onChange={handleChange}
                                    />
                                </div>

                                {/* Quinta Linha */}
                                <div className="grid w-full grid-cols-1 gap-4 mt-2">
                                    <FloatingInput
                                        label="Pontos de Investigação" 
                                        name="investigation_points" 
                                        type="number"
                                        value={form.investigation_points}
                                        onChange={handleChange}
                                    />
                                </div>

                                    </div>

                                </div>
                            </>
                        )}

                        {step === "attributes" && (
                            <div>
                                <h2 className="text-2xl font-smalltitle text-blue-400 mb-4 text-center">
                                    Atributos
                                </h2>
                                <div className="text-sm text-zinc-300 font-text text-center mb-4">
                                    Com NEX total {nexTotalValue}%, você tem {attributePoints} pontos de atributo para
                                    distribuir. Valor máximo inicial: 3.
                                </div>
                                <div className="w-full flex justify-center mt-10">
                                    <AttributesCard
                                        mode="edit"
                                        values={{
                                            agility: form.atrib_agility,
                                            intellect: form.atrib_intellect,
                                            vitallity: form.atrib_vitallity,
                                            presence: form.atrib_presence,
                                            strength: form.atrib_strength
                                        }}
                                        avatarMarkSrc={
                                            form.avatar
                                                ? `/avatars/${form.avatar}/mark.png`
                                                : undefined
                                        }
                                        inputNames={{
                                            agility: "atrib_agility",
                                            intellect: "atrib_intellect",
                                            vitallity: "atrib_vitallity",
                                            presence: "atrib_presence",
                                            strength: "atrib_strength"
                                        }}
                                        onChange={handleChange}
                                        className="-mt-2"
                                    />
                                </div>
                            </div>
                        )}

                        {step === "expertise" && (
                            <div>
                                <h2 className="text-2xl font-smalltitle text-blue-400 text-center">
                                    Perícias
                                </h2>
                                <div className="mt-2 bg-zinc-900/70 border border-zinc-700 rounded-lg p-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="text-lg font-semibold text-zinc-200 font-text">
                                            Selecionadas: {selectedTrainingCount}/{requiredTrainingCount}
                                        </div>
                                        {originExpertiseLabels.length > 0 && (
                                            <div className="text-sm text-zinc-400 font-text text-center">
                                                Perícias via origem: {originExpertiseLabels.join(", ")}
                                            </div>
                                        )}
                                    </div>

                                    {form.character_class === "combatente" && (
                                        <div className="text-sm text-zinc-400 mt-2 font-text text-center">
                                            Escolha Luta ou Pontaria, Fortitude ou Reflexos
                                        </div>
                                    )}
                                    {form.character_class === "ocultista" && (
                                        <div className="text-sm text-zinc-400 mt-2 font-text text-center">
                                            Ocultismo e Vontade são obrigatórias
                                        </div>
                                    )}
                                    {!canTrainExpertise && form.character_class && (
                                        <div className="text-sm text-zinc-400 mt-2 font-text text-center">
                                            Essa classe não permite treinar perícias.
                                        </div>
                                    )}

                                    {formErrors.length > 0 && (
                                        <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                                            {formErrors.map((message) => (
                                                <p key={message}>{message}</p>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                                        {expertiseAttributeOrder.map((attr) => {
                                            const items = expertiseNames.filter((name) => expertiseAttributeMap[name] === attr)
                                            return (
                                                <div key={attr} className="flex flex-col gap-2">
                                                    <div className="text-sm text-blue-300 font-smalltitle text-center">
                                                        {attributeLabelMap[attr] ?? attr}
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {items.map((name) => (
                                                            <div
                                                                key={name}
                                                                className="flex flex-col gap-2 bg-zinc-800/70 border border-zinc-700 rounded p-2"
                                                            >
                                                                <span className="text-sm text-zinc-200 font-text">
                                                                    {expertiseLabelMap[name] ?? formatEnum(name)}
                                                                </span>
                                                                <select
                                                                    value={String(expertiseTraining[name] ?? 0)}
                                                                    onChange={(e) => handleExpertiseTrainingChange(name, Number(e.target.value))}
                                                                    className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 text-sm text-white"
                                                                >
                                                                    {trainingOptions.map((option) => (
                                                                        <option key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-4 mt-4">
                            {step === "details" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/dashboard/")}
                                        className="px-6 py-3 bg-zinc-600 rounded hover:bg-zinc-700 font-text"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700 font-text"
                                    >
                                        Selecionar Atributos
                                    </button>
                                </>
                            ) : step === "attributes" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormErrors([])
                                            setStep("details")
                                        }}
                                        className="px-6 py-3 bg-zinc-600 rounded hover:bg-zinc-700 font-text"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700 font-text"
                                    >
                                        Selecionar Perícias
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormErrors([])
                                            setStep("attributes")
                                        }}
                                        className="px-6 py-3 bg-zinc-600 rounded hover:bg-zinc-700 font-text"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700 font-text"
                                    >
                                        Criar Personagem
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <AvatarModal
                isOpen={avatarModalOpen}
                onClose={() => setAvatarModalOpen(false)}
                onSelect={(avatar) => {
                    setForm(prev => ({
                        ...prev,
                        avatar
                    }))
                }}
            />

        </MainLayout>
        
    )
}



