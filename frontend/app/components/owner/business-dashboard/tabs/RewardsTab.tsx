import RewardsPerformancePanel from "./rewards/RewardsPerformancePanel";
import RewardsStrategyPanel from "./rewards/RewardsStrategyPanel";
import type { RewardsSubTab } from "./rewards/RewardsSubTabs";

export default function RewardsTab({ section }: { section: RewardsSubTab }) {
  return (
    <div>
      {section === "performance" ? (
        <RewardsPerformancePanel />
      ) : (
        <RewardsStrategyPanel />
      )}
    </div>
  );
}
