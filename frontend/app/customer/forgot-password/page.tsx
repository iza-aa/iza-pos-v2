"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";

export default function CustomerForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      // 1. Verify that email exists in our customers table
      const verifyRes = await fetch("/api/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const verifyResult = await verifyRes.json();

      if (!verifyRes.ok || !verifyResult.success) {
        throw new Error(verifyResult.error || "Gagal memverifikasi email.");
      }

      // 2. Trigger Supabase reset password email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/customer/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      showSuccess("Link reset password telah dikirim ke email Anda. Silakan periksa kotak masuk Anda.");
      setEmail("");
    } catch (err) {
      console.error("Forgot password error:", err);
      showError(err instanceof Error ? err.message : "Gagal memproses permintaan Lupa Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div>
          <button
            type="button"
            onClick={() => router.push("/customer/login")}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Login
          </button>
          <div className="flex justify-center mt-6">
            <img src="/logo/IZALogo2.png" alt="Logo" className="w-20" />
          </div>
          <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your active email address to receive a password reset link.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="mb-2 block text-sm font-semibold text-gray-700">
                Email Address <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-black py-3 px-4 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
