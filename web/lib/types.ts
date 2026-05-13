export interface Account {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
  auth_method: string;
  follower_count: number;
  following_count: number;
  last_active: string | null;
  created_at: string;
}
