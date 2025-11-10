"use client";

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { getProductVariantGroups } from '@/lib/mockData';

interface VariantOption {
	id: string;
	name: string;
	priceModifier: number; // +/- dari harga base
}

interface VariantGroup {
	id: string;
	name: string;
	type: 'single' | 'multiple'; // single select atau multiple select
	required: boolean;
	options: VariantOption[];
}

interface VariantSidebarProps {
	isOpen: boolean;
	onClose: () => void;
	item: {
		id: string;
		name: string;
		category: string;
		price: number;
		image: string;
	};
	onAddToOrder: (item: any, selectedVariants: any, totalPrice: number) => void;
}

export default function VariantSidebar({ isOpen, onClose, item, onAddToOrder }: VariantSidebarProps) {
	const [quantity, setQuantity] = useState(1);
	const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>({});
	const [notes, setNotes] = useState('');

	// Get variant groups for this product from mockData
	const variantGroups = getProductVariantGroups(item.id);

	// Reset state when sidebar opens
	useEffect(() => {
		if (isOpen) {
			setQuantity(1);
			setSelectedVariants({});
			setNotes('');
		}
	}, [isOpen]);

	const handleVariantSelect = (groupId: string, optionId: string, type: 'single' | 'multiple') => {
		setSelectedVariants(prev => {
			if (type === 'single') {
				return { ...prev, [groupId]: [optionId] };
			} else {
				// Multiple selection
				const current = prev[groupId] || [];
				const newSelection = current.includes(optionId)
					? current.filter(id => id !== optionId)
					: [...current, optionId];
				return { ...prev, [groupId]: newSelection };
			}
		});
	};

	// Calculate total price
	const calculateTotalPrice = () => {
		let total = item.price;
		
		variantGroups.forEach(group => {
			const selected = selectedVariants[group.id] || [];
			selected.forEach(optionId => {
				const option = group.options.find(opt => opt.id === optionId);
				if (option) {
					total += option.priceModifier;
				}
			});
		});

		return total * quantity;
	};

	const canAddToOrder = () => {
		return variantGroups
			.filter(group => group.required)
			.every(group => selectedVariants[group.id]?.length > 0);
	};

	const handleAddToOrder = () => {
		if (!canAddToOrder()) return;
		
		onAddToOrder(item, selectedVariants, calculateTotalPrice());
		onClose();
	};

	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop with blur */}
			<div 
				className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
				onClick={onClose}
			/>

			{/* Sidebar */}
			<div className={`fixed top-0 left-0 h-full w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
				isOpen ? 'translate-x-0' : '-translate-x-full'
			}`}>
				<div className="h-full flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-gray-200">
						<div>
							<h2 className="text-2xl font-bold text-gray-800">{item.name}</h2>
							<p className="text-sm text-gray-500 mt-1">{item.category}</p>
						</div>
						<button 
							onClick={onClose}
							className="p-2 hover:bg-gray-100 rounded-full transition"
						>
							<XMarkIcon className="w-6 h-6 text-gray-600" />
						</button>
					</div>

					{/* Content - Scrollable */}
					<div className="flex-1 overflow-y-auto p-6 space-y-6">
						{/* Product Image */}
						<div className="w-full h-48 bg-gray-200 rounded-2xl overflow-hidden">
							<img 
								src={item.image || "/placeholder.jpg"} 
								alt={item.name}
								className="w-full h-full object-cover"
							/>
						</div>

						{/* Base Price */}
						<div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl">
							<span className="text-sm font-medium text-gray-700">Base Price</span>
							<span className="text-lg font-bold text-gray-900">${item.price.toFixed(2)}</span>
						</div>

						{/* Variant Groups */}
						{variantGroups.map(group => (
							<div key={group.id} className="space-y-3">
								<div className="flex items-center gap-2">
									<h3 className="font-semibold text-gray-800">{group.name}</h3>
									{group.required && (
										<span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
											Required
										</span>
									)}
								</div>

								<div className="space-y-2">
									{group.options.map(option => {
										const isSelected = selectedVariants[group.id]?.includes(option.id);
										
										return (
											<button
												key={option.id}
												onClick={() => handleVariantSelect(group.id, option.id, group.type)}
												className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
													isSelected 
														? 'border-blue-500 bg-blue-50' 
														: 'border-gray-200 hover:border-gray-300'
												}`}
											>
												<div className="flex items-center gap-3">
													<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
														isSelected 
															? 'border-blue-500 bg-blue-500' 
															: 'border-gray-300'
													}`}>
														{isSelected && (
															<div className="w-2 h-2 bg-white rounded-full" />
														)}
													</div>
													<span className="font-medium text-gray-800">{option.name}</span>
												</div>
												{option.priceModifier !== 0 && (
													<span className={`text-sm font-semibold ${
														option.priceModifier > 0 ? 'text-green-600' : 'text-red-600'
													}`}>
														{option.priceModifier > 0 ? '+' : ''}{option.priceModifier > 0 ? '$' : '-$'}{Math.abs(option.priceModifier).toFixed(2)}
													</span>
												)}
											</button>
										);
									})}
								</div>
							</div>
						))}

						{/* Special Notes */}
						<div className="space-y-3">
							<h3 className="font-semibold text-gray-800">Special Notes (Optional)</h3>
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Add any special instructions..."
								className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
								rows={3}
							/>
						</div>
					</div>

					{/* Footer - Fixed */}
					<div className="border-t border-gray-200 p-6 space-y-4">
						{/* Quantity Selector */}
						<div className="flex items-center justify-between">
							<span className="font-semibold text-gray-800">Quantity</span>
							<div className="flex items-center gap-3">
								<button
									onClick={() => setQuantity(Math.max(1, quantity - 1))}
									className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
								>
									<span className="text-xl font-bold">−</span>
								</button>
								<span className="w-12 text-center text-xl font-bold text-blue-600">{quantity}</span>
								<button
									onClick={() => setQuantity(quantity + 1)}
									className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition"
								>
									<span className="text-xl font-bold">+</span>
								</button>
							</div>
						</div>

						{/* Add to Order Button */}
						<button
							onClick={handleAddToOrder}
							disabled={!canAddToOrder()}
							className={`w-full py-4 rounded-xl font-bold text-lg transition ${
								canAddToOrder()
									? 'bg-blue-500 hover:bg-blue-600 text-white'
									: 'bg-gray-200 text-gray-400 cursor-not-allowed'
							}`}
						>
							Add to Order - ${calculateTotalPrice().toFixed(2)}
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
