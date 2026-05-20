"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EnvelopeIcon,
  KeyIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
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
    };

type CheckAvailabilityResponse =
  | {
      success: true;
      available: true;
    }
  | {
      success: true;
      available: false;
      field: "phone" | "email";
      message: string;
    }
  | {
      success: false;
      error: string;
    };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function getRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/customer")) {
    return "/customer/menu";
  }

  return value;
}

async function checkAccountAvailability(
  phone: string,
  email: string,
): Promise<string | null> {
  const response = await fetch("/api/customer/auth/check-availability", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      email,
    }),
  });

  const result = (await response.json()) as CheckAvailabilityResponse;

  if (!result.success) {
    return result.error;
  }

  if (!result.available) {
    return result.message;
  }

  if (!response.ok) {
    return "Failed to check account availability.";
  }

  return null;
}

function CustomerRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectPath = getRedirectPath(searchParams.get("redirect"));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }

    if (!cleanPhone) {
      setError("Please enter your WhatsApp number.");
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    if (cleanPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setError("");
    setInfo("");
    setLoading(true);

    try {
      const availabilityError = await checkAccountAvailability(cleanPhone, cleanEmail);

      if (availabilityError) {
        setError(availabilityError);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/customer/auth/callback`,
          data: {
            name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setInfo("Account created. Please check your email to confirm your account, then login.");
        return;
      }

      const response = await fetch("/api/customer/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          auth_provider: "email",
        }),
      });

      const result = (await response.json()) as SyncResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.success === false ? result.error : "Failed to create account.");
      }

      saveCustomerAccount(result.customer);
      router.replace(redirectPath);
    } catch (registerError) {
      console.error("Customer register error:", registerError);
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Unable to register. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

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
      setError(
        googleLoginError instanceof Error
          ? googleLoginError.message
          : "Unable to start Google login.",
      );
      setLoading(false);
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
            Create an account and start collecting points.
          </h1>
          <p className="mt-5 text-base leading-7 text-gray-300">
            Register with Google or email to save order history and unlock member rewards.
          </p>
        </div>

        <p className="text-xs text-gray-500">
          You can still order as guest without creating an account.
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
                src="/logo/IZALogo2.png"
                alt="IZA Coffee"
                className="mx-auto h-16 w-auto object-contain"
              />
              <h1 className="mt-5 text-2xl font-bold text-gray-900">
                Create account
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Join IZA Rewards to collect points from your orders.
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            {info ? (
              <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-700">{info}</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mb-4 flex w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Google
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400">OR</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-gray-700">
                  Name
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-gray-700">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <PhoneIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="08123456789"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <KeyIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Already a member?
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push(`/customer/login?redirect=${encodeURIComponent(redirectPath)}`)
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
              >
                Login
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
    </div>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <CustomerRegisterContent />
    </Suspense>
  );
}