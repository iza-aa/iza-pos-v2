import { CheckIcon } from "@heroicons/react/24/solid";

export interface OrderProgressStep {
  label: string;
  description?: string;
}

interface OrderProgressBarProps {
  currentStep: number;
  steps: OrderProgressStep[];
}

export default function OrderProgressBar({
  currentStep,
  steps,
}: OrderProgressBarProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;
        const showConnector = index < steps.length - 1;

        return (
          <div key={`${step.label}-${stepNumber}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  isCompleted
                    ? "border-gray-900 bg-gray-900 text-white"
                    : isCurrent
                      ? "border-gray-900 bg-white text-gray-900"
                      : "border-gray-200 bg-gray-100 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{stepNumber}</span>
                )}
              </div>

              {showConnector ? (
                <div
                  className={`my-1 h-10 w-px ${
                    stepNumber < currentStep ? "bg-gray-900" : "bg-gray-200"
                  }`}
                />
              ) : null}
            </div>

            <div className="flex-1 pb-6 pt-1 last:pb-0">
              <p
                className={`text-sm font-semibold ${
                  isCurrent || isCompleted ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </p>

              {step.description ? (
                <p
                  className={`mt-1 text-xs ${
                    isCurrent || isCompleted ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {step.description}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}