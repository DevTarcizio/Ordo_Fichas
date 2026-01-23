import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../services/api"
import MainLayout from "../components/MainLayout"

export default function CreateCharacter() {
    const navigate = useNavigate()


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
            <div className="min-h-screen bg-zinc-900 text-white flex justify-center items-center px-6">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-4xl bg-zinc-800 border border-zinc-700 rounded-lg p-8 flex flex-col gap-6"
                >
                    <h1 className="text-3xl font-bigtitle text-blue-500">
                        Criar Personagem
                    </h1>

                    {/* Identidade */}
                    <section>
                        
                        <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                            Identidade
                        </h2>

                        <div className="grid grid-cols-2 gap-4"> 
                            
                            <input 
                                name="name" 
                                placeholder="Nome" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="age" 
                                type="number"
                                placeholder="Idade" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="origin" 
                                placeholder="Origem" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="character_class" 
                                placeholder="Classe" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="rank" 
                                placeholder="Patente" 
                                onChange={handleChange} 
                                className="input"
                            />

                        </div>

                    </section>

                    {/* Progressão */}
                    <section>

                        <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                            Progressão
                        </h2>

                        <div className="grid grid-cols-3 gap-4">

                            <input 
                                name="nex_total" 
                                type="number"
                                placeholder="Nex Total" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="nex_class" 
                                type="number"
                                placeholder="Nex da Classe" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="nex_subclass" 
                                type="number"
                                placeholder="Nex da Sub-Classe" 
                                onChange={handleChange} 
                                className="input"
                            />

                        </div>
                    </section>

                    {/* Recursos */}
                    <section>

                        <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                            Recursos
                        </h2>

                        <div className="grid grid-cols-3 gap-4">

                            <input 
                                name="healthy_points" 
                                type="number"
                                placeholder="Pontos de Vida" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="sanity_points" 
                                type="number"
                                placeholder="Pontos de Sanidade" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="effort_points" 
                                type="number"
                                placeholder="Pontos de Esforço" 
                                onChange={handleChange} 
                                className="input"
                            />

                        </div>

                    </section>

                    {/* Atributos */}
                    <section>

                        <h2 className="text-xl font-smalltitle text-blue-400 mb-2">
                            Atributos
                        </h2>

                        <div className="grid grid-cols-5 gap-4">

                            <input 
                                name="atrib_agility" 
                                type="number"
                                placeholder="Agilidade" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="atrib_intellect" 
                                type="number"
                                placeholder="Intelecto" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="atrib_vitallity" 
                                type="number"
                                placeholder="Vigor" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="atrib_presence" 
                                type="number"
                                placeholder="Presença" 
                                onChange={handleChange} 
                                className="input"
                            />

                            <input 
                                name="atrib_strength" 
                                type="number"
                                placeholder="Força" 
                                onChange={handleChange} 
                                className="input"
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
                </form>
            </div>
        </MainLayout>
        
           )
}