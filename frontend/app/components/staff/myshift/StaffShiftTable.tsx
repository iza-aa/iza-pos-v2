
"use client";
import { useState } from "react";

interface StaffShift {
  staff_id: string;
  staff_code: string;
  name: string;
  created_at: string;
}

interface StaffShiftTableProps {
  presensi: StaffShift[];
}

export default function StaffShiftTable({ presensi }: StaffShiftTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[700px] table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th className="w-[20%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Staff</th>
              <th className="w-[30%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="w-[30%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu Presensi</th>
              <th className="w-[20%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {presensi.length > 0 ? presensi.map((p, idx) => (
              <>
                <tr key={p.staff_id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap w-[20%]">
                    <div className="text-sm font-medium text-gray-900">{p.staff_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[30%]">
                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[30%]">
                    <div className="text-sm text-gray-700">{p.created_at ? new Date(p.created_at).toLocaleString('id-ID') : '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[20%]">
                    <button
                      className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                      onClick={() => setExpanded(expanded === p.staff_id ? null : p.staff_id)}
                    >
                      {expanded === p.staff_id ? 'Tutup' : 'Detail'}
                    </button>
                  </td>
                </tr>
                {expanded === p.staff_id && (
                  <tr>
                    <td colSpan={4} className="bg-gray-50 px-6 py-4 text-sm text-gray-700 rounded-b-xl">
                      <div className="flex flex-col gap-2">
                        <div><span className="font-semibold">ID Staff:</span> {p.staff_id}</div>
                        <div><span className="font-semibold">Kode Staff:</span> {p.staff_code}</div>
                        <div><span className="font-semibold">Nama:</span> {p.name}</div>
                        <div><span className="font-semibold">Waktu Presensi:</span> {p.created_at ? new Date(p.created_at).toLocaleString('id-ID') : '-'}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-3 text-center text-gray-400">
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
