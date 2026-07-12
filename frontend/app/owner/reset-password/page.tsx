"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function OwnerResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (!tokenFromUrl) {
      setError("Token tidak valid. Silakan request reset password lagi.");
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/owner/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const result = await res.json();
    setLoading(false);

    if (res.ok && result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        router.push("/owner/login");
      }, 2000);
    } else {
      setError(result.error || "Gagal mengubah password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <img src="/icons/lefttoplogolight.png" alt="Logo" className="w-20" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            Reset Password
          </h2>
          <p className="text-gray-600 text-sm text-center mb-8">
            Masukkan password baru Anda.
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm p-3 rounded-lg">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Baru
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black border border-gray-300"
                placeholder="Minimal 8 karakter"
                required
                disabled={!token}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konfirmasi Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black border border-gray-300"
                placeholder="Ulangi password baru"
                required
                disabled={!token}
              />
            </div>

            <button
              type="submit"
              className="w-full font-semibold bg-gradient-to-r from-black to-gray-600 text-white py-3 rounded-lg hover:opacity-95 transition-opacity disabled:opacity-50"
              disabled={loading || !token}
            >
              {loading ? "Mengubah..." : "Ubah Password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/owner/login"
              className="text-sm text-gray-600 hover:text-black hover:underline"
            >
              ← Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
