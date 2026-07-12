"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
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

function getRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/customer")) {
    return "/customer";
  }

  return value;
}

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailLabel, setEmailLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectPath = getRedirectPath(searchParams.get("redirect"));

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/customer/login");
        return;
      }

      const metadata = user.user_metadata as Record<string, unknown>;
      const metadataName =
        typeof metadata.full_name === "string"
          ? metadata.full_name
          : typeof metadata.name === "string"
            ? metadata.name
            : "";

      setName(metadataName || user.email?.split("@")[0] || "");
      setEmailLabel(user.email ?? "");
    };

    void loadUser();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\s+/g, "").trim();

    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }

    if (!cleanPhone) {
      setError("Please enter your WhatsApp number.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Your login session was not found.");
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
          auth_provider: "google",
        }),
      });

      const result = (await response.json()) as SyncResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.success === false ? result.error : "Failed to complete profile.");
      }

      saveCustomerAccount(result.customer);
      localStorage.removeItem("customer_auth_redirect");
      window.location.href = redirectPath;
    } catch (profileError) {
      console.error("Complete customer profile error:", profileError);
      setError(
        profileError instanceof Error
          ? profileError.message
          : "Failed to complete profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => router.replace("/customer/login")}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to login
        </button>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 text-center">
            <img
              src="/icons/lefttoplogolight.png"
              alt="IZA Coffee"
              className="mx-auto h-16 w-auto object-contain"
            />
            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Complete your profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Add your WhatsApp number so we can link your orders and rewards.
            </p>
            {emailLabel ? (
              <p className="mt-2 text-xs font-semibold text-gray-400">
                {emailLabel}
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
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
              className="w-full rounded-2xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CompleteProfileFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
    </div>
  );
}

export default function CustomerCompleteProfilePage() {
  return (
    <Suspense fallback={<CompleteProfileFallback />}>
      <CompleteProfileContent />
    </Suspense>
  );
}