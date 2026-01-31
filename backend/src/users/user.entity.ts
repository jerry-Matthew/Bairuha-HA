
export interface User {
    id: string;
    email: string;
    password_hash: string;
    name?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
