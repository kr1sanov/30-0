import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppUser {
  id: string;
  provider: 'local';
  displayName: string;
  createdAt: number; // timestamp
}

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  initLocalProfile: () => void;
  updateDisplayName: (name: string) => void;
  resetProfile: () => void;
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
      _hasHydrated: false,

      initLocalProfile: () => {
        const { user } = get();
        if (user) return; // already initialized
        // Create a new local profile with a random ID
        const id = `local_${crypto.randomUUID().slice(0, 8)}`;
        set({
          user: {
            id,
            provider: 'local',
            displayName: 'Игрок',
            createdAt: Date.now(),
          },
          isAuthenticated: true,
        });
      },

      updateDisplayName: (name: string) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, displayName: name } });
        }
      },

      resetProfile: () => {
        set({ user: null, isAuthenticated: false });
        // Re-initialize with a fresh profile
        const id = `local_${crypto.randomUUID().slice(0, 8)}`;
        set({
          user: {
            id,
            provider: 'local',
            displayName: 'Игрок',
            createdAt: Date.now(),
          },
          isAuthenticated: true,
        });
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: '30-0-rpl-auth',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      migrate: (persistedState: unknown, version: number) => {
        // Migration from v1 (Yandex auth) to v2 (local profile)
        if (version < 2) {
          const old = persistedState as Record<string, unknown>;
          // Clear old Yandex data — user will get a fresh local profile
          if (old.user && (old.user as Record<string, unknown>).provider === 'yandex') {
            return {
              ...old,
              user: null,
              isAuthenticated: false,
            } as AuthState;
          }
          // Keep guest/local data
          return persistedState as AuthState;
        }
        return persistedState as AuthState;
      },
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            const msg = (error as Error)?.message ?? String(error);
            const isInitOrderError =
              msg.includes('before initialization') ||
              msg.includes('Cannot access');
            if (!isInitOrderError) {
              console.error('[authStore] Rehydration failed, clearing corrupted state:', error);
              try {
                localStorage.removeItem('30-0-rpl-auth');
              } catch {}
            }
          }
          _hydrationComplete = true;
          queueMicrotask(() => {
            try {
              useAuthStore.setState({ _hasHydrated: true });
            } catch {
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
