'use client';

import { useEffect, useState } from 'react';
import {
  BanknotesIcon,
  BellAlertIcon,
  ClipboardDocumentCheckIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/constants';

type FulfillmentMethod = 'pager' | 'counter_pickup';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    cashAmount?: number;
    fulfillmentMethod: FulfillmentMethod;
    pagerNumber?: string;
  }) => void;
  totalAmount: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
}: PaymentModalProps) {
  const [paymentMethod] = useState('cash');
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>('pager');
  const [pagerNumber, setPagerNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [cashReceived, setCashReceived] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setFulfillmentMethod('pager');
    setPagerNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setCashReceived('');
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const calculateChange = () => {
    const received = Number(cashReceived) || 0;
    return Math.max(0, received - totalAmount);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const received = Number(cashReceived) || 0;
    const trimmedPagerNumber = pagerNumber.trim();

    if (fulfillmentMethod === 'pager' && !trimmedPagerNumber) {
      window.alert('Nomor pager wajib diisi.');
      return;
    }

    if (paymentMethod === 'cash' && received < totalAmount) {
      window.alert('Cash received must be greater than or equal to total amount.');
      return;
    }

    onConfirm({
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      cashAmount: paymentMethod === 'cash' ? received : undefined,
      fulfillmentMethod,
      pagerNumber:
        fulfillmentMethod === 'pager' ? trimmedPagerNumber : undefined,
    });
  };

  const fulfillmentOptions: Array<{
    value: FulfillmentMethod;
    title: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      value: 'pager',
      title: 'Guest Pager',
      description: 'Customer receives a pager and picks up the order when called.',
      icon: BellAlertIcon,
    },
    {
      value: 'counter_pickup',
      title: 'Counter Pickup',
      description: 'Use order number/customer name. Suitable when the shop is quiet.',
      icon: ClipboardDocumentCheckIcon,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Complete Order</h2>
            <p className="text-sm text-gray-500">
              Confirm payment and choose how the customer will receive the order.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close payment modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
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
                        setPagerNumber('');
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

          {fulfillmentMethod === 'pager' ? (
            <section>
              <label
                htmlFor="pager-number"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Pager Number <span className="text-red-500">*</span>
              </label>

              <input
                id="pager-number"
                type="text"
                value={pagerNumber}
                onChange={(event) => setPagerNumber(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                placeholder="Example: 12"
              />

              <p className="mt-1 text-xs text-gray-500">
                Staff will manually call this pager when the order is ready.
              </p>
            </section>
          ) : (
            <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                Counter Pickup uses the order number as the pickup code. This is
                suitable when customers wait near the counter.
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                placeholder="Optional"
              />
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Payment Method
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <BanknotesIcon className="h-5 w-5 text-green-700" />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">Cash Payment</p>
                <p className="text-xs text-gray-500">
                  Other payment methods can be added later.
                </p>
              </div>
            </div>
          </section>

          <section>
            <label
              htmlFor="cash-received"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              Cash Received <span className="text-red-500">*</span>
            </label>

            <input
              id="cash-received"
              type="number"
              required
              min={totalAmount}
              step="1000"
              value={cashReceived}
              onChange={(event) => setCashReceived(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              placeholder={`Minimum ${formatCurrency(totalAmount)}`}
            />

            {cashReceived ? (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Change</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(calculateChange())}
                  </span>
                </div>
              </div>
            ) : null}
          </section>

          <section>
            <label
              htmlFor="order-notes"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              Notes
            </label>

            <textarea
              id="order-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              placeholder="Special requests, allergies, etc."
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-700">
                Total Amount
              </span>

              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              Confirm Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}