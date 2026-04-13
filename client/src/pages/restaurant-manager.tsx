import React from "react";
import { useLocation } from "wouter";
import { LoginForm } from "@/components/login-form";
import { fetchStaffSession } from "@/lib/tabletap-supabase-api";
import {
  clearRestaurantAuthentication,
  getRestaurantAuthenticatedSession,
  setRestaurantAuthenticated,
  type RestaurantAuthenticatedSession,
} from "@/lib/restaurant-auth";
import { supabaseBrowser } from "@/lib/supabase";

const getRoleRoute = (role: "owner" | "manager" | "admin") => {
  if (role === "admin") return "/restaurant/admin/dashboard";
  if (role === "manager") return "/restaurant/manager/live-orders";
  return "/restaurant/dashboard";
};

export default function RestaurantManager() {
  const [, setLocation] = useLocation();
  const [loginError, setLoginError] = React.useState("");

  React.useEffect(() => {
    const existing = getRestaurantAuthenticatedSession();
    const authClient = supabaseBrowser;

    if (!authClient) {
      if (existing?.highestRole) {
        setLocation(getRoleRoute(existing.highestRole));
      }
      return;
    }

    let cancelled = false;
    const bootstrap = async () => {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (cancelled) {
        return;
      }

      if (!session) {
        if (existing?.highestRole) {
          clearRestaurantAuthentication();
          setLoginError("Session expired. Please log in again.");
        }
        return;
      }

      try {
        const staffSession = await fetchStaffSession();
        if (!staffSession.highestRole) {
          await authClient.auth.signOut();
          clearRestaurantAuthentication();
          if (!cancelled) {
            setLoginError("This account is not assigned to any dashboard role.");
          }
          return;
        }

        const normalized: RestaurantAuthenticatedSession = {
          user: staffSession.user,
          highestRole: staffSession.highestRole,
          roles: staffSession.roles,
          outlets: staffSession.outlets,
        };

        setRestaurantAuthenticated(normalized, true);
        if (!cancelled) {
          setLocation(getRoleRoute(normalized.highestRole));
        }
      } catch {
        await authClient.auth.signOut();
        clearRestaurantAuthentication();
        if (!cancelled) {
          setLoginError("Session expired. Please log in again.");
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <img
        src="/TableTap.png"
        alt="TableTap logo"
        className="absolute left-4 top-4 h-24 w-auto"
      />
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <LoginForm
          onSubmit={async (event) => {
            event.preventDefault();
            setLoginError("");

            const authClient = supabaseBrowser;
            if (!authClient) {
              setLoginError("Supabase auth is not configured.");
              return;
            }

            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("email") ?? "")
              .trim()
              .toLowerCase();
            const password = String(formData.get("password") ?? "");
            const rememberMe = formData.get("rememberMe") === "on";

            const { error } = await authClient.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              setLoginError(error.message || "Invalid email or password.");
              return;
            }

            try {
              const staffSession = await fetchStaffSession();
              if (!staffSession.highestRole) {
                await authClient.auth.signOut();
                clearRestaurantAuthentication();
                setLoginError("This account is not assigned to any dashboard role.");
                return;
              }

              const normalized: RestaurantAuthenticatedSession = {
                user: staffSession.user,
                highestRole: staffSession.highestRole,
                roles: staffSession.roles,
                outlets: staffSession.outlets,
              };

              setRestaurantAuthenticated(normalized, rememberMe);
              setLocation(getRoleRoute(normalized.highestRole));
            } catch (sessionError) {
              await authClient.auth.signOut();
              clearRestaurantAuthentication();
              setLoginError(
                sessionError instanceof Error
                  ? sessionError.message
                  : "Unable to verify dashboard access.",
              );
            }
          }}
          errorMessage={loginError}
        />
      </div>
    </div>
  );
}

