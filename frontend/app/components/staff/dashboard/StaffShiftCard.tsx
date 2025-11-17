"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { BiQr, BiKey } from "react-icons/bi";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { parseSupabaseTimestamp, formatJakartaDate, formatJakartaTime } from "@/lib/dateUtils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StaffShiftCard() {
  const [inputKode, setInputKode] = useState("");
  const [presensi, setPresensi] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<{ id: string; name: string } | null>(null);
  const [showModal, setShowModal] = useState<"input" | "scan" | null>(null);
  const [todayPresence, setTodayPresence] = useState<any>(null);

  // Ambil data staff login dari localStorage
  useEffect(() => {
    const id = localStorage.getItem("staff_id");
    if (id) {
      supabase
        .from("staff")
        .select("name")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) setStaff({ id, name: data.name });
        });
    }
  }, []);

  // Ambil daftar presensi staff yang login
  useEffect(() => {
    async function fetchPresensi() {
      if (!staff?.id) return;

      const { data } = await supabase
        .from("presensi_shift")
        .select("staff_id, staff:staff_id(name, staff_code), created_at, tanggal")
        .eq("staff_id", staff.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setPresensi(data || []);

      // Check today's presence
      const today = new Date().toISOString().slice(0, 10);
      const todayData = data?.find((p: any) => p.tanggal === today);
      setTodayPresence(todayData);
    }
    fetchPresensi();
  }, [staff]);

  const handlePresensi = async () => {
    if (!staff) return;

    const { data } = await supabase
      .from("presence_code")
      .select("code, expires_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!data || new Date(data.expires_at) < new Date()) {
      setError("Kode presensi sudah expired.");
      setInputKode("");
      return;
    }

    if (inputKode === data.code) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: sudah } = await supabase
        .from("presensi_shift")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("tanggal", today)
        .maybeSingle();

      if (sudah) {
        setError("Anda sudah presensi hari ini.");
      } else {
        await supabase.from("presensi_shift").insert([
          { staff_id: staff.id, tanggal: today }
        ]);
        setError("");
        
        // Refresh data
        const { data: newData } = await supabase
          .from("presensi_shift")
          .select("staff_id, staff:staff_id(name, staff_code), created_at, tanggal")
          .eq("staff_id", staff.id)
          .order("created_at", { ascending: false })
          .limit(5);
        
        setPresensi(newData || []);
        const todayData = newData?.find((p: any) => p.tanggal === today);
        setTodayPresence(todayData);
      }
    } else {
      setError("Kode presensi salah.");
    }
    setInputKode("");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-[307px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">My Shift & Attendance</h3>
        {todayPresence ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            ✓ Checked In
          </span>
        ) : (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            Not Checked In
          </span>
        )}
      </div>

      {/* Presensi Actions */}
      {!todayPresence && (
        <div className="flex gap-2 mb-4">
          <button
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            onClick={() => setShowModal("input")}
            disabled={!staff}
          >
            <BiKey className="w-5 h-5" />
            <span className="text-sm font-medium">Input Code</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            onClick={() => setShowModal("scan")}
            disabled={!staff}
          >
            <BiQr className="w-5 h-5" />
            <span className="text-sm font-medium">Scan QR</span>
          </button>
        </div>
      )}

      {/* Recent Attendance */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Attendance</h4>
        <div className="space-y-2">
          {presensi.length > 0 ? (
            presensi.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {formatJakartaDate(parseSupabaseTimestamp(p.tanggal))}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatJakartaTime(parseSupabaseTimestamp(p.created_at))}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No attendance records yet.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 backdrop-blur-sm bg-black/30"
            onClick={() => setShowModal(null)}
          />
          <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-auto z-10">
            {showModal === "input" && (
              <>
                <div className="mb-4 text-lg font-semibold text-center">Input Kode Presensi</div>
                <input
                  type="text"
                  placeholder="Masukkan kode presensi"
                  value={inputKode}
                  onChange={(e) => setInputKode(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-2"
                />
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition w-full mt-4"
                  onClick={() => {
                    handlePresensi();
                    setShowModal(null);
                  }}
                  disabled={!staff}
                >
                  Submit
                </button>
                {error && <div className="text-red-600 mt-2 text-sm text-center">{error}</div>}
                <button
                  className="mt-4 text-gray-500 hover:underline w-full"
                  onClick={() => setShowModal(null)}
                >
                  Tutup
                </button>
              </>
            )}
            {showModal === "scan" && (
              <>
                <div className="mb-4 text-lg font-semibold text-center">Scan QR Code Presensi</div>
                <div className="text-gray-400 text-center py-8">
                  [Fitur scan QR belum diimplementasikan]
                </div>
                <button
                  className="mt-4 text-gray-500 hover:underline w-full"
                  onClick={() => setShowModal(null)}
                >
                  Tutup
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
