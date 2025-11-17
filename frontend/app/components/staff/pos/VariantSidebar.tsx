"use client";

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
	onAddToOrder: (item: any, selectedVariants: any, totalPrice: number, quantity: number) => void;
}

export default function VariantSidebar({ isOpen, onClose, item, onAddToOrder }: VariantSidebarProps) {
	const [quantity, setQuantity] = useState(1);
	const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>({}); // groupName -> optionNames[]
	const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, string[]>>({}); // groupId -> optionIds[] for price calc
	const [notes, setNotes] = useState('');
	const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
	const [loading, setLoading] = useState(false);

	// Fetch variant groups for this product from database
	useEffect(() => {
		async function fetchVariantGroups() {
			if (!isOpen || !item.id) return;
			
			setLoading(true);
			try {
				// Get variant group IDs for this product
				const { data: productVariants, error: pvError } = await supabase
					.from('product_variant_groups')
					.select('variant_group_id')
					.eq('product_id', item.id);

				if (pvError) throw pvError;

				if (!productVariants || productVariants.length === 0) {
					setVariantGroups([]);
					setLoading(false);
					return;
				}

				const variantGroupIds = productVariants.map(pv => pv.variant_group_id);

				// Fetch variant groups
				const { data: groups, error: groupsError } = await supabase
					.from('variant_groups')
					.select('*')
					.in('id', variantGroupIds);

				if (groupsError) throw groupsError;

				// Fetch variant options for each group
				const formattedGroups: VariantGroup[] = await Promise.all(
					(groups || []).map(async (group) => {
						const { data: options, error: optionsError } = await supabase
							.from('variant_options')
							.select('id, name, price_modifier')
							.eq('variant_group_id', group.id)
							.order('sort_order', { ascending: true });

						if (optionsError) {
							console.error('Error fetching options for group:', group.id, optionsError);
						}

						return {
							id: group.id,
							name: group.name,
							type: group.type as 'single' | 'multiple',
							required: group.is_required,
							options: (options || []).map((opt: any) => ({
								id: opt.id,
								name: opt.name,
								priceModifier: opt.price_modifier
							}))
						};
					})
				);

				setVariantGroups(formattedGroups);
			} catch (error) {
				console.error('Error fetching variant groups:', error);
				setVariantGroups([]);
			} finally {
				setLoading(false);
			}
		}

		fetchVariantGroups();
	}, [isOpen, item.id]);

	// Reset state when sidebar opens
	useEffect(() => {
		if (isOpen) {
			setQuantity(1);
			setSelectedVariants({});
			setSelectedVariantIds({});
			setNotes('');
		}
	}, [isOpen]);

	const handleVariantSelect = (groupId: string, groupName: string, optionId: string, optionName: string, type: 'single' | 'multiple') => {
		// Update display names
		setSelectedVariants(prev => {
			const key = groupName;
			
			if (type === 'single') {
				return { ...prev, [key]: [optionName] };
			} else {
				const current = prev[key] || [];
				const newSelection = current.includes(optionName)
					? current.filter(name => name !== optionName)
					: [...current, optionName];
				return { ...prev, [key]: newSelection };
			}
		});
		
		// Update IDs for price calculation
		setSelectedVariantIds(prev => {
			if (type === 'single') {
				return { ...prev, [groupId]: [optionId] };
			} else {
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
			const selected = selectedVariantIds[group.id] || [];
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
			.every(group => selectedVariantIds[group.id]?.length > 0);
	};

	const handleAddToOrder = () => {
		if (!canAddToOrder()) return;
		
		onAddToOrder(item, selectedVariants, calculateTotalPrice(), quantity);
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
						<span className="text-lg font-bold text-gray-900">Rp {item.price.toLocaleString('id-ID')}</span>
						</div>

						{/* Loading State */}
						{loading && (
							<div className="text-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
								<p className="text-sm text-gray-500 mt-2">Loading variants...</p>
							</div>
						)}

						{/* Variant Groups */}
						{!loading && variantGroups.length === 0 && (
							<div className="text-center py-8">
								<p className="text-gray-500">No variants available for this product</p>
							</div>
						)}

						{!loading && variantGroups.map(group => (
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
										const isSelected = selectedVariantIds[group.id]?.includes(option.id);
										
										return (
											<button
												key={option.id}
												onClick={() => handleVariantSelect(group.id, group.name, option.id, option.name, group.type)}
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
													<span className={`text-xs font-semibold ml-auto ${
														option.priceModifier > 0 ? 'text-green-600' : 'text-red-600'
													}`}>
														{option.priceModifier > 0 ? '+' : '-'}Rp {Math.abs(option.priceModifier).toLocaleString('id-ID')}
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
							Add to Order - Rp {calculateTotalPrice().toLocaleString('id-ID')}
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
