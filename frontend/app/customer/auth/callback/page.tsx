"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/app/components/customer/LoadingScreen";
import { supabase } from "@/lib/config/supabaseClient";
import { saveCustomerAccount } from "@/lib/customer/customerAccount";

interface CustomerSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  member_since: string | null;
}

type SyncResponse =
  | {
      success: true;
      customer: CustomerSession;
    }
  | {
      success: false;
      error: string;
      needs_profile?: boolean;
    };

function getRedirectPath(): string {
  const storedRedirect = localStorage.getItem("customer_auth_redirect");

  if (storedRedirect?.startsWith("/customer")) {
    return storedRedirect;
  }

  return "/customer";
}

export default function CustomerAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const completeAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Google login session was not found.");
        }

        const response = await fetch("/api/customer/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            auth_provider: "google",
          }),
        });

        const result = (await response.json()) as SyncResponse;

        if (!response.ok || !result.success) {
          if (!result.success && result.needs_profile) {
            router.replace(
              `/customer/complete-profile?redirect=${encodeURIComponent(getRedirectPath())}`,
            );
            return;
          }

          throw new Error(result.success === false ? result.error : "Failed to sync account.");
        }

        saveCustomerAccount(result.customer);
        localStorage.removeItem("customer_auth_redirect");

        window.location.href = getRedirectPath();
      } catch (authError) {
        console.error("Customer auth callback error:", authError);

        if (isMounted) {
          setError(
            authError instanceof Error
              ? authError.message
              : "Failed to complete Google login.",
          );
        }
      }
    };

    void completeAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Login Failed</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/customer/login")}
            className="mt-6 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <LoadingScreen
      title="Completing Login..."
      subtitle="Please wait while we prepare your account"
      hideBottomNav
    />
  );
}
