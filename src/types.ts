export interface User {
    id: string;
    email: string;
    full_name?: string | null;
    role?: string;
    is_verified?: boolean;
    profile_pic?: string | null;
    bio?: string | null;
    mobile?: string | null;
    created_at?: string | null;
}

export interface Post {
    id: string;
    user_id: string;
    author_name: string;
    author_email?: string;
    content: string;
    image_url?: string;
    video_url?: string;
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

export interface FriendRequest {
    request_id: string;
    from_user_id: string;
    from_user_name: string;
    created_at: string;
}

export interface AppFriend {
    id: string;
    full_name: string | null;
    email: string;
    profile_pic?: string | null;
}

export interface AppNotification {
    id: string;
    message: string;
    type: "friend_request" | "request_accepted" | "general";
    created_at: string;
    read?: boolean;
}

export interface CommunityStory {
    id: string;
    title: string;
    description: string;
    content: string;
    image_url?: string;
    author?: string;
    created_at: string;
}

export interface JournalEntry {
    id: string;
    user_id: string;
    title?: string;
    content: string;
    date: string;
    created_at: string;
}
