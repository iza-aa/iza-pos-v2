import { Metadata } from "next";
import OwnerLayoutClient from "./OwnerLayoutClient";

export const metadata: Metadata = {
  title: "IZA POS Owner",
  manifest: "/owner-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IZA Owner",
  },
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerLayoutClient>{children}</OwnerLayoutClient>;
}
