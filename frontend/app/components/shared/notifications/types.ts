export type NotificationSeverity = "critical" | "warning" | "info" | "success";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  source: string;
  createdAt: string;
  actionHref?: string;
  actionLabel?: string;
};
