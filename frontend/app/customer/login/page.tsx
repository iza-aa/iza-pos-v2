"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EnvelopeIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import { saveCustomerAccount } from "@/lib/customer/customerAccount";
import { showError } from "@/lib/services/errorHandling";

interface CustomerSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  member_since: string | null;
}

type ResolveIdentifierResponse =
  | {
      success: true;
      email: string;
    }
  | {
      success: false;
      error: string;
    };

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

function getRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/customer")) {
    return "/customer/menu";
  }

  return value;
}

function CustomerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingManual, setLoadingManual] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const redirectPath = getRedirectPath(searchParams.get("redirect"));

  const resolveEmail = async (value: string): Promise<string> => {
    const response = await fetch("/api/customer/auth/resolve-identifier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: value,
      }),
    });

    const result = (await response.json()) as ResolveIdentifierResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.success === false ? result.error : "Account was not found.");
    }

    return result.email;
  };

  const syncCustomerSession = async (accessToken: string) => {
    const response = await fetch("/api/customer/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        auth_provider: "email",
      }),
    });

    const result = (await response.json()) as SyncResponse;

    if (!response.ok || !result.success) {
      if (!result.success && result.needs_profile) {
        router.replace(`/customer/complete-profile?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      throw new Error(result.success === false ? result.error : "Failed to load account.");
    }

    saveCustomerAccount(result.customer);
    router.replace(redirectPath);
  };

  const handleManualLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      showError("Please enter your email or WhatsApp number.");
      return;
    }

    if (!cleanPassword) {
      showError("Please enter your password.");
      return;
    }

    setLoadingManual(true);

    try {
      const email = await resolveEmail(cleanIdentifier);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPassword,
      });

      if (signInError) {
        throw signInError;
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("Login session was not created.");
      }

      await syncCustomerSession(accessToken);
    } catch (loginError) {
      console.error("Customer manual login error:", loginError);
      showError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to login. Please try again.",
      );
    } finally {
      setLoadingManual(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);

    try {
      localStorage.setItem("customer_auth_redirect", redirectPath);

      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/customer/auth/callback`,
        },
      });

      if (googleError) {
        throw googleError;
      }
    } catch (googleLoginError) {
      console.error("Customer Google login error:", googleLoginError);
      showError(
        googleLoginError instanceof Error
          ? googleLoginError.message
          : "Unable to start Google login.",
      );
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-gray-900 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <button
          type="button"
          onClick={() => router.push("/customer/menu")}
          className="flex w-fit items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to menu
        </button>

        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">
            IZA Rewards
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Login to collect rewards from every order.
          </h1>
          <p className="mt-5 text-base leading-7 text-gray-300">
            Login with Google, email, or WhatsApp number to save your order history and collect points.
          </p>
        </div>

        <p className="text-xs text-gray-500">
          Guest checkout is still available. Login is optional.
        </p>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => router.push("/customer/menu")}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900 lg:hidden"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to menu
          </button>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 text-center">
              <img
                src="/icons/lefttoplogolight.png"
                alt="IZA Coffee"
                className="mx-auto h-16 w-auto object-contain"
              />
              <h1 className="mt-5 text-2xl font-bold text-gray-900">
                Welcome back
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Login to access rewards and saved order details.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loadingGoogle || loadingManual}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <img src="/logo/google.svg" alt="Google" className="h-5 w-5" />
              {loadingGoogle ? "Opening Google..." : "Continue with Google"}
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400">OR</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

             <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Email or WhatsApp Number <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="you@email.com or 08123456789"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Password <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <KeyIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => router.push("/customer/forgot-password")}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingManual || loadingGoogle}
                className="flex w-full items-center justify-center rounded-2xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingManual ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                New to IZA Rewards?
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push(`/customer/register?redirect=${encodeURIComponent(redirectPath)}`)
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
              >
                Create Account
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.replace(redirectPath)}
              className="mt-4 w-full text-center text-sm font-semibold text-gray-500 transition hover:text-gray-900"
            >
              Continue as guest
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <CustomerLoginContent />
    </Suspense>
  );
}