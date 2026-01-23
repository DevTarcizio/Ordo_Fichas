//import logo from '../assets/logo_ordo.png'
import logo_glow from '../assets/logo_ordo_glow.png'
import { useState } from 'react'
import AuthModal from '../components/AuthModal'
import MainLayout from '../components/MainLayout'

export default function Home(){
    const [authMode, setAuthMode] = useState<"login" | "register" | null>(null)

    return (
        <MainLayout>
            <div className="flex flex-col items-center justify-center min-h-screen px-6">

                <img src={logo_glow} alt="Ordo Praesidium" className="w-[70vw] md:w-137.5 -mt-10 mb-6 animate-fade-up"/>

                <p className="font-smalltitle text-zinc-200 -mt-4 mb-8 max-w-md text-center">
                    Sistema de fichas personalizado para os players de ordo Praesidium RPG
                </p>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <button 
                        className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-text" 
                        onClick={() => setAuthMode("register")}
                    >
                        Cadastre-se
                    </button>

                    <button 
                        className="w-full md:w-auto px-6 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition font-text"
                        onClick={() => setAuthMode("login")}
                    >
                        Entrar
                    </button>
                </div>

                <AuthModal 
                    isOpen={authMode !== null}
                    mode={authMode ?? "login"}
                    onClose={() => setAuthMode(null)}
                />

            </div>

        </MainLayout>
    )
}