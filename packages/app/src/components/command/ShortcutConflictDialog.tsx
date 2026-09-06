import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  Button,
  ShortcutHint,
} from "@inventra/ui";
import { CommandDefinition } from "../../stores/shortcutStore";

export interface ShortcutConflictDialogProps {
  open: boolean;
  newBinding: string;
  targetCommand: CommandDefinition;
  conflictingCommand: CommandDefinition;
  onKeepExisting: () => void;
  onReassign: () => void;
}

export const ShortcutConflictDialog: React.FC<ShortcutConflictDialogProps> = ({
  open,
  newBinding,
  targetCommand,
  conflictingCommand,
  onKeepExisting,
  onReassign,
}) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onKeepExisting()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-warning mb-1">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-base text-primary">Shortcut Conflict Detected</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-secondary">
            The shortcut combination <ShortcutHint shortcut={newBinding} compact className="mx-1" /> is already assigned to another command.
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 p-3 bg-surface-muted rounded-lg border border-subtle space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted">Currently Assigned To:</span>
            <span className="font-semibold text-primary">{conflictingCommand.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Target Command:</span>
            <span className="font-semibold text-primary">{targetCommand.label}</span>
          </div>
        </div>

        <p className="text-xs text-secondary">
          Reassigning will attach this key combination to <strong>{targetCommand.label}</strong> and revert <strong>{conflictingCommand.label}</strong> to its default shortcut.
        </p>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onKeepExisting}>
            Keep Existing
          </Button>
          <Button variant="primary" size="sm" onClick={onReassign}>
            Reassign & Replace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
