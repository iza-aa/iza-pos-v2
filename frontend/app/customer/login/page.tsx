"use client";
import { useState, useEffect } from "react";

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

export default function CustomerLoginPage() {
	const [phone, setPhone] = useState("");
	const [name, setName] = useState("");
	const [current, setCurrent] = useState(0);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [isNewCustomer, setIsNewCustomer] = useState(false);

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

		const res = await fetch("/api/customer/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ phone, name: isNewCustomer ? name : undefined }),
		});

		const result = await res.json();
		setLoading(false);

		if (res.ok && result.success) {
			localStorage.setItem("customer_id", result.customer_id);
			localStorage.setItem("customer_name", result.customer_name);
			localStorage.setItem("customer_phone", result.customer_phone);
			window.location.href = "/customer/menu";
		} else {
			setError(result.error || "Login failed.");
		}
	};

	return (
		<div className="flex min-h-screen">
			{/* Kiri: Slider */}
			<div className="flex w-[70%] hidden md:block bg-white items-center justify-center py-8 pl-8">
				<div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl bg-black/70 flex items-end">
					<img
						src={slides[current].img}
						alt="Banner"
						className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
					/>
					<div className="absolute inset-0 bg-black/40 rounded-2xl z-10"></div>
					<div className="relative z-20 p-8 text-white w-full">
						<p className="text-xl font-medium mb-4 leading-snug">
							"{slides[current].quote}"
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
											? "bg-gradient-to-r from-blue-500 to-red-500 w-16"
											: "bg-white/30 w-8"
									}`}
								></span>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Kanan: Customer Form */}
			<div className="w-full md:w-[30%] flex flex-col justify-center items-center bg-white p-8 mb-8">
				<div className="w-full max-w-sm">
					<div className="flex items-center mb-6 justify-center">
						<img src="/logo/logo.png" alt="Logo" className="h-20 w-auto" />
					</div>

					<h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
						Welcome to Foodies!
					</h2>
					<p className="text-gray-500 text-center mb-6">
						Login or sign up to continue
					</p>

					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
								<p className="text-red-600 text-sm">{error}</p>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Phone Number
							</label>
							<input
								type="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
								placeholder="08123456789"
								required
							/>
						</div>

						{isNewCustomer && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Your Name
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
									placeholder="Enter your name"
									required={isNewCustomer}
								/>
							</div>
						)}

						<div className="flex items-center">
							<input
								type="checkbox"
								id="newCustomer"
								checked={isNewCustomer}
								onChange={(e) => setIsNewCustomer(e.target.checked)}
								className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label htmlFor="newCustomer" className="ml-2 text-sm text-gray-600">
								I'm a new customer
							</label>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? "Processing..." : isNewCustomer ? "Sign Up & Continue" : "Login"}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-xs text-gray-500">
							By continuing, you agree to our Terms of Service
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
