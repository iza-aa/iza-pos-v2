"use client";

import GenerateRecommendationPanel from "../ai/GenerateRecommendationPanel";
import AttendanceSection from "@/app/components/owner/staffmanager/AttendanceSection";

export default function StaffTab() {
  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="staff" />
      <AttendanceSection viewMode="table" />
    </div>
  );
}
