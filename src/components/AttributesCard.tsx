import atributosImg from "../assets/atributos.svg"

type AttributeValues = {
    agility: number | string
    intellect: number | string
    vitallity: number | string
    presence: number | string
    strength: number | string
}

type AttributeInputNames = {
    agility: string
    intellect: string
    vitallity: string
    presence: string
    strength: string
}

type Props =
    | {
        mode: "view"
        values: AttributeValues
        avatarMarkSrc?: string
        fontSize?: number
        className?: string
    }
    | {
        mode: "edit"
        values: AttributeValues
        inputNames: AttributeInputNames
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
        className?: string
    }

const viewPositions = {
    agility: { x: 270, y: 110 },
    intellect: { x: 440, y: 235 },
    vitallity: { x: 395, y: 450 },
    presence: { x: 145, y: 450 },
    strength: { x: 95, y: 235 }
}

const inputSize = { width: 90, height: 70 }

export default function AttributesCard(props: Props) {
    const fontSize = props.mode === "view" ? (props.fontSize ?? 70) : 44

    return (
        <div className={props.className}>
            <svg
                className="w-full h-auto scale-130 origin-center"
                viewBox="0 0 555 560"
                role="img"
                aria-label="Atributos"
                preserveAspectRatio="xMidYMid meet"
            >
                <image
                    href={atributosImg}
                    x="0"
                    y="0"
                    width="555"
                    height="560"
                    preserveAspectRatio="none"
                />

                {props.mode === "view" && props.avatarMarkSrc && (
                    <image
                        href={props.avatarMarkSrc}
                        x="148"
                        y="200"
                        width="240"
                        height="240"
                        preserveAspectRatio="xMidYMid meet"
                    />
                )}

                {props.mode === "view" ? (
                    <>
                        <text
                            x={viewPositions.agility.x}
                            y={viewPositions.agility.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            alignmentBaseline="middle"
                            className="fill-white font-text"
                            fontSize={fontSize}
                        >
                            {props.values.agility}
                        </text>

                        <text
                            x={viewPositions.intellect.x}
                            y={viewPositions.intellect.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            alignmentBaseline="middle"
                            className="fill-white font-text"
                            fontSize={fontSize}
                        >
                            {props.values.intellect}
                        </text>

                        <text
                            x={viewPositions.vitallity.x}
                            y={viewPositions.vitallity.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            alignmentBaseline="middle"
                            className="fill-white font-text"
                            fontSize={fontSize}
                        >
                            {props.values.vitallity}
                        </text>

                        <text
                            x={viewPositions.presence.x}
                            y={viewPositions.presence.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            alignmentBaseline="middle"
                            className="fill-white font-text"
                            fontSize={fontSize}
                        >
                            {props.values.presence}
                        </text>

                        <text
                            x={viewPositions.strength.x}
                            y={viewPositions.strength.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            alignmentBaseline="middle"
                            className="fill-white font-text"
                            fontSize={fontSize}
                        >
                            {props.values.strength}
                        </text>
                    </>
                ) : (
                    <>
                        <foreignObject
                            x={viewPositions.agility.x - inputSize.width / 2}
                            y={viewPositions.agility.y - inputSize.height / 2}
                            width={inputSize.width}
                            height={inputSize.height}
                        >
                            <input
                                name={props.inputNames.agility}
                                type="number"
                                value={props.values.agility}
                                onChange={props.onChange}
                                className="w-full h-full text-5xl text-center rounded font-text bg-zinc-900/70 text-white border border-zinc-600"
                            />
                        </foreignObject>

                        <foreignObject
                            x={viewPositions.intellect.x - inputSize.width / 2}
                            y={viewPositions.intellect.y - inputSize.height / 2}
                            width={inputSize.width}
                            height={inputSize.height}
                        >
                            <input
                                name={props.inputNames.intellect}
                                type="number"
                                value={props.values.intellect}
                                onChange={props.onChange}
                                className="w-full h-full text-5xl text-center rounded font-text bg-zinc-900/70 text-white border border-zinc-600"
                            />
                        </foreignObject>

                        <foreignObject
                            x={viewPositions.vitallity.x - inputSize.width / 2}
                            y={viewPositions.vitallity.y - inputSize.height / 2}
                            width={inputSize.width}
                            height={inputSize.height}
                        >
                            <input
                                name={props.inputNames.vitallity}
                                type="number"
                                value={props.values.vitallity}
                                onChange={props.onChange}
                                className="w-full h-full text-5xl text-center rounded font-text bg-zinc-900/70 text-white border border-zinc-600"
                            />
                        </foreignObject>

                        <foreignObject
                            x={viewPositions.presence.x - inputSize.width / 2}
                            y={viewPositions.presence.y - inputSize.height / 2}
                            width={inputSize.width}
                            height={inputSize.height}
                        >
                            <input
                                name={props.inputNames.presence}
                                type="number"
                                value={props.values.presence}
                                onChange={props.onChange}
                                className="w-full h-full text-5xl text-center rounded font-text bg-zinc-900/70 text-white border border-zinc-600"
                            />
                        </foreignObject>

                        <foreignObject
                            x={viewPositions.strength.x - inputSize.width / 2}
                            y={viewPositions.strength.y - inputSize.height / 2}
                            width={inputSize.width}
                            height={inputSize.height}
                        >
                            <input
                                name={props.inputNames.strength}
                                type="number"
                                value={props.values.strength}
                                onChange={props.onChange}
                                className="w-full h-full text-5xl text-center rounded font-text bg-zinc-900/70 text-white border border-zinc-600"
                            />
                        </foreignObject>
                    </>
                )}
            </svg>
        </div>
    )
}
