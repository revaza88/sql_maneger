export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  sqlServerUsername?: string;
  sqlServerPassword?: string;
  isBlocked?: boolean;
  isPaused?: boolean; // Added paused status
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
  sqlServerUsername?: string;
  sqlServerPassword?: string;
  isBlocked?: boolean;
  isPaused?: boolean; // Added paused status
}

export interface UserProfileUpdate {
  name?: string;
  email?: string;
}

export interface UserPasswordUpdate {
  currentPassword: string;
  newPassword: string;
}
