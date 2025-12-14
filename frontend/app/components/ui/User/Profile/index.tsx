'use client'

import { useEffect, useState } from "react";
import { FiCamera, FiTrash2, FiLogOut } from "react-icons/fi";
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/activityLogger";
import { getCurrentUser } from "@/lib/authUtils";

interface ProfilePopoutProps {
  onClose: () => void;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePopout({ onClose }: ProfilePopoutProps) {
  const [profile, setProfile] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Form state untuk owner
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
    profile_photo: "",
    joined_at: "",
    password: "",
  });

  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith("/owner")) {
      const ownerId = localStorage.getItem("owner_id");
      if (ownerId) {
        setIsOwner(true);
        supabase
          .from("staff")
          .select("id, name, email, role, phone, profile_picture, created_at, password_hash")
          .eq("id", ownerId)
          .eq("role", "owner")
          .single()
          .then(({ data, error }) => {
            setProfile(data);
            setForm({
              name: data?.name ?? "",
              email: data?.email ?? "",
              role: data?.role ?? "",
              phone: data?.phone ?? "",
              profile_photo: data?.profile_picture ?? "",
              joined_at: data?.created_at ?? "",
              password: "",
            });
          });
      }
    } else {
      const staffId = localStorage.getItem("staff_id");
      if (staffId) {
        setIsOwner(false);
        supabase
          .from("staff")
          .select("id,staff_code,name,role,status,created_at,phone,login_code,login_code_expires_at")
          .eq("id", staffId)
          .single()
          .then(({ data, error }) => {
            setProfile(data);
          });
      }
    }
  }, []);

  const handleUpdateStaff = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("staff")
      .update({ name: profile.name })
      .eq("id", profile.id);

    if (!error) {
      alert("Data berhasil diubah!");
      // Optional: fetch ulang data staff jika ingin update tampilan
    } else {
      alert("Gagal mengubah data!");
    }
  };

  const handleLogout = async () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Log logout activity before clearing localStorage
      await logActivity({
        action: 'LOGOUT',
        category: 'AUTH',
        description: `${currentUser.role} ${currentUser.name} logged out`,
        resourceType: 'Authentication',
        severity: 'info'
      });
    }

    // Clear all auth data
    localStorage.clear();
    
    // Redirect to appropriate login page
    if (pathname.startsWith('/owner')) {
      window.location.href = '/owner/login';
    } else if (pathname.startsWith('/manager')) {
      window.location.href = '/manager/login';
    } else {
      window.location.href = '/staff/login';
    }
  };

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto p-8 z-10 flex items-center justify-center">
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Owner profile (form bisa diubah semua)
  if (isOwner) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-0 z-10">
          <div className="px-8 pt-8 pb-4 w-full">
            <div className="flex items-center w-full">
              {/* Kiri: Foto & Nama */}
              <div className="flex items-center">
                <div className="relative">
                  <img
                    src={form.profile_photo || "/avatar.jpg"}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                  />
                </div>
                <div className="flex flex-col ml-4 justify-center">
                  <span className="font-bold text-lg">{form.name}</span>
                </div>
              </div>
              {/* Kanan: Add & Delete Photo */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 rounded-full bg-blue-50 hover:bg-blue-100"
                  title="Tambah/Ganti foto"
                  onClick={() => alert("Fitur ganti foto belum tersedia")}
                >
                  <FiCamera className="w-5 h-5 text-blue-600" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full bg-red-50 hover:bg-red-100"
                  title="Hapus foto"
                  onClick={() => alert("Fitur hapus foto belum tersedia")}
                >
                  <FiTrash2 className="w-5 h-5 text-red-600"/>
                </button>
              </div>
            </div>
            {/* Tanggal Bergabung */}
            <div className="mt-4 mb-2">
              <div className="text-xs text-gray-500">Tanggal Bergabung</div>
              <div className="font-semibold text-sm mt-1">
                {form.joined_at ? new Date(form.joined_at).toLocaleDateString() : "-"}
              </div>
            </div>
          </div>
          {/* Form Owner */}
          <form className="px-8 pb-8">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nama</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">No WA</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Ubah Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                placeholder="Password baru"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold"
                onClick={onClose}
              >
                Tutup
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                onClick={() => alert("Fitur simpan perubahan belum tersedia")}
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Staff profile (default)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-0 z-10">
        {/* Header & Close */}
        <div className="px-8 pt-8 pb-4 w-full">
          <div className="flex items-center w-full">
            {/* Photo Profile */}
            <div className="relative">
              <img
                src={"/avatar.jpg"}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              />
            </div>
            {/* Nama & Status */}
            <div className="flex flex-col ml-4 justify-center">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{profile.name}</span>
                {profile.status === "Aktif" && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">{profile.status}</span>
                )}
                {profile.status === "Cuti" && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-semibold">{profile.status}</span>
                )}
                {profile.status === "Nonaktif" && (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-semibold">{profile.status}</span>
                )}
              </div>
            </div>
            {/* Icon tambah/hapus foto di ujung kanan */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-full bg-blue-50 hover:bg-blue-100"
                title="Tambah/Ganti foto"
                onClick={() => alert("Fitur ganti foto belum tersedia")}
              >
                <FiCamera className="w-5 h-5 text-blue-600" />
              </button>
              {/* Tampilkan tombol hapus jika sudah ada foto profile */}
              <button
                type="button"
                className="p-2 rounded-full bg-red-50 hover:bg-red-100"
                title="Hapus foto"
                onClick={() => alert("Fitur hapus foto belum tersedia")}
              >
                <FiTrash2 className="w-5 h-5 text-red-600"/>
              </button>
            </div>
          </div>
          {/* Stats section di atas form: Tanggal Bergabung, Total Hari Bekerja, Shift Terakhir */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2 mb-2">
            <div>
              <div className="text-xs text-gray-500">Tanggal Bergabung</div>
              <div className="font-semibold text-sm mt-1">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Hari Bekerja</div>
              <div className="font-semibold text-sm mt-1">
                {/* akan diisi dari DB nanti */}
                {profile.total_days_worked ?? profile.total_days_in ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Shift Terakhir</div>
              <div className="font-semibold text-sm mt-1">
                {profile.last_shift ? new Date(profile.last_shift).toLocaleString() : "-"}
              </div>
            </div>
          </div>
        </div>
        {/* Form */}
        <form className="px-8 pb-8">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nama</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Role</label>
              <input
                type="text"
                value={profile.role}
                disabled
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-200 text-gray-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">No WA</label>
            <input
              type="text"
              value={profile.phone || ""}
              disabled
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-200 text-gray-500"
            />
          </div>
          <div className="mb-6">
            <label className="text-xs text-gray-500 mb-1 block">ID Staff</label>
            <input
              type="text"
              value={profile.staff_code}
              disabled
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-200 text-gray-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors flex items-center gap-2"
              onClick={handleLogout}
            >
              <FiLogOut className="w-4 h-4" />
              Logout
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              Tutup
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              onClick={handleUpdateStaff}
            >
              Ubah Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}