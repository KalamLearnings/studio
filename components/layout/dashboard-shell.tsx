"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { EnvironmentBanner } from "./environment-banner";
import { EnvironmentLoginModal } from "./environment-login-modal";
import {
  useEnvironmentStore,
  getPersistedEnvironment,
  type Environment,
} from "@/lib/stores/environmentStore";
import { getClientForEnv } from "@/lib/supabase/client";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { environment, setEnvironment } = useEnvironmentStore();

  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [envReady, setEnvReady] = React.useState(false);

  // Environment login modal state
  const [showEnvLogin, setShowEnvLogin] = React.useState(false);
  const [envLoginTarget, setEnvLoginTarget] = React.useState<Environment>("dev");

  // Initialize environment from localStorage on mount
  React.useEffect(() => {
    const persisted = getPersistedEnvironment();
    if (persisted !== environment) {
      setEnvironment(persisted);
    }
    setEnvReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check auth when environment is ready or changes
  React.useEffect(() => {
    if (!envReady) return;

    setLoading(true);
    setUser(null);

    const supabase = getClientForEnv(environment);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    });
  }, [router, environment, envReady]);

  // Check if target environment has a valid session
  const checkEnvSession = React.useCallback(
    async (env: Environment): Promise<boolean> => {
      try {
        const client = getClientForEnv(env);
        const {
          data: { session },
        } = await client.auth.getSession();
        return !!session;
      } catch {
        return false;
      }
    },
    []
  );

  // Handle environment switch
  const handleEnvironmentSwitch = React.useCallback(
    async (env?: Environment) => {
      const targetEnv = env ?? (environment === "dev" ? "prod" : "dev");
      if (targetEnv === environment) return;

      const hasSession = await checkEnvSession(targetEnv);

      if (hasSession) {
        setEnvironment(targetEnv);
        queryClient.clear();
      } else {
        setEnvLoginTarget(targetEnv);
        setShowEnvLogin(true);
      }
    },
    [environment, setEnvironment, queryClient, checkEnvSession]
  );

  // Handle successful environment login
  const handleEnvLoginSuccess = React.useCallback(() => {
    setShowEnvLogin(false);
    setEnvironment(envLoginTarget);
    queryClient.clear();
  }, [envLoginTarget, setEnvironment, queryClient]);

  // Handle sign out
  const handleSignOut = React.useCallback(async () => {
    const supabase = getClientForEnv(environment);
    await supabase.auth.signOut();
    router.push("/login");
  }, [environment, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Production Warning Banner */}
      <EnvironmentBanner
        environment={environment}
        onSwitch={() => handleEnvironmentSwitch("dev")}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar onSignOut={handleSignOut} />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            title={title}
            environment={environment}
            onEnvironmentClick={() => handleEnvironmentSwitch()}
            user={user}
          />

          <main className="flex-1 overflow-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Environment Login Modal */}
      <EnvironmentLoginModal
        open={showEnvLogin}
        onOpenChange={setShowEnvLogin}
        targetEnvironment={envLoginTarget}
        currentUserEmail={user?.email}
        onSuccess={handleEnvLoginSuccess}
      />
    </div>
  );
}
