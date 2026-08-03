import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppUser {
  id: string;
  provider: 'guest' | 'vk';
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  displayName: string;
}

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;

  loginWithVK: (code: string, state?: string) => Promise<void>;
  loginAsGuest: () => void;
  updateDisplayName: (name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,

      loginWithVK: async (code: string, _state?: string) => {
        set({ isAuthenticating: true });
        try {
          const res = await fetch('/api/auth/vk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (!res.ok) {
            console.error('VK auth failed');
            get().loginAsGuest();
            return;
          }

          const data = await res.json();
          set({
            user: data.user,
            isAuthenticated: true,
            isAuthenticating: false,
          });
        } catch (error) {
          console.error('VK auth error:', error);
          get().loginAsGuest();
        }
      },

      loginAsGuest: () => {
        set({
          user: {
            id: 'guest',
            provider: 'guest',
            username: null,
            firstName: 'Гость',
            lastName: null,
            photoUrl: null,
            displayName: 'Гость',
          },
          isAuthenticated: true,
          isAuthenticating: false,
        });
      },

      updateDisplayName: (name: string) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, displayName: name } });
          if (user.id !== 'guest') {
            fetch('/api/users/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, displayName: name }),
            }).catch(() => {});
          }
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: '30-0-rpl-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
