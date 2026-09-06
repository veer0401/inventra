export interface ShortcutProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  shortcuts: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortcutProfileRequest {
  name: string;
  description?: string | null;
  isActive?: boolean;
  shortcuts?: Record<string, string>;
}

export interface UpdateShortcutProfileRequest {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  shortcuts?: Record<string, string>;
}
