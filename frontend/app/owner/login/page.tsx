"use client";
import { useState, useEffect } from "react";
import { logActivity } from "@/lib/services/activity/activityLogger";
import { useLanguage } from "@/app/components/shared/i18n";
import { clearAuth, cleanupDeprecatedStorage, storeInternalIdentity } from "@/lib/utils";

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

export default function OwnerLoginPage() {
	const { t } = useLanguage();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [current, setCurrent] = useState(0);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);

	// Auto slide
	useEffect(() => {
		clearAuth();
		cleanupDeprecatedStorage();
		const interval = setInterval(() => {
			setCurrent((prev) => (prev + 1) % slides.length);
		}, 4000);
		return () => clearInterval(interval);
	}, []);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const res = await fetch("/api/owner/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password, remember_me: rememberMe }),
		});

		const result = await res.json();
		setLoading(false);

		if (res.ok && result.success) {
			clearAuth();
			cleanupDeprecatedStorage();
			storeInternalIdentity({
				id: result.user_id,
				name: result.user_name,
				role: "owner",
				staffCode: result.staff_code,
				staffType: result.staff_type,
			});
			
			// Log successful login
			await logActivity({
				action: 'LOGIN',
				category: 'AUTH',
				description: `Owner ${result.user_name} logged in successfully`,
				resourceType: 'Authentication',
				severity: 'info'
			});
			
			window.location.href = "/owner/dashboard";
		} else {
			setError(result.error || t("owner.login.invalid"));
			
			// Log failed login attempt
			await logActivity({
				action: 'LOGIN',
				category: 'AUTH',
				description: `Failed owner login attempt`,
				resourceType: 'Authentication',
				severity: 'critical',
				notes: `Failed authentication attempt for email: ${email}`,
				tags: ['login', 'failed', 'security-alert']
			});
		}
	};

	return (
		<div className="flex min-h-screen">
			{/* Kiri: Slider */}
			<div className="hidden md:flex md:w-[60%] lg:w-[70%] bg-white items-center justify-center py-8 pl-8">
				<div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden shadow-xl bg-black/70 flex items-end">
					<img
						src={slides[current].img}
						alt="Banner"
						className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
					/>
					<div className="absolute inset-0 bg-black/40 rounded-2xl z-10"></div>
					<div className="relative z-20 p-8 text-white w-full">
						<p className="text-xl font-medium mb-4 leading-snug">
							“{slides[current].quote}”
						</p>
						<div className="font-semibold text-sm mb-2">
							{slides[current].author}
						</div>
						<div className="flex items-center gap-2 mt-4">
							{slides.map((_, idx) => (
								<span
									key={idx}
									className={`h-1 w-full rounded-full transition-all duration-300 ${
										idx === current
											? "bg-linear-to-r from-blue-500 to-red-500 w-16"
											: "bg-white/30 w-8"
									}`}
								></span>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Kanan: Owner Form */}
			<div className="w-full md:w-[40%] lg:w-[30%] flex flex-col justify-center items-center bg-white p-8">
				<div className="w-full max-w-sm">
					<div className="flex items-center mb-6 justify-center">
						<img
							src="/logo/IZALogo2.png"
							alt="Logo"
							className="w-20 mr-3"
						/>
					</div>
					<div className="mb-6">
						<p className="text-gray-700 text-2xl font-semibold">
							{t("owner.login.welcome")}
						</p>
					</div>
					<form className="space-y-6" onSubmit={handleSubmit}>
						<div>
							<label className="block text-sm font-medium text-gray-400 mb-2">
								{t("owner.login.email")}
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-black border border-gray-300"
								placeholder="Masukkan email owner"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-400 mb-2">
								{t("owner.login.password")}
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-black border border-gray-300"
								placeholder="Masukkan password"
								required
							/>
						</div>
						<div className="flex items-center justify-between">
							<label className="flex items-center">
				<input
					type="checkbox"
					checked={rememberMe}
					onChange={(event) => setRememberMe(event.target.checked)}
					className="rounded border-gray-300"
								/>
								<span className="ml-2 text-sm text-gray-400">
									Remember me
								</span>
							</label>
							<a
								href="/owner/forgot-password"
								className="text-sm text-gray-600 hover:text-black hover:underline"
							>
								Lupa Password?
							</a>
						</div>
						<button
							type="submit"
							className="w-full font-semibold bg-linear-to-r from-black to-gray-600 text-white py-3 rounded-lg hover:opacity-95 transition-opacity"
							disabled={loading}
						>
							{loading ? t("owner.login.loading") : t("owner.login.signIn")}
						</button>
					</form>
					{error && (
						<div className="text-red-600 text-sm text-center mt-4">
							{error}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
