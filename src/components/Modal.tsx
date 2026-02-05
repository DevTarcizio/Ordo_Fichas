import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

type ModalBaseProps<T extends ElementType> = {
    as?: T
    isOpen: boolean
    onClose?: () => void
    className?: string
    backdropClassName?: string
    closeOnBackdrop?: boolean
    children: ReactNode
}

type ModalProps<T extends ElementType> = ModalBaseProps<T> &
    Omit<ComponentPropsWithoutRef<T>, keyof ModalBaseProps<T>>

export default function Modal<T extends ElementType = "div">({
    as,
    isOpen,
    onClose,
    className,
    backdropClassName = "bg-black/70 backdrop-blur-sm",
    closeOnBackdrop = true,
    children,
    ...rest
}: ModalProps<T>) {
    if (!isOpen) return null

    const Component = (as ?? "div") as ElementType
    const shouldCloseOnBackdrop = closeOnBackdrop && Boolean(onClose)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 ${backdropClassName}`}
                onClick={shouldCloseOnBackdrop ? onClose : undefined}
            />
            <Component className={`relative z-10 ${className ?? ""}`} {...rest}>
                {children}
            </Component>
        </div>
    )
}
