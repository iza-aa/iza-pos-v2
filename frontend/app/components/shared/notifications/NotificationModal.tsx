"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { AppNotification, NotificationSeverity } from "./types";
import { useLanguage } from "../i18n";
import type { TranslationKey } from "../i18n";
import PushNotificationManager from "./PushNotificationManager";

const severityColor: Record<NotificationSeverity, string> = {
  critical: "bg-red-500",
  warning: "bg-[#FF9900]",
  info: "bg-blue-500",
  success: "bg-green-500",
};

const getLocale = (language: string) => (language === "id" ? "id-ID" : "en-US");

const formatDateTime = (value: string, language: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(getLocale(language), {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getJakartaDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
};

const addDays = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const getTodayKey = () => getJakartaDateKey(new Date().toISOString());

const groupLabel = (dateKey: string, language: string, t: (key: TranslationKey) => string) => {
  const today = getTodayKey();
  if (dateKey === today) return t("notifications.today");
  if (dateKey === addDays(today, -1)) return t("notifications.yesterday");
  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00Z`));
};

type NotificationModalProps = {
  open: boolean;
  notifications: AppNotification[];
  readIds: Set<string>;
  loading?: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  pushRole?: string;
};

export default function NotificationModal({
  open,
  notifications,
  readIds,
  loading = false,
  onClose,
  onMarkAllRead,
  onMarkRead,
  pushRole = "staff",
}: NotificationModalProps) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;

  const groupedNotifications = useMemo(() => {
    const map = new Map<string, AppNotification[]>();

    notifications.forEach((notification) => {
      const key = getJakartaDateKey(notification.createdAt) || "unknown";
      map.set(key, [...(map.get(key) || []), notification]);
    });

    return [...map.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([dateKey, items]) => ({
        dateKey,
        label: dateKey === "unknown" ? t("notifications.earlier") : groupLabel(dateKey, language, t),
        items,
      }));
  }, [language, notifications, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-3 top-16 z-80 sm:left-auto sm:right-4 sm:w-107.5">
      <div className="flex max-h-[calc(100vh-80px)] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="shrink-0 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">{t("notifications.title")}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {t("notifications.subtitle", {
                  count: unreadCount,
                  plural: unreadCount === 1 ? "" : "s",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label={t("common.close")}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-5 pb-5">
          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              {t("notifications.loading")}
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              {t("notifications.empty")}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedNotifications.map((group) => (
                <section key={group.dateKey}>
                  <h3 className="mb-2 mt-2 text-sm font-semibold text-gray-950">{group.label}</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {group.items.map((notification) => {
                      const isRead = readIds.has(notification.id);

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => {
                            onMarkRead(notification.id);
                            onClose();
                            router.push(notification.actionHref || "/owner/dashboard");
                          }}
                          className="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-gray-50"
                        >
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${isRead ? "bg-gray-300" : severityColor[notification.severity]}`}>
                            <BellIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold leading-5 text-gray-950">
                              {notification.title}
                            </span>
                            <span
                              className="mt-0.5 block overflow-hidden text-xs leading-5 text-gray-600"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {notification.message}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-400">
                              {formatDateTime(notification.createdAt, language)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-sm font-semibold text-gray-900 underline underline-offset-4 transition hover:text-gray-600"
          >
            {t("notifications.markAllRead")}
          </button>
          
          <PushNotificationManager role={pushRole} />
        </div>
      </div>
    </div>
  );
}
