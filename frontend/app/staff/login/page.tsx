"use client";
import { useState, useEffect } from "react";
import { logActivity } from "@/lib/services/activityLogger";

const slides = [
  {
    img: "/logo/coffeelogin.jpg",
    quote:
      "Tempatnya cozy banget buat nugas atau nongkrong bareng teman. Kopinya juga enak, rasa dan aromanya pas banget!",
    author: "Rina Putri",
  },
  {
    img: "/logo/coffeelogin2.jpg",
    quote:
      "Pelayanan cepat dan ramah, suasana cafenya bikin betah. Latte-nya wajib dicoba, creamy tapi tetap strong.",
    author: "Dimas Aditya",
  },
  {
    img: "/logo/coffeelogin3.jpg",
    quote:
      "Desain interiornya estetik, cocok buat foto-foto. Harganya juga terjangkau untuk kualitas kopi se-enak ini.",
    author: "Lia Kartika",
  },
];

export default function LoginStaffPage() {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto slide
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Panggil API login staff
    const res = await fetch("/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_code: staffId, login_code: password }),
    });

    const result = await res.json();
    setLoading(false);

    if (res.ok && result.success) {
      // Simpan data staff ke localStorage
      localStorage.setItem("user_id", result.user_id);
      localStorage.setItem("user_name", result.user_name);
      localStorage.setItem("user_role", result.user_role); // 'staff' atau 'manager'
      localStorage.setItem("staff_type", result.staff_type);
      localStorage.setItem("staff_code", result.staff_code);
      
      // Log successful login
      await logActivity({
        action: 'LOGIN',
        category: 'AUTH',
        description: `${result.user_role === 'manager' ? 'Manager' : 'Staff'} ${result.user_name} (${result.staff_code}) logged in successfully`,
        resourceType: 'Authentication',
        resourceName: `${result.staff_type} - ${result.staff_code}`,
        severity: 'info'
      });

      // Auto redirect berdasarkan role
      if (result.user_role === "manager") {
        window.location.href = "/manager/dashboard";
      } else {
        window.location.href = "/staff/dashboard";
      }
    } else {
      setError(result.error || "ID Staff atau Password salah.");
      
      // Log failed login attempt
      await logActivity({
        action: 'LOGIN',
        category: 'AUTH',
        description: `Failed staff login attempt`,
        resourceType: 'Authentication',
        severity: 'critical',
        notes: `Failed authentication attempt for staff code: ${staffId}`,
        tags: ['login', 'failed', 'security-alert']
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Kiri: Slider */}
      <div className="flex w-[70%] hidden md:block bg-white items-center justify-center py-8 pl-8">
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl bg-black/70 flex items-end">
          <img
            src={slides[current].img}
            alt="Testimonial"
            className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 rounded-2xl z-10"></div>
          {/* Caption */}
          <div className="relative z-20 p-8 text-white w-full">
            <p className="text-xl font-medium mb-4 leading-snug">
              “{slides[current].quote}”
            </p>
            <div className="font-semibold text-sm mb-2">
              {slides[current].author}
            </div>
            {/* Progress/indicator */}
            <div className="flex items-center gap-2 mt-4">
              {slides.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 w-full rounded-full transition-all duration-300 ${
                    idx === current
                      ? "bg-gradient-to-r from-blue-500 via-white-500 to-red-500 w-16"
                      : "bg-white/30 w-8"
                  }`}
                ></span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Kanan: Form */}
      <div className="w-full md:w-[30%] flex flex-col justify-center items-center bg-white p-8 mb-8">
        <div className="w-full">
          <div className="flex items-center mb-8 justify-center">
            <img src="/logo/IZALogo2.png" alt="Logo" className="w-20 mr-3" />
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Staff Login</h2>
            <p className="text-gray-500 text-sm mt-2">
              Sign in to start your shift
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Staff ID
              </label>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-400"
                placeholder="STF001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-400"
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="ml-2 text-sm text-gray-400">Remember me</span>
              </label>
            </div>
            <button
              type="submit"
              className="w-full font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Loading..." : "Sign In as Staff"}
            </button>
            <div className="mt-4 text-center">
              <a href="/manager/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                Login as Manager
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}