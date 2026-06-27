"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import { showError, showSuccess } from "@/lib/services/errorHandling";

export default function CustomerResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanPassword || cleanPassword.length < 6) {
      showError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      showError("Password confirmation does not match.");
      setLoading(false);
      return;
    }

    try {
      // Supabase automatically holds the active recovery session on this page
      const { error: updateError } = await supabase.auth.updateUser({
        password: cleanPassword,
      });

      if (updateError) {
        throw updateError;
      }

      showSuccess("Password Anda berhasil diperbarui. Mengalihkan ke halaman login...");
      setPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        router.push("/customer/login");
      }, 3000);
    } catch (err) {
      console.error("Reset password error:", err);
      showError(err instanceof Error ? err.message : "Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div>
          <div className="flex justify-center">
            <img src="/logo/IZALogo2.png" alt="Logo" className="w-20" />
          </div>
          <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-gray-900">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
                New Password <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="New Password (min 6 chars)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-gray-700">
                Confirm New Password <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="Confirm New Password"
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
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
