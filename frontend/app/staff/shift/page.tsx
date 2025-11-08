"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { BiQr, BiKey } from "react-icons/bi";
import { useSearchParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ShiftPresensiPage() {
  const searchParams = useSearchParams();
  const viewAsOwner = searchParams.get('viewAs') === 'owner';
  
  const [inputKode, setInputKode] = useState("");
  const [presensi, setPresensi] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<{ id: string; name: string } | null>(null);
  const [showModal, setShowModal] = useState<"input" | "scan" | null>(null);

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

  // Ambil daftar presensi hari ini dari Supabase
  useEffect(() => {
    async function fetchPresensi() {
      const today = new Date().toISOString().slice(0, 10);
      
      let query = supabase
        .from("presensi_shift")
        .select("staff_id, staff:staff_id(name, staff_code), created_at")
        .eq("tanggal", today);
      
      // Jika bukan owner (staff biasa), filter hanya data mereka
      if (!viewAsOwner && staff?.id) {
        query = query.eq("staff_id", staff.id);
      }
      
      const { data } = await query;
      setPresensi(data || []);
    }
    fetchPresensi();
  }, [viewAsOwner, staff]);

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
        const { data } = await supabase
          .from("presensi_shift")
          .select("staff_id, staff:staff_id(name, staff_code), created_at")
          .eq("tanggal", today);
        setPresensi(data || []);
      }
    } else {
      setError("Kode presensi salah.");
    }
    setInputKode("");
  };

  return (
    <div className="w-full mx-auto py-8 px-4 relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="lg:text-2xl md:text-xl text-xl font-bold">
            Presensi Staff
            {viewAsOwner && (
              <span className="ml-3 text-sm font-normal bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                👁️ Viewing as Owner
              </span>
            )}
          </h2>
          <p className="text-gray-500 text-sm">
            {viewAsOwner 
              ? "Melihat semua presensi staff hari ini"
              : "Silakan lakukan presensi dengan memasukkan kode atau scan QR."
            }
          </p>
        </div>
        <div className="flex gap-2">
          {!viewAsOwner && (
            <>
              <button
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                onClick={() => setShowModal("input")}
                disabled={!staff}
                title="Input Kode"
              >
                <BiKey className="w-6 h-6" />
              </button>
              <button
                className="bg-black text-white p-2 rounded-lg hover:bg-blue-700 transition"
                title="Scan QR Code"
                onClick={() => setShowModal("scan")}
                disabled={!staff}
              >
                <BiQr className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal Popout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 backdrop-blur-sm"
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
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-2 "
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
                {error && (
                  <div className="text-red-600 mt-2 text-sm text-center">{error}</div>
                )}
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
                <div className="text-gray-400 text-center py-8">[Fitur scan QR belum diimplementasikan]</div>
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
    <div className="border border-gray-200 rounded-xl px-3">
      <table className="min-w-full bg-white mt-3 mb-3 overflow-hidden">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              ID Staff
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              Nama
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              Waktu Presensi
            </th>
          </tr>
        </thead>
        <tbody>
          {presensi.length > 0 ? presensi.map((p, idx) => (
            <tr key={p.staff_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-6 py-3 border-b border-gray-200 text-sm text-gray-700">
                {p.staff?.staff_code || p.staff_id}
              </td>
              <td className="px-6 py-3 border-b border-gray-200 text-sm text-gray-700">
                {p.staff?.name || "-"}
              </td>
              <td className="px-6 py-3 border-b border-gray-200 text-sm text-gray-700">
                {p.created_at
                  ? (() => {
                      const d = new Date(p.created_at);
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      const year = d.getFullYear();
                      let hour = d.getHours();
                      const minute = String(d.getMinutes()).padStart(2, "0");
                      const ampm = hour >= 12 ? "PM" : "AM";
                      hour = hour % 12;
                      hour = hour ? hour : 12;
                      return `${month}/${day}/${year} - ${String(hour).padStart(2, "0")}.${minute} ${ampm}`;
                    })()
                  : "-"}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="px-6 pt-3 text-center text-gray-400">
                Belum ada staff yang presensi.
              </td>
            </tr>
          )}
        </tbody>
      </table>
     </div> 
    </div>
  );
}