import { create } from 'zustand';

export interface AppUser { id: string; provider: 'telegram'; displayName: string; createdAt: number; }
interface AuthState {
  user: AppUser | null; isAuthenticated: boolean; _hasHydrated: boolean;
  setUser: (user: AppUser | null) => void;
  updateDisplayName: (name: string) => Promise<void>;
  resetProfile: () => Promise<void>;
}
// Identity is restored only by the server, never from localStorage.
export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, _hasHydrated: false,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user), _hasHydrated: true }),
  updateDisplayName: async (name) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Войдите через Telegram');
    const response = await fetch('/api/auth/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, displayName: name }),
    });
    if (!response.ok) throw new Error('Не удалось сохранить имя');
    set({ user: { ...user, displayName: name } });
  },
  resetProfile: async () => {
    const response = await fetch('/api/auth/telegram', { method: 'DELETE' });
    if (!response.ok) throw new Error('Не удалось выйти');
    localStorage.removeItem('30-0-rpl-auth');
    localStorage.removeItem('30-0-rpl-storage');
    set({ user: null, isAuthenticated: false });
    window.location.reload();
  },
}));
export function isAuthHydrated() { return useAuthStore.getState()._hasHydrated; }
