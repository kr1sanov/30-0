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
  _hasHydrated: boolean;

  loginWithYandex: () => void;
  handleYandexCallback: (params: { user_id: string; display_name: string; photo_url?: string; email?: string }) => void;
  loginAsGuest: () => void;
  updateDisplayName: (name: string) => void;
  logout: () => void;
  clearAuthError: () => void;
  setHasHydrated: (state: boolean) => void;
}

/**
 * Flag to track hydration completion outside the store
 * to avoid circular reference during store initialization.
 */
let _hydrationComplete = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
      _hasHydrated: false,

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

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: '30-0-rpl-auth',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      migrate: (persistedState: unknown, version: number) => {
        // Handle migration from older versions
        if (version < 1) {
          // v0 had no version field — data is still valid, just return as-is
          return persistedState as AuthState;
        }
        return persistedState as AuthState;
      },
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            // Only clear localStorage for genuine data corruption errors.
            // TDZ / init-order errors (e.g. HMR cycles) are non-fatal —
            // the persisted data is still valid; the store just hasn't been
            // assigned to its module-level variable yet.
            const msg = (error as Error)?.message ?? String(error);
            const isInitOrderError =
              msg.includes('before initialization') ||
              msg.includes('Cannot access');
            if (isInitOrderError) {
              // Non-fatal: keep localStorage intact so the next mount
              // (or a fresh page load) can rehydrate successfully.
            } else {
              console.error('[authStore] Rehydration failed, clearing corrupted state:', error);
              try {
                localStorage.removeItem('30-0-rpl-auth');
              } catch {}
            }
          }
          // Use queueMicrotask to defer store access until after initialization
          // This avoids the "Cannot access before initialization" error
          _hydrationComplete = true;
          queueMicrotask(() => {
            try {
              useAuthStore.setState({ _hasHydrated: true });
            } catch {
              // Last resort: retry after a small delay
              setTimeout(() => {
                useAuthStore.setState({ _hasHydrated: true });
              }, 50);
            }
          });
        };
      },
    },
  ),
);

/**
 * Check if auth store has completed hydration (for external consumers).
 */
export function isAuthHydrated(): boolean {
  return _hydrationComplete;
}
