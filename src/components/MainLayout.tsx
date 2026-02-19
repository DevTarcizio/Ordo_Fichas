import type { ReactNode } from "react"
import background_image from "../assets/background.png"

interface MainLayoutProps {
    children: ReactNode
}

export default function MainLayout({children}: MainLayoutProps) {
    return (
        <div className="relative min-h-screen w-full overflow-x-hidden text-white">

            {/* Background */}
            <img 
                src={background_image} 
                alt="Background"
                className="fixed inset-0 w-screen h-screen object-cover object-center" 
            />

            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50"/>

            {/* Conteudo Principal */}
            <div className="relative z-10 w-full">
                {children}
            </div>

        </div>
    )
}
