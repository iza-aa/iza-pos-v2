"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

interface CustomerSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  member_since: string | null;
}

type LoginResponse =
  | {
      success: true;
      customer: CustomerSession;
    }
  | {
      success: false;
      error: string;
    };

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function getRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/customer")) {
    return "/customer/menu";
  }

  return value;
}

function CustomerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectPath = getRedirectPath(searchParams.get("redirect"));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone) {
      setError("Please enter your WhatsApp number.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/customer/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
        }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success) {
        setError(
          result.success === false
            ? result.error
            : "Login failed. Please try again.",
        );
        return;
      }

      localStorage.setItem("customer_session", JSON.stringify(result.customer));
      localStorage.setItem("customer_id", result.customer.id);
      localStorage.setItem("customer_name", result.customer.name);
      localStorage.setItem("customer_phone", result.customer.phone);

      router.replace(redirectPath);
    } catch (loginError) {
      console.error("Customer login error:", loginError);
      setError("Unable to login. Please check your connection and try again.");
    } finally {
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
            Login to collect rewards from every order.
          </h1>
          <p className="mt-5 text-base leading-7 text-gray-300">
            Save your order history, collect loyalty points, and make your next
            checkout faster.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold">1</p>
              <p className="mt-1 text-xs text-gray-300">Login with WhatsApp</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold">2</p>
              <p className="mt-1 text-xs text-gray-300">Order as member</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold">3</p>
              <p className="mt-1 text-xs text-gray-300">Collect points</p>
            </div>
          </div>
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
                src="/logo/IZALogo2.png"
                alt="IZA Coffee"
                className="mx-auto h-16 w-auto object-contain"
              />
              <h1 className="mt-5 text-2xl font-bold text-gray-900">
                Welcome back
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Login with your WhatsApp number to access rewards and saved
                order details.
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
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

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                New to IZA Rewards?
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Create an account to start collecting points from your orders.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(`/customer/register?redirect=${encodeURIComponent(redirectPath)}`)
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
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