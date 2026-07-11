import { Metadata } from "next";
import ManagerLayoutClient from "./ManagerLayoutClient";

export const metadata: Metadata = {
  title: "IZA POS Manager",
  manifest: "/manager-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IZA Manager",
  },
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ManagerLayoutClient>{children}</ManagerLayoutClient>;
}
