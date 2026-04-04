import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MapPin, Shield, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface VolunteerOnboardingProps {
  onComplete: (isAvailable: boolean) => void;
}

export default function VolunteerOnboarding({ onComplete }: VolunteerOnboardingProps) {
  const [step, setStep] = useState(1);
  const [isAvailable, setIsAvailable] = useState(true);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(isAvailable);
    }
  };

  const steps = [
    {
      title: "Welcome, ResQer!",
      description: "You're now part of a high-trust emergency network. Your help can save lives today.",
      icon: <Shield className="w-12 h-12 text-emergency" />,
    },
    {
      title: "Location Permission",
      description: "We need your real-time location to match you with nearby emergencies. Please ensure location services are enabled.",
      icon: <MapPin className="w-12 h-12 text-info" />,
    },
    {
      title: "Set Your Availability",
      description: "You can toggle your availability at any time from your dashboard. When 'Available', you'll receive alerts for nearby tasks.",
      icon: <CheckCircle2 className="w-12 h-12 text-success" />,
      extra: (
        <div className="flex items-center space-x-2 bg-muted/30 p-4 rounded-xl mt-4">
          <Switch
            id="onboarding-available"
            checked={isAvailable}
            onCheckedChange={setIsAvailable}
          />
          <Label htmlFor="onboarding-available" className="font-medium">
            Set me as Available now
          </Label>
        </div>
      ),
    },
  ];

  const currentStep = steps[step - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md border-none shadow-2xl bg-card/95">
        <CardContent className="p-8 flex flex-col items-center text-center">
          <motion.div
            key={step}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="mb-6 p-4 rounded-full bg-muted/30"
          >
            {currentStep.icon}
          </motion.div>

          <h2 className="text-2xl font-bold text-foreground mb-3">{currentStep.title}</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {currentStep.description}
          </p>

          {currentStep.extra}

          <div className="w-full mt-8 space-y-4">
            <Button
              onClick={handleNext}
              className="w-full h-12 rounded-xl bg-emergency hover:bg-emergency/90 text-emergency-foreground font-semibold text-lg group"
            >
              {step === 3 ? "Start Helping" : "Continue"}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>

            <div className="flex justify-center space-x-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i + 1 === step ? "w-8 bg-emergency" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-start gap-2 text-xs text-muted-foreground text-left bg-muted/20 p-3 rounded-lg border border-border/50">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              By continuing, you agree to our Code of Conduct and privacy policy for real-time coordination.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
