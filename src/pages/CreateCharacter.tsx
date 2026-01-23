import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import atributos_img from "../assets/atributos.png"

export default function CreateCharacter() {
    const navigate = useNavigate()

    const origins = [
        "Acadêmico", 
        "Agente de Saúde",
        "Amnésico",
        "Artista",
        "Atleta",
        "Chef",
        "Cientista Forense",
        "Criminoso",
        "Cultista Arrependido",
        "Desgarrado",
        "Engenheiro",
        "Executivo",
        "Escritor",
        "Investigador",
        "Jornalista",
        "Lutador",
        "Magnata",
        "Mercenário",
        "Militar",
        "Operário",
        "Policial",
        "Professor",
        "Religioso",
        "Servidor Público",
        "Teórico da Conspiração",
        "TI",
        "Trabalhador Rural",
        "Trambiqueiro",
        "Universitário",
        "Vítima",
        "Prodígio Paranormal",
        "Oficial Militar"
    ]

    const classes = [
        "Mundano",
        "Combatente",
        "Especialista",
        "Ocultista",
        "Transformado"
    ]

    const ranks = [
        "Nenhum",
        "Recruta",
        "Operador",
        "Agente Especial",
        "Oficial de Operações",
        "Agente de Elite"
    ]

    const [form, setForm] = useState({
        name: "",
        age: "",

        nex_total: 0,
        nex_class: 0,
        nex_subclass: 0,

        origin: "",
        character_class: "",
        rank: "",

        healthy_points: 0,
        sanity_points: 0,
        effort_points: 0,

        atrib_agility: 0,
        atrib_intellect: 0,
        atrib_vitallity: 0,
        atrib_presence: 0,
        atrib_strength: 0
    })

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const {name, value} = e.target
        setForm(prev => ({
            ...prev, 
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            await api.post("/characters/create/", {
                ...form,
                age: Number(form.age),
                
                nex_total: Number(form.nex_total),
                nex_class: Number(form.nex_class),
                nex_subclass: Number(form.nex_subclass),
                
                healthy_points: Number(form.healthy_points),
                sanity_points: Number(form.sanity_points),
                effort_points: Number(form.effort_points),

                agility: Number(form.atrib_agility),
                intellect: Number(form.atrib_intellect),
                vitallity: Number(form.atrib_vitallity),
                presence: Number(form.atrib_presence),
                strength: Number(form.atrib_strength),
            })

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
                    className="w-full max-w-5xl border border-zinc-700 rounded-lg overflow-hidden"
                >

                    {/* Header do Card*/}
                    <div className="bg-zinc-900 p-6">
                        <h1 className="text-3xl font-bigtitle text-blue-500">
                            Criar Personagem
                        </h1>
                    </div>

                    {/* Body do Card */}
                    <div className="bg-zinc-800 p-6 flex flex-col gap-6">

                        {/* Inputs Principais */}
                        {/* Primeira Linha */}
                        <div className="flex w-full gap-4">

                            
                            <div className="flex-2 min-w-50"> 
                                
                                <FloatingInput 
                                    label="Nome"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    />

                            </div>

                            <div className="flex-1 min-w-25">

                                <FloatingInput 
                                    label="Idade"
                                    type="number"
                                    name="age"
                                    value={form.age}
                                    onChange={handleChange}
                                />

                            </div>

                        </div>

                        {/* Segunda Linha */}
                        <div className="flex w-full gap-4 mt-2">
                            <div className="flex-1 min-w-30">

                                <FloatingSelect 
                                    label="Origem"
                                    name="origin"
                                    value={form.origin}
                                    onChange={handleChange}
                                    options={origins}
                                />

                            </div>

                            <div className="flex-1 min-w-30">

                                <FloatingSelect 
                                    label="Classe"
                                    name="character_class"
                                    value={form.character_class}
                                    onChange={handleChange}
                                    options={classes}
                                />

                            </div>

                            <div className="flex-1 min-w-30">

                                <FloatingSelect 
                                    label="Patente"
                                    name="rank"
                                    value={form.rank}
                                    onChange={handleChange}
                                    options={ranks}
                                />

                            </div>
                            </div>
                        
                        {/* Progressão */}
                        <section>

                            <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                                Progressão
                            </h2>

                            <div className="grid grid-cols-3 gap-4">

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
                        </section>

                        {/* Recursos */}
                        <section>

                            <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                                Recursos
                            </h2>

                            <div className="grid grid-cols-3 gap-4">

                                <FloatingInput
                                    label="Pontos de Vida" 
                                    name="healthy_points" 
                                    type="number"
                                    value={form.healthy_points}
                                    onChange={handleChange}
                                />

                                <FloatingInput
                                    label="Pontos de Sanidade" 
                                    name="sanity_points" 
                                    type="number"
                                    value={form.sanity_points}
                                    onChange={handleChange}
                                />

                                <FloatingInput
                                    label="Pontos de Esforço" 
                                    name="effort_points" 
                                    type="number"
                                    value={form.effort_points}
                                    onChange={handleChange}
                                />

                            </div>

                        </section>

                        {/* Atributos */}
                        <section>

                            <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                                Atributos
                            </h2>

                            <div className="relative w-full max-w-150 h-auto">
                                <img src={atributos_img} alt="Atributos" className="w-full h-auto"/>

                                <input 
                                    name="atrib_agility" 
                                    type="number"
                                    defaultValue={1}                                    
                                    onChange={handleChange} 
                                    className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                    style={{top: "14%", left: "41.8%"}}
                                />

                                <input 
                                    name="atrib_intellect" 
                                    type="number"
                                    defaultValue={1}
                                    onChange={handleChange} 
                                    className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                    style={{top: "36%", left: "72%"}}
                                />

                                <input 
                                    name="atrib_vitallity" 
                                    type="number"
                                    defaultValue={1}
                                    onChange={handleChange} 
                                    className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                    style={{top: "75%", left: "64.5%"}}
                                />

                                <input 
                                    name="atrib_presence" 
                                    type="number"
                                    defaultValue={1}
                                    onChange={handleChange} 
                                    className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                    style={{top: "75%", left: "19%"}}
                                />

                                <input 
                                    name="atrib_strength" 
                                    type="number"
                                    defaultValue={1}
                                    onChange={handleChange} 
                                    className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                    style={{
                                        top: "36%", 
                                        left: "10%",
                                    }}                                    
                                />

                            </div>

                        </section>

                        <div className="flex justify-end gap-4 mt-4">
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard/")}
                                className="px-6 py-3 bg-zinc-600 rounded hover:bg-zinc-700"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700"
                            >
                                Criar Personagem
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </MainLayout>
        
    )
}

interface FloatingInputsProps {
    label: string
    name: string
    value: string | number
    type?: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function FloatingInput({ label, name, value, type = "text", onChange }: FloatingInputsProps) {
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

interface FloatingSelectProps {
    label: string
    name: string
    value: string
    options: string[]
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

function FloatingSelect({ label, name, value, options, onChange }: FloatingSelectProps) {
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
                    <option key={opt} value={opt}>{opt}</option>
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