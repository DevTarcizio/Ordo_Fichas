//import logo from '../assets/logo_ordo.png'
import logo_glow from '../assets/logo_ordo_glow.png'
import background_image from '../assets/background.png'

export default function Home(){
    return (
        <div className="relative min-h-screen overflow-hidden text-white">
             
            {/* Background */}
            <img src={background_image} alt="Background" className="absolute inset-0 w-full h-full object-cover"/>

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Conteudo */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
                
                <img src={logo_glow} alt="Ordo Praesidium" className="w-[70vw] md:w-137.5 -mt-10 mb-6 animate-fade-up"/>

                <p className="font-smalltitle text-zinc-200 -mt-4 mb-8 max-w-md text-center">
                    Sistema de fichas próprios para os players de ordo Praesidium RPG
                </p>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <button className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-text">
                        Cadastre-se
                    </button>

                    <button className="w-full md:w-auto px-6 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition font-text">
                        Entrar
                    </button>
                </div>
            </div>
            

        </div>
    )
}