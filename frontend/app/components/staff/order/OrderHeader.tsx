"use client";
import { ReactNode } from "react";

interface OrderHeaderProps {
	description: string;
	children?: ReactNode;
	searchBar?: ReactNode;
}

export default function OrderHeader({ description, children, searchBar }: OrderHeaderProps) {
	return (
		<div className="bg-white px-6 py-4 border-b border-gray-200">
			<div className="flex flex-col gap-4">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-800">Order Track</h1>
						<p className="text-sm text-gray-500 mt-1">{description}</p>
					</div>
					
					<div className="flex flex-wrap items-center gap-3">
						{children}
					</div>
				</div>
				
				{searchBar && (
					<div>
						{searchBar}
					</div>
				)}
			</div>
		</div>
	);
}
