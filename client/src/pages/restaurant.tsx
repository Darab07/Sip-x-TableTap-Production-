import React from "react";
import { useLocation } from "wouter";
import { LoginForm } from "@/components/login-form";
import {
  isRestaurantAuthenticated,
  setRestaurantAuthenticated,
} from "@/lib/restaurant-auth";

export default function Restaurant() {
  const [, setLocation] = useLocation();
  const [loginError, setLoginError] = React.useState("");

  React.useEffect(() => {
    if (isRestaurantAuthenticated("admin")) {
      setLocation("/restaurant/admin/dashboard");
      return;
    }

    if (isRestaurantAuthenticated("owner")) {
      setLocation("/restaurant/dashboard");
      return;
    }

    if (isRestaurantAuthenticated("manager")) {
      setLocation("/restaurant/manager/live-orders");
    }
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
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("email") ?? "")
              .trim()
              .toLowerCase();
            const password = String(formData.get("password") ?? "");
            const rememberMe = formData.get("rememberMe") === "on";

            if (email === "sipowner@tabletap.com" && password === "xyz123abc") {
              setLoginError("");
              setRestaurantAuthenticated("owner", rememberMe);
              setLocation("/restaurant/dashboard");
              return;
            }

            if (
              email === "sipmanager@tabletap.com" &&
              password === "xyz123abc"
            ) {
              setLoginError("");
              setRestaurantAuthenticated("manager", rememberMe);
              setLocation("/restaurant/manager/live-orders");
              return;
            }

            if (email === "admin@tabletap.com" && password === "xyz123abc") {
              setLoginError("");
              setRestaurantAuthenticated("admin", rememberMe);
              setLocation("/restaurant/admin/dashboard");
              return;
            }

            setLoginError("Invalid email or password.");
          }}
          errorMessage={loginError}
        />
      </div>
    </div>
  );
}
