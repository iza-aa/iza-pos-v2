"use client";

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/utils';

export default function UserBadge() {
	const [userName, setUserName] = useState("");
	const [userRole, setUserRole] = useState("");

	useEffect(() => {
		const user = getCurrentUser();
		setUserName(user?.name || 'Unknown');
		setUserRole(user?.role || 'staff');
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
