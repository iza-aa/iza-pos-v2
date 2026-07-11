import { Metadata } from "next";
import StaffLayoutClient from "./StaffLayoutClient";

export const metadata: Metadata = {
  title: "IZA POS Staff",
  manifest: "/staff-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IZA Staff",
  },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayoutClient>{children}</StaffLayoutClient>;
}
