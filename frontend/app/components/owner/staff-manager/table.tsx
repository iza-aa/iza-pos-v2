"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { QRCodeSVG } from "qrcode.react";
import { FiSearch } from "react-icons/fi";
import { BiQr } from "react-icons/bi";
import CostumDropdown from "@/app/components/ui/costumdropdown/page";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const initialStaffList: any[] = [];

const roleOptions = ["Kasir", "Barista", "Manager"];

export default function StaffManagerTable() {
	const [search, setSearch] = useState("");
	const [staffList, setStaffList] = useState(initialStaffList);
	const [adding, setAdding] = useState(false);
	const [newName, setNewName] = useState("");
	const [newRole, setNewRole] = useState(roleOptions[0]);
	const [newPhone, setNewPhone] = useState("");
	const [copyMsg, setCopyMsg] = useState(""); // Untuk notifikasi copy
	const [showQrModal, setShowQrModal] = useState(false);
	const [presenceCode, setPresenceCode] = useState("");
	const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null); // Untuk menyimpan waktu kedaluwarsa QR code
	const [qrTimer, setQrTimer] = useState(0); // Untuk menghitung mundur sisa waktu QR code
	const [searchBarOpen, setSearchBarOpen] = useState(false);

	// Untuk edit
	const [editingIdx, setEditingIdx] = useState<number | null>(null);
	const [editName, setEditName] = useState("");
	const [editRole, setEditRole] = useState(roleOptions[0]);
	const [editStatus, setEditStatus] = useState("Aktif");

	// Filter staff
	const filteredStaff = staffList.filter(
		(staff) =>
			staff.name.toLowerCase().includes(search.toLowerCase()) ||
			staff.id.toLowerCase().includes(search.toLowerCase())
	);

	// Generate ID staff otomatis
	const getNextStaffId = () => {
		if (staffList.length === 0) return "STF001";
		// Cari staff_code terbesar
		const lastStaff = [...staffList]
			.filter((s) => s.staff_code && /^STF\d+$/.test(s.staff_code))
			.sort(
				(a, b) =>
					Number(a.staff_code.replace("STF", "")) -
					Number(b.staff_code.replace("STF", ""))
			)
			.at(-1);
		const lastCode = lastStaff ? lastStaff.staff_code : "STF000";
		const nextNum = String(Number(lastCode.replace("STF", "")) + 1).padStart(3, "0");
		return `STF${nextNum}`;
	};

	// Tambah staff baru
	const handleSaveNew = async () => {
		// Generate kode login acak
		function generateLoginCode() {
			const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			let code = "";
			for (let i = 0; i < 8; i++) {
				code += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return code;
		}
		const login_code = generateLoginCode();

		const newStaff = {
			staff_code: getNextStaffId(),
			name: newName,
			role: newRole,
			status: "Aktif",
			phone: newPhone,
			login_code,
		};

		// Kirim ke API
		const res = await fetch("/api/staff/add", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(newStaff),
		});

		const result = await res.json();

		if (res.ok) {
			// Fetch ulang data dari Supabase
			const { data } = await supabase.from("staff").select("*").order("created_at", { ascending: true });
			setStaffList(data || []);
			setAdding(false);
			setNewName("");
			setNewRole(roleOptions[0]);
			setNewPhone("");
		} else {
			alert(result.error || "Gagal menambah staff");
		}
	};

	// Edit staff
	const handleEdit = (idx: number) => {
		setEditingIdx(idx);
		setEditName(filteredStaff[idx].name);
		setEditRole(filteredStaff[idx].role);
		setEditStatus(filteredStaff[idx].status);
	};

	const handleSaveEdit = (idx: number) => {
		const globalIdx = staffList.findIndex((s) => s.id === filteredStaff[idx].id);
		const updated = [...staffList];
		updated[globalIdx] = {
			...updated[globalIdx],
			name: editName,
			role: editRole,
			status: editStatus,
		};
		setStaffList(updated);
		setEditingIdx(null);
	};

	const handleCancelEdit = () => setEditingIdx(null);

	// Fungsi copy kode login
	const handleCopy = async (code: string) => {
		await navigator.clipboard.writeText(code);
		setCopyMsg("Kode berhasil disalin!");
		setTimeout(() => setCopyMsg(""), 1500);
	};

	// Hapus staff
	const handleDelete = async (id: string) => {
		if (!confirm("Yakin ingin menghapus staff ini?")) return;

		// Hapus dari Supabase
		const { error } = await supabase.from("staff").delete().eq("id", id);

		if (error) {
			alert("Gagal menghapus staff: " + error.message);
			return;
		}

		// Fetch ulang data staff
		const { data } = await supabase.from("staff").select("*").order("created_at", { ascending: true });
		setStaffList(data || []);
	};

	// Generate password
	const handleGeneratePass = async (id: string) => {
		const res = await fetch(`/api/staff/${id}/generate-pass`, {
			method: "POST",
		});
		const result = await res.json();

		if (!res.ok) {
			alert(result.error || "Gagal generate kode");
			return;
		}

		// Fetch ulang data staff
		fetchStaff();
		alert("Kode login berhasil dikirim ke WhatsApp staff!");
	};

	// Generate kode presensi dan QR
	const handleGenerateQrAndCode = async () => {
		function generatePresenceCode() {
			const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
			let code = "";
			for (let i = 0; i < 8; i++) {
				code += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return code;
		}
		const presence_code = generatePresenceCode();
		const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 menit dari sekarang

		const { error } = await supabase
			.from("presence_code")
			.insert([{ code: presence_code, expires_at }]);

		if (error) {
			alert("Gagal generate kode presensi: " + error.message);
			return;
		}

		setPresenceCode(presence_code);
		setQrExpiresAt(new Date(expires_at));
		setShowQrModal(true);
	};

	// Definisikan fetchStaff di sini
	async function fetchStaff() {
		const { data, error } = await supabase
			.from("staff")
			.select("*")
			.order("created_at", { ascending: true });
		if (!error && data) setStaffList(data);
	}

	useEffect(() => {
		fetchStaff();
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			fetchStaff();
		}, 60 * 1000); // setiap 1 menit
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (!showQrModal || !qrExpiresAt) return;
		const interval = setInterval(() => {
			const sisa = Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000));
			setQrTimer(sisa);
			if (sisa <= 0) {
				setShowQrModal(false);
				setPresenceCode("");
				setQrExpiresAt(null);
			}
		}, 1000);
		return () => clearInterval(interval);
	}, [showQrModal, qrExpiresAt]);

	// Cek kode presensi aktif saat halaman dimuat
	useEffect(() => {
		async function checkActivePresenceCode() {
			const { data } = await supabase
				.from("presence_code")
				.select("code, expires_at")
				.order("created_at", { ascending: false })
				.limit(1)
				.single();

			if (data && new Date(data.expires_at) > new Date()) {
				setPresenceCode(data.code);
			} else {
				setPresenceCode(""); // Tidak ada kode aktif
			}
		}

		checkActivePresenceCode();
	}, []);

	return (
		<div className="w-full max-w-[100vw] mx-auto pt-4 px-2 md:px-6">
			<div className="flex items-center justify-between mb-4">
				{/* Kiri: Judul dan deskripsi */}
				<div>
					<h1 className=" lg:text-2xl md:text-2xl text-xl font-bold">
						Staff Manager
					</h1>
					<p className=" mt-1 text-gray-500 text-sm max-w-xl">
						Kelola data staff, role, status, dan kode login.
					</p>
				</div>

				{/* Kanan: Icon QR & Search */}
				<div className="flex items-center gap-2">
					{/* Generate QR selalu icon */}
					<button
						className="bg-black text-white p-2 rounded-lg hover:bg-blue-700 transition"
						title="Generate QR and Code"
						onClick={() => {
							if (window.confirm("Generate QR and Code?")) handleGenerateQrAndCode();
						}}
					>
						<BiQr className="w-6 h-6" />
					</button>
					{/* Search: icon, input muncul jika searchBarOpen */}
					{searchBarOpen ? (
						<input
							type="text"
							placeholder="Cari nama atau ID staff..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onBlur={() => setSearchBarOpen(false)}
							autoFocus
							className="border border-gray-300 rounded-lg px-4 py-[7px] w-30 md:w-48 lg:w-64"
						/>
					) : (
						<button
							className="p-2 rounded-lg hover:bg-gray-200 transition border border-gray-300"
							title="Cari Staff"
							onClick={() => setSearchBarOpen(true)}
						>
							<FiSearch className="w-6 h-6 text-gray-700" />
						</button>
					)}
				</div>
			</div>
			<div className="overflow-x-auto">
				<div className="border border-gray-200 rounded-xl p-3">
					{/* Card mode for mobile */}
					<div className="block md:hidden">
						{filteredStaff.map((staff, idx) => (
							<div
								key={staff.id}
								className="rounded-xl border border-gray-200 shadow-sm bg-white p-4 mb-4 flex flex-col gap-2"
							>
								<div>
									<span className="font-semibold text-gray-500">ID Staff: </span>
									<span>{staff.staff_code}</span>
								</div>
								<div>
									<span className="font-semibold text-gray-500">Nama: </span>
									<span>
										{editingIdx === idx ? (
											<input
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												className="border-b border-gray-300 rounded py-1 focus:outline-none w-full"
											/>
										) : (
											staff.name
										)}
									</span>
								</div>
								<div>
									<span className="font-semibold text-gray-500">Role: </span>
									<span>
										{editingIdx === idx ? (
											<CostumDropdown
												value={editRole}
												onChange={setEditRole}
												options={roleOptions}
											/>
										) : (
											staff.role
										)}
									</span>
								</div>
								<div>
									<span className="font-semibold text-gray-500">No WA: </span>
									<span>
										{editingIdx === idx ? (
											<input
												value={staff.phone || ""}
												disabled
												className="border-b border-gray-300 rounded py-1 focus:outline-none w-full"
											/>
										) : (
											staff.phone
										)}
									</span>
								</div>
								<div>
									<span className="font-semibold text-gray-500">Kode Login: </span>
									<span>
										{staff.login_code && staff.login_code_expires_at && new Date(staff.login_code_expires_at) > new Date() ? (
											<span
												className="cursor-pointer text-blue-600 hover:underline ml-2"
												onClick={() => handleCopy(staff.login_code)}
												title="Klik untuk copy"
											>
												{staff.login_code}
											</span>
										) : (
											<button
												className="text-blue-600 hover:underline"
												onClick={() => handleGeneratePass(staff.id)}
											>
												Generate Pass
											</button>
										)}
									</span>
								</div>
								<div>
									<span className="font-semibold text-gray-500">Status: </span>
									<span>
										{editingIdx === idx ? (
											<CostumDropdown
												value={editStatus}
												onChange={setEditStatus}
											/>
										) : (
											<span
												className={`px-3 py-1 rounded-full text-xs font-semibold ${
													staff.status === "Aktif"
														? "bg-green-100 text-green-700"
														: staff.status === "Cuti"
														? "bg-yellow-100 text-yellow-700"
														: "bg-red-100 text-red-700"
												}`}
											>
												{staff.status}
											</span>
										)}
									</span>
								</div>
								<div>
									<span className="font-semibold text-gray-500">Aksi: </span>
									<span>
										{editingIdx === idx ? (
											<>
												<button
													className="text-green-600 hover:underline mr-3"
													onClick={() => handleSaveEdit(idx)}
												>
													Save
												</button>
												<button
													className="text-gray-600 hover:underline"
													onClick={handleCancelEdit}
												>
													Cancel
												</button>
											</>
										) : (
											<>
												<button
													className="text-gray-700 hover:underline mr-3"
													onClick={() => handleEdit(idx)}
												>
													Edit
												</button>
												<button
													className="hover:underline"
													style={{ color: '#FF6859' }}
													onClick={() => handleDelete(staff.id)}
												>
													Hapus
												</button>
											</>
										)}
									</span>
								</div>
							</div>
						))}
					</div>
					{/* Table mode for md and up */}
					<table className="hidden md:table table-fixed w-full min-w-[700px] text-xs md:text-sm lg:text-base">
						<thead>
							<tr className="bg-gray-200">
								<th className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
									ID Staff
								</th>
								<th className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
									Nama
								</th>
								<th className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
									Role
								</th>
								<th className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
									No WA
								</th>
								<th className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
									Kode Login
								</th>
								<th className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
									Status
								</th>
								<th className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredStaff.map((staff, idx) => (
								<tr key={staff.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">{staff.staff_code}</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										{editingIdx === idx ? (
											<input
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												className="border-b pl-1 border-gray-300 rounded py-1 focus:outline-none w-3/4 lg:w-[50px]"
											/>
										) : (
											staff.name
										)}
									</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										{editingIdx === idx ? (
											<CostumDropdown
												value={editRole}
												onChange={setEditRole}
												options={roleOptions}
											/>
										) : (
											staff.role
										)}
									</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										{editingIdx === idx ? (
											<input
												value={staff.phone || ""}
												disabled
												className="pl-2 border-b border-gray-300 rounded py-1 focus:outline-none w-4/5 lg:w-[120px]"
											/>
										) : (
											staff.phone
										)}
									</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										{staff.login_code && staff.login_code_expires_at && new Date(staff.login_code_expires_at) > new Date() ? (
											<span
												className="cursor-pointer text-blue-600 hover:underline ml-2"
												onClick={() => handleCopy(staff.login_code)}
												title="Klik untuk copy"
											>
												{staff.login_code}
											</span>
										) : (
											<button
												className="text-blue-600 hover:underline"
												onClick={() => handleGeneratePass(staff.id)}
											>
												Generate Pass
											</button>
										)}
									</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base font-semibold text-gray-500">
										{editingIdx === idx ? (
											<CostumDropdown
												value={editStatus}
												onChange={setEditStatus}
											/>
										) : (
											<span
												className={`px-3 py-1 rounded-full text-xs font-semibold ${
													staff.status === "Aktif"
														? "bg-green-100 text-green-700"
														: staff.status === "Cuti"
														? "bg-yellow-100 text-yellow-700"
														: "bg-red-100 text-red-700"
												}`}
											>
												{staff.status}
											</span>
										)}
									</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										{editingIdx === idx ? (
											<>
												<button
													className="text-green-600 hover:underline mr-3"
													onClick={() => handleSaveEdit(idx)}
												>
													Save
												</button>
												<button
													className="text-gray-600 hover:underline"
													onClick={handleCancelEdit}
												>
													Cancel
												</button>
											</>
										) : (
											<>
												<button
													className="text-gray-700 hover:underline mr-3"
													onClick={() => handleEdit(idx)}
												>
													Edit
												</button>
												<button
													className="hover:underline"
													style={{ color: '#FF6859' }}
													onClick={() => handleDelete(staff.id)}
												>
													Hapus
												</button>
											</>
										)}
									</td>
								</tr>
							))}

							{/* Baris tambah staff */}
							{adding ? (
								<tr className={filteredStaff.length % 2 === 0 ? "bg-white" : "bg-gray-50"}>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										{getNextStaffId()}
									</td>
									<td className="px-4 md:px-6 lg:px-7 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										<input
											value={newName}
											onChange={(e) => setNewName(e.target.value)}
											className="border-b border-gray-300 rounded px-2 py-1 w-2/3 xl:w-[50px]"
											placeholder="Nama Staff"
										/>
									</td>
									<td className="px-4 md:px-6 lg:px-7 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										<select
											value={newRole}
											onChange={(e) => setNewRole(e.target.value)}
											className="border-b border-gray-300 rounded px-2 py-1"
										>
											{roleOptions.map((role) => (
												<option key={role} value={role}>
													{role}
												</option>
											))}
										</select>
									</td>
									<td className="px-4 md:px-6 lg:px-7 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										<input
											value={newPhone}
											onChange={(e) => setNewPhone(e.target.value)}
											className="border-b border-gray-300 rounded px-2 py-1 w-2/3 lg:w-[130px]"
											placeholder="No WhatsApp"
										/>
									</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">-</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										<span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
											Aktif
										</span>
									</td>
									<td className="px-4 md:px-6 lg:px-8 py-4 text-center text-xs md:text-sm lg:text-base text-gray-500">
										<button
											className="text-green-600 hover:underline mr-3"
											onClick={handleSaveNew}
											disabled={!newName || !newPhone}
										>
											Save
										</button>
										<button
											className="text-gray-600 hover:underline"
											onClick={() => setAdding(false)}
										>
											Cancel
										</button>
									</td>
								</tr>
							) : (
								<tr>
									<td
										colSpan={7}
										className="px-6 py-4 border-b border-t border-gray-200  text-center text-blue-600 font-semibold cursor-pointer hover:bg-blue-50 transition"
										onClick={() => setAdding(true)}
									>
										+ Tambahkan Staff
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Modal QR Code */}
			{showQrModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center relative">
						<button
							className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl"
							onClick={() => setShowQrModal(false)}
							title="Tutup"
						>
							&times;
						</button>
						<div className="mb-4">
							<QRCodeSVG value={presenceCode} size={200} />
						</div>
						<div className="text-lg font-bold tracking-widest mb-2">{presenceCode}</div>
						<div className="text-gray-500 text-sm mb-2">
							Scan QR atau masukkan kode ini untuk presensi
						</div>
						{qrExpiresAt && (
							<div className="text-red-600 font-semibold text-sm">
								Kode akan expired dalam: {Math.floor(qrTimer / 60)}:{String(qrTimer % 60).padStart(2, "0")}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Notifikasi copy */}
			{copyMsg && (
				<div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
					{copyMsg}
				</div>
			)}
		</div>
	);
}
