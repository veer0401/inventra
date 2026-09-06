import React from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from "@inventra/ui";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export interface ModulePlaceholderProps {
  title: string;
  phase: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  plannedFeatures: string[];
}

export const ModulePlaceholderPage: React.FC<ModulePlaceholderProps> = ({
  title,
  phase,
  icon: Icon,
  description,
  plannedFeatures,
}) => {
  const activeContext = useAuthStore((state) => state.activeContext);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Module Banner Card */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-4 border-b border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-lg bg-primary-subtle border border-primary-border text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl text-primary font-bold">{title}</CardTitle>
                  <Badge variant="warning" className="text-[10px] font-mono">
                    {phase} • Upcoming Module
                  </Badge>
                </div>
                <CardDescription className="text-secondary text-xs mt-1">
                  Active Context: <strong className="text-primary">{activeContext?.businessName}</strong> • {activeContext?.storeName || "Global Console"}
                </CardDescription>
              </div>
            </div>

            <Link to="/dashboard">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Explanation */}
          <div className="p-4 rounded-lg bg-surface-muted border border-subtle text-sm text-secondary leading-relaxed">
            <p>{description}</p>
            <p className="text-xs text-muted mt-2 font-mono">
              Note: This business module is scheduled for implementation in {phase}. Backend API contracts, entities, and database schemas are already provisioned and validated.
            </p>
          </div>

          {/* Planned Feature Deliverables */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Planned Feature Deliverables ({phase})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plannedFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-md bg-surface-muted border border-subtle text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                  <span className="text-primary font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t border-subtle text-xs text-muted justify-between">
          <span>Module Status: In Architecture Plan</span>
          <span className="font-mono">Inventra ERP 1.0.0</span>
        </CardFooter>
      </Card>
    </div>
  );
};
