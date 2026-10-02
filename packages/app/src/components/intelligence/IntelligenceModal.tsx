import React from "react";
import { IntelligencePanel } from "./IntelligencePanel";

/**
 * Backward-compatibility wrapper for IntelligenceModal.
 * In Phase 3, the Intelligence experience is canonicalized into the right-side IntelligencePanel.
 */
export const IntelligenceModal: React.FC = () => {
  return <IntelligencePanel />;
};

export default IntelligenceModal;
