import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TelegramUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  displayName: string;
  referralCode?: string;
}

interface AuthState {
  user: TelegramUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;

  loginWithTelegram: (initData: string, startParam?: string | null) => Promise<void>;
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

      loginWithTelegram: async (initData: string, _startParam?: string | null) => {
        set({ isAuthenticating: true });
        try {
          // Include start_param in initData for server-side referral tracking
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });

          if (!res.ok) {
            console.error('Telegram auth failed');
            // Fall back to guest mode
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
          console.error('Telegram auth error:', error);
          get().loginAsGuest();
        }
      },

      loginAsGuest: () => {
        set({
          user: {
            id: 'guest',
            telegramId: '',
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
          // Also update on server if not guest
          if (user.id !== 'guest') {
            fetch('/api/auth/profile', {
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
