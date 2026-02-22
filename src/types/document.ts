export type DocumentSummary = {
    id: number
    character_id: number
    found_location: string
    original_name: string
    content_type: string
    size_bytes: number
    is_released: boolean
    released_to_user_id?: number | null
    is_shared_to_all?: boolean
    released_at?: string | null
    created_at: string
}

export type DocumentAnnotation = {
    id: number
    document_id: number
    user_id: number
    body: string
    created_at: string
    updated_at: string
}

export type DocumentSharePayload = {
    share_with_all: boolean
    character_id?: number | null
}

export type DocumentReleasePayload = {
    is_released: boolean
    released_to_user_id?: number | null
}
