import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppUser {
  id: string;
  provider: 'guest' | 'yandex';
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

  loginWithYandex: () => void;
  handleYandexCallback: (params: { user_id: string; display_name: string; photo_url?: string }) => void;
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

      loginWithYandex: () => {
        // Redirect to Yandex OAuth
        window.location.href = '/api/auth/yandex';
      },

      handleYandexCallback: (params: { user_id: string; display_name: string; photo_url?: string }) => {
        set({
          user: {
            id: params.user_id,
            provider: 'yandex',
            username: null,
            firstName: params.display_name,
            lastName: null,
            photoUrl: params.photo_url || null,
            displayName: params.display_name,
          },
          isAuthenticated: true,
          isAuthenticating: false,
        });
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
