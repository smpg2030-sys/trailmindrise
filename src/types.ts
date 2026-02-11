export interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    is_verified?: boolean;
    profile_pic?: string | null;
}

export interface Post {
    id: string;
    user_id: string;
    author_name: string;
    author_email?: string;
    content: string;
    image_url?: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    rejection_reason?: string;
    author_profile_pic?: string | null;
}

export interface Video {
    id: string;
    user_id: string;
    author_name: string;
    author_email?: string;
    title?: string;
    caption?: string;
    video_url: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    rejection_reason?: string;
}
