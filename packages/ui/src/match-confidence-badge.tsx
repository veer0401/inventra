import * as React from "react";
import { Badge, type BadgeProps } from "./badge";
import { CheckCheck, Sparkles, HelpCircle, PlusCircle } from "lucide-react";
import { cn } from "./utils";

export interface MatchConfidenceBadgeProps extends Omit<BadgeProps, "children"> {
  confidence?: number | null;
  matchedEntityId?: string | null;
  className?: string;
}

export const MatchConfidenceBadge: React.FC<MatchConfidenceBadgeProps> = ({
  confidence,
  matchedEntityId,
  className,
  ...props
}) => {
  if (!matchedEntityId || confidence == null || confidence <= 0) {
    return (
      <Badge variant="outline" className={cn("gap-1 py-0.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800", className)} {...props}>
        <PlusCircle className="h-3 w-3 shrink-0" />
        <span>New Entity</span>
      </Badge>
    );
  }

  const percentage = Math.round(confidence * 100);

  if (percentage >= 95) {
    return (
      <Badge variant="success" className={cn("gap-1 py-0.5 text-xs", className)} {...props}>
        <CheckCheck className="h-3 w-3 shrink-0" />
        <span>Exact Match ({percentage}%)</span>
      </Badge>
    );
  }

  if (percentage >= 70) {
    return (
      <Badge variant="warning" className={cn("gap-1 py-0.5 text-xs", className)} {...props}>
        <Sparkles className="h-3 w-3 shrink-0" />
        <span>Probable Match ({percentage}%)</span>
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={cn("gap-1 py-0.5 text-xs", className)} {...props}>
      <HelpCircle className="h-3 w-3 shrink-0" />
      <span>Fuzzy Match ({percentage}%)</span>
    </Badge>
  );
};
