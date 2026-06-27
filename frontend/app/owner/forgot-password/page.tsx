"use client";
import { useState } from "react";
import Link from "next/link";

export default function OwnerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/owner/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error(`Server returned invalid response: ${text.slice(0, 100)}`);
      }

      if (res.ok && result.success) {
        setSuccess(result.message);
        setEmail("");
      } else {
        setError(result.error || "Gagal mengirim email reset password.");
      }
    } catch (err) {
      console.error("Forgot password submit error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <img src="/logo/IZALogo2.png" alt="Logo" className="w-20" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            Lupa Password?
          </h2>
          <p className="text-gray-600 text-sm text-center mb-8">
            Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
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
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black border border-gray-300"
                placeholder="Masukkan email owner"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full font-semibold bg-gradient-to-r from-black to-gray-600 text-white py-3 rounded-lg hover:opacity-95 transition-opacity"
              disabled={loading}
            >
              {loading ? "Mengirim..." : "Kirim Link Reset Password"}
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
