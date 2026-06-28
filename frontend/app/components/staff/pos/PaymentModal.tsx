'use client';

import { useEffect, useState } from 'react';
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  QrCodeIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { StandardModal } from '@/app/components/shared';
import { formatCurrency } from '@/lib/constants';
import { showError } from '@/lib/services/errorHandling';
import CashPaymentInput from './CashPaymentInput';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

type FulfillmentMethod = 'table_service' | 'counter_pickup';
type PaymentMethod = 'cash' | 'qris' | 'card';

interface CustomerInfo {
  id: string;
  name: string;
  loyalty_points: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    notes?: string;
    cashAmount?: number;
    fulfillmentMethod: FulfillmentMethod;
    tableNumber?: string;
  }) => void;
  totalAmount: number;
  getTotalAmount?: (fulfillmentMethod: FulfillmentMethod) => number;
  isSubmitting?: boolean;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  getTotalAmount,
  isSubmitting = false,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>('table_service');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [cashReceived, setCashReceived] = useState('');

  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [foundCustomer, setFoundCustomer] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setFulfillmentMethod('table_service');
    setPaymentMethod('cash');
    setTableNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setCashReceived('');
    setLookupStatus('idle');
    setFoundCustomer(null);
  }, [isOpen]);

  useEffect(() => {
    const phone = customerPhone.trim();
    if (phone.length < 8) {
      setLookupStatus('idle');
      setFoundCustomer(null);
      return;
    }

    setLookupStatus('searching');
    setFoundCustomer(null);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/staff/pos/lookup-customer?phone=${encodeURIComponent(phone)}`);
        const result = await response.json();

        if (result.found && result.customer) {
          setLookupStatus('found');
          setFoundCustomer(result.customer);
          setCustomerName(result.customer.name);
        } else {
          setLookupStatus('not_found');
          setFoundCustomer(null);
        }
      } catch (error) {
        console.error('Customer lookup error:', error);
        setLookupStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [customerPhone, isOpen]);

  if (!isOpen) {
    return null;
  }

  const activeTotalAmount = getTotalAmount?.(fulfillmentMethod) ?? totalAmount;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    const received = Number(cashReceived) || 0;
    const trimmedTableNumber = tableNumber.trim();

    if (fulfillmentMethod === 'table_service' && !trimmedTableNumber) {
      showError('Nomor meja wajib diisi.');
      return;
    }

    if (paymentMethod === 'cash' && received < activeTotalAmount) {
      showError('Cash received must be greater than or equal to total amount.');
      return;
    }

    onConfirm({
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerId: foundCustomer?.id,
      notes: notes.trim() || undefined,
      cashAmount: paymentMethod === 'cash' ? received : undefined,
      fulfillmentMethod,
      tableNumber:
        fulfillmentMethod === 'table_service' ? trimmedTableNumber : undefined,
    });
  };

  const fulfillmentOptions: Array<{
    value: FulfillmentMethod;
    title: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      value: 'table_service',
      title: 'Dine In',
      description: 'Customer eats at the restaurant using a table number.',
      icon: BuildingOffice2Icon,
    },
    {
      value: 'counter_pickup',
      title: 'Counter Pickup',
      description: 'Use order number/customer name. Suitable when the shop is quiet.',
      icon: ClipboardDocumentCheckIcon,
    },
  ];
  const paymentOptions: Array<{
    value: PaymentMethod;
    title: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      value: 'cash',
      title: 'Cash',
      description: 'Count cash received and return change if needed.',
      icon: BanknotesIcon,
    },
    {
      value: 'qris',
      title: 'QRIS',
      description: 'Customer pays with QRIS. No cash count required.',
      icon: QrCodeIcon,
    },
    {
      value: 'card',
      title: 'Card',
      description: 'Debit or credit card payment at the counter.',
      icon: CreditCardIcon,
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      title="Complete Order"
      description="Confirm payment and choose how the customer will receive the order."
      maxWidthClassName="max-w-xl"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="staff-pos-payment-form"
            disabled={isSubmitting}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Order...' : 'Confirm Order'}
          </button>
        </>
      }
    >
        <form id="staff-pos-payment-form" onSubmit={handleSubmit} className="space-y-6">
          <section>
            <label className="mb-3 block text-sm font-semibold text-gray-800">
              Fulfillment Method
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {fulfillmentOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = fulfillmentMethod === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFulfillmentMethod(option.value);

                      if (option.value === 'counter_pickup') {
                        setTableNumber('');
                      }
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Icon
                        className={`h-5 w-5 ${
                          isSelected ? 'text-white' : 'text-gray-500'
                        }`}
                      />
                      <span className="font-semibold">{option.title}</span>
                    </div>

                    <p
                      className={`text-xs leading-relaxed ${
                        isSelected ? 'text-gray-200' : 'text-gray-500'
                      }`}
                    >
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {fulfillmentMethod === 'table_service' ? (
            <section>
              <label
                htmlFor="table-number"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Table Number <span className="text-red-500">*</span>
              </label>

              <input
                id="table-number"
                type="text"
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                disabled={isSubmitting}
                maxLength={10}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                placeholder="Example: 12"
              />

              <p className="mt-1 text-xs text-gray-500">
                Enter the table number used by the customer.
              </p>
            </section>
          ) : (
            <section className="">
              <p className="text-sm text-amber-900">

              </p>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="customer-name"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Customer Name
              </label>

              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="customer-phone"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Phone Number
              </label>

              <input
                id="customer-phone"
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                disabled={isSubmitting}
                className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-1 ${
                  lookupStatus === 'found'
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50'
                    : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                }`}
                placeholder="Optional"
              />

              {lookupStatus === 'searching' && (
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  Mencari customer...
                </p>
              )}

              {lookupStatus === 'found' && foundCustomer && (
                <p className="mt-1 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  {foundCustomer.name} — {foundCustomer.loyalty_points} poin
                </p>
              )}

              {lookupStatus === 'not_found' && (
                <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                  <XCircleIcon className="h-4 w-4" />
                  Belum terdaftar
                </p>
              )}
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Payment Method
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = paymentMethod === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setPaymentMethod(option.value);

                      if (option.value !== 'cash') {
                        setCashReceived('');
                      }
                    }}
                    className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Icon
                        className={`h-5 w-5 ${
                          isSelected ? 'text-white' : 'text-gray-500'
                        }`}
                      />
                      <span className="font-semibold">{option.title}</span>
                    </div>

                    <p
                      className={`text-xs leading-relaxed ${
                        isSelected ? 'text-gray-200' : 'text-gray-500'
                      }`}
                    >
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {paymentMethod === 'cash' ? (
            <CashPaymentInput
              totalAmount={activeTotalAmount}
              value={cashReceived}
              onChange={setCashReceived}
              disabled={isSubmitting}
            />
          ) : (
            <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-900">
                {paymentMethod === 'qris'
                  ? 'Confirm that the QRIS payment has been received before submitting the order.'
                  : 'Confirm that the card transaction has been approved before submitting the order.'}
              </p>
            </section>
          )}


          <section className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-700">
                Total Amount
              </span>

              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(activeTotalAmount)}
              </span>
            </div>
          </section>

        </form>
    </StandardModal>
  );
}
