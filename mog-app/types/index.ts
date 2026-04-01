export type Feature = {
  id: string;
  name: string;
  score: number; // 0–10
  icon: string; // SF Symbol name
  description: string;
  modules: Module[];
};

export type Module = {
  id: string;
  title: string;
  body: string;
};

export type LeaderboardUser = {
  id: string;
  name: string;
  avatarInitials: string;
  overallScore: number;
  rank: number;
};

export type UserProfile = {
  id: string;
  heightCm: number | null;
  weightKg: number | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type LeaderboardGroup = {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
};

export type GroupMember = {
  userId: string;
  displayName: string;
  avatarInitials: string;
  joinedAt: string;
};
