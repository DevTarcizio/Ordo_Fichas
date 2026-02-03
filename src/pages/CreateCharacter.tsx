import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"
import AvatarModal from "../components/AvatarModal"
import FloatingInput from "../components/FloatingInput"
import FloatingSelect from "../components/FloatingSelect"
import atributos_img from "../assets/atributos.png"
import formatEnum from "../utils"
import { origins, classes, ranks, trails, subclasses } from "../constants"

export default function CreateCharacter() {
    const navigate = useNavigate()
    const token = localStorage.getItem("token")
    const [avatarModalOpen, setAvatarModalOpen] = useState(false)
    
    const [form, setForm] = useState({
        name: "",
        nationality: "",
        age: "",
        avatar: "",

        nex_total: "",
        nex_class: "",
        nex_subclass: "",

        origin: "",
        character_class: "",
        rank: "",
        trail: "",
        subclass: "",

        healthy_points: "",
        healthy_max: "",
        sanity_points: "",
        sanity_max: "",
        effort_points: "",
        effort_max: "",
        investigation_points: "",
        investigation_max: "",

        atrib_agility: 1,
        atrib_intellect: 1,
        atrib_vitallity: 1,
        atrib_presence: 1,
        atrib_strength: 1,

        displacement: 9,
        PE_per_round: 0,
        
        defense_passive: 10,
        defense_dodging: 10,
        defense_blocking: 10,
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
                healthy_max: Number(form.healthy_points),
                sanity_points: Number(form.sanity_points),
                sanity_max: Number(form.sanity_points),
                effort_points: Number(form.effort_points),
                effort_max: Number(form.effort_points),
                investigation_points: Number(form.investigation_points),
                investigation_max: Number(form.investigation_points),

                agility: Number(form.atrib_agility),
                intellect: Number(form.atrib_intellect),
                vitallity: Number(form.atrib_vitallity),
                presence: Number(form.atrib_presence),
                strength: Number(form.atrib_strength),

                displacement: Number(form.displacement),

                defense_passive: Number(form.defense_passive),
                defense_dodging: Number(form.defense_dodging),
                defense_blocking: Number(form.defense_blocking)
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

                        {/* Container com as duas colunas */}
                        <div className="flex w-full gap-6">
                            
                            {/* Coluna 1 - Inputs Principais */}
                            <div className="flex-1 flex flex-col gap-4">

                                <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                                    Detalhes Principais
                                </h2>

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

                                    <div className="flex-1 min-w-40">

                                        <FloatingInput 
                                            label="Nacionalidade"
                                            name="nationality"
                                            value={form.nationality}
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


                                    <div className="flex-1 min-w-25">
                                        <button
                                            type="button"
                                            onClick={() => setAvatarModalOpen(true)}
                                            className="px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600 font-text"
                                        >
                                            {form.avatar ? `Avatar: ${form.avatar}`: "Selecionar Avatar"}
                                        </button>
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
                                            options={origins.map(origin => ({
                                                value: origin,
                                                label: formatEnum(origin)
                                            }))}
                                        />

                                    </div>

                                    <div className="flex-1 min-w-30">

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

                                    <div className="flex-1 min-w-30">

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

                                {/* Terceira Linha */}
                                <div className="flex w-full gap-4 mt-2">
                                    <div className="flex-1 min-w-30">

                                        <FloatingSelect 
                                            label="Subclasse"
                                            name="subclass"
                                            value={form.subclass}
                                            onChange={handleChange}
                                            options={subclasses.map(subclass => ({
                                                value: subclass,
                                                label: formatEnum(subclass)
                                            }))}
                                        />

                                    </div>

                                    <div className="flex-1 min-w-30">

                                        <FloatingSelect 
                                            label="Trilha"
                                            name="trail"
                                            value={form.trail}
                                            onChange={handleChange}
                                            options={trails.map(trail => ({
                                                value: trail,
                                                label: formatEnum(trail)
                                            }))}
                                        />

                                    </div>
                                </div>


                                {/* Quarta Linha */}
                                <div className="flex w-full gap-4 mt-2"> 
                                    <div>
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
                                    </div>

                                </div>

                                {/* Quinta Linha */}
                                <div className="flex w-full gap-4 mt-2">
                                    <div className="w-full">
                                        <div className="grid grid-cols-2 gap-4">
                                            
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
                                            
                                            <FloatingInput
                                                label="Pontos de Investigação" 
                                                name="investigation_points" 
                                                type="number"
                                                value={form.investigation_points}
                                                onChange={handleChange}
                                            />

                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            
                                            
                                            
                                        </div>

                                        
                                            
                                    </div>

                                </div>

                            </div>

                            {/* Coluna 2 - Atributos */}
                            <div className="flex-1">

                                <div>

                                    <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                                        Atributos
                                    </h2>

                                    <div className="relative w-full flex justify-center">
                                        <img src={atributos_img} alt="Atributos" className="w-100 h-auto -mt-9"/>

                                        <input 
                                            name="atrib_agility" 
                                            type="number"
                                            value={form.atrib_agility}
                                            onChange={handleChange} 
                                            className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                            style={{top: "2%", left: "40.4%"}}
                                        />

                                        <input 
                                            name="atrib_intellect" 
                                            type="number"
                                            value={form.atrib_intellect} 
                                            onChange={handleChange} 
                                            className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                            style={{top: "26%", left: "66.5%"}}
                                        />

                                        <input 
                                            name="atrib_vitallity" 
                                            type="number"
                                            value={form.atrib_vitallity} 
                                            onChange={handleChange} 
                                            className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                            style={{top: "69%", left: "59.5%"}}
                                        />

                                        <input 
                                            name="atrib_presence" 
                                            type="number"
                                            value={form.atrib_presence} 
                                            onChange={handleChange} 
                                            className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                            style={{top: "69%", left: "21.5%"}}
                                        />

                                        <input 
                                            name="atrib_strength" 
                                            type="number"
                                            value={form.atrib_strength} 
                                            onChange={handleChange} 
                                            className="absolute w-20 h-16 text-5xl text-center rounded font-text"
                                            style={{top: "26%", left: "13.5%"}}                                    
                                        />

                                    </div>

                                </div>

                            </div>
                        </div>

                        
                        {/* Recursos */}


                        <div className="flex justify-end gap-4 mt-4">
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
                                Criar Personagem
                            </button>
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
