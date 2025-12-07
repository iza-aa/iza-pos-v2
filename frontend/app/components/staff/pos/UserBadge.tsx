"use client";

import { useEffect, useState } from 'react';

export default function UserBadge() {
	const [userName, setUserName] = useState("");
	const [userRole, setUserRole] = useState("");

	useEffect(() => {
		const name = localStorage.getItem('user_name') || 'Unknown';
		const role = localStorage.getItem('user_role') || 'staff';
		setUserName(name);
		setUserRole(role);
	}, []);

	const getBadgeColor = () => {
		const roleLower = userRole.toLowerCase();
		if (roleLower === 'owner') return 'bg-black text-white';
		if (roleLower === 'manager') return 'bg-[#F79A19] text-white';
		return 'bg-[#FFE52A] text-gray-900'; // Staff
	};

	if (!userName) return null;

	return (
		<div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${getBadgeColor()}`}>
			<span>{userName}</span>
		</div>
	);
}
