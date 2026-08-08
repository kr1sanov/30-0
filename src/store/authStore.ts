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
  email?: string | null;
}

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;

  loginWithYandex: () => void;
  handleYandexCallback: (params: { user_id: string; display_name: string; photo_url?: string; email?: string }) => void;
  loginAsGuest: () => void;
  updateDisplayName: (name: string) => void;
  logout: () => void;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,

      loginWithYandex: () => {
        set({ isAuthenticating: true, authError: null });
        // Redirect to Yandex OAuth login route
        // The API route will redirect to Yandex's authorization page
        window.location.href = '/api/auth/yandex';
      },

      handleYandexCallback: (params: { user_id: string; display_name: string; photo_url?: string; email?: string }) => {
        set({
          user: {
            id: params.user_id,
            provider: 'yandex',
            username: null,
            firstName: params.display_name,
            lastName: null,
            photoUrl: params.photo_url || null,
            displayName: params.display_name,
            email: params.email || null,
          },
          isAuthenticated: true,
          isAuthenticating: false,
          authError: null,
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
            email: null,
          },
          isAuthenticated: true,
          isAuthenticating: false,
          authError: null,
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
        // Call logout API to clear any server-side session
        fetch('/api/auth/yandex/logout', { method: 'POST' }).catch(() => {});
        set({ user: null, isAuthenticated: false, isAuthenticating: false, authError: null });
      },

      clearAuthError: () => {
        set({ authError: null });
      },
    }),
    {
      name: '30-0-rpl-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
