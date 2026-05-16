interface ProgressStep {
  label: string;
  icon: string;
}

interface OrderProgressBarProps {
  currentStep: number;
  steps: ProgressStep[];
}

export default function OrderProgressBar({ currentStep, steps }: OrderProgressBarProps) {
  const totalSteps = steps.length;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-600 mb-4">Order Progress</h3>
      
      <div className="relative">
        {/* Progress Line Background */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200" style={{ height: `calc(100% - 48px)` }}></div>
        
        {/* Progress Line Active */}
        <div 
          className="absolute left-6 top-6 w-0.5 bg-green-600 transition-all duration-500"
          style={{ height: `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - ${currentStep === totalSteps ? 0 : 24}px)` }}
        ></div>
        
        {/* Steps */}
        <div className="relative space-y-6">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            
            return (
              <div key={index} className="flex items-center gap-4">
                {/* Step Circle */}
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                  isCompleted ? 'bg-green-600 text-white shadow-md' :
                  isCurrent ? 'bg-orange-500 text-white shadow-lg animate-pulse' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {isCompleted ? '✓' : step.icon}
                </div>
                
                {/* Step Label */}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-orange-600 font-medium mt-0.5">In Progress...</p>
                  )}
                  {isCompleted && (
                    <p className="text-xs text-green-600 font-medium mt-0.5">Completed</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
