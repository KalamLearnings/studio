/**
 * Zustand store for environment switching (dev/prod)
 * Persists selection to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Environment = 'dev' | 'prod';

interface EnvironmentConfig {
  url: string;
  anonKey: string;
}

/**
 * Check if we're running on localhost (development server)
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Get the appropriate config based on the selected environment.
 * Respects the environment toggle even when running locally.
 */
function getEnvConfig(env: Environment): EnvironmentConfig {
  if (env === 'prod') {
    return {
      url: process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!,
    };
  }

  // For 'dev' environment:
  // - Use local Supabase if running locally and local URL is configured
  // - Otherwise use remote dev environment
  if (isLocalhost() && process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1')) {
    // Check if user wants to use local Supabase (default when running locally)
    // To use remote dev, set NEXT_PUBLIC_USE_REMOTE_DEV=true
    if (process.env.NEXT_PUBLIC_USE_REMOTE_DEV !== 'true') {
      return {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      };
    }
  }

  return {
    url: process.env.NEXT_PUBLIC_DEV_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY!,
  };
}

// Legacy static configs for backwards compatibility (used during SSR)
const ENV_CONFIGS: Record<Environment, EnvironmentConfig> = {
  dev: {
    url: process.env.NEXT_PUBLIC_DEV_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY!,
  },
  prod: {
    url: process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!,
  },
};

interface EnvironmentStore {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  getConfig: () => EnvironmentConfig;
}

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      environment: 'dev',
      setEnvironment: (env: Environment) => set({ environment: env }),
      getConfig: () => ENV_CONFIGS[get().environment],
    }),
    {
      name: 'kalam-environment',
    }
  )
);

/**
 * Get the current environment config (usable outside React components)
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return ENV_CONFIGS[useEnvironmentStore.getState().environment];
}

export function getCurrentEnvironment(): Environment {
  return useEnvironmentStore.getState().environment;
}

export function getConfigForEnvironment(env: Environment) {
  return getEnvConfig(env);
}

/**
 * Read the persisted environment directly from localStorage (synchronous).
 * Use this instead of the Zustand hook when you need the value immediately
 * on page load, before Zustand's async hydration completes.
 */
export function getPersistedEnvironment(): Environment {
  if (typeof window === 'undefined') return 'dev';
  try {
    const raw = localStorage.getItem('kalam-environment');
    if (raw) {
      const parsed = JSON.parse(raw);
      const env = parsed?.state?.environment;
      if (env === 'dev' || env === 'prod') return env;
    }
  } catch {
    // ignore
  }
  return 'dev';
}
