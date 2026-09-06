import React, { useState, useEffect, useRef } from "react";
import { Keyboard, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  Button,
  ShortcutHint,
  Alert,
} from "@inventra/ui";
import {
  CommandDefinition,
  isBrowserReserved,
  useShortcutStore,
} from "../../stores/shortcutStore";
import { ShortcutConflictDialog } from "./ShortcutConflictDialog";
import { normalizeEventKey } from "../../hooks/useKeyboardShortcuts";

export interface ShortcutRecorderModalProps {
  command: CommandDefinition | null;
  currentBinding: string;
  onClose: () => void;
  onSave: (binding: string) => Promise<void> | void;
}

export const ShortcutRecorderModal: React.FC<ShortcutRecorderModalProps> = ({
  command,
  currentBinding,
  onClose,
  onSave,
}) => {
  const { validateConflict } = useShortcutStore();
  const [recordedKeys, setRecordedKeys] = useState<string>("");
  const [isRecording, setIsRecording] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<{
    newBinding: string;
    conflictingCommand: CommandDefinition;
  } | null>(null);

  const pendingSeqRef = useRef<string | null>(null);

  useEffect(() => {
    setRecordedKeys("");
    setError(null);
    setIsRecording(true);
    pendingSeqRef.current = null;
  }, [command]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore single modifier presses alone
    if (["Control", "Meta", "Alt", "Shift"].includes(e.key)) {
      return;
    }

    const keyCombo = normalizeEventKey(e.nativeEvent);

    // Sequence chord detection (e.g. user presses G then I)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      const upper = e.key.toUpperCase();
      if (!pendingSeqRef.current) {
        pendingSeqRef.current = upper;
        setRecordedKeys(upper);
        return;
      } else {
        const sequence = `${pendingSeqRef.current} ${upper}`;
        pendingSeqRef.current = null;
        applyBinding(sequence);
        return;
      }
    }

    pendingSeqRef.current = null;
    applyBinding(keyCombo);
  };

  const applyBinding = (binding: string) => {
    setError(null);

    // Check browser reserved
    if (isBrowserReserved(binding)) {
      setError(`"${binding}" is reserved by web browsers and cannot be assigned.`);
      setRecordedKeys("");
      return;
    }

    setRecordedKeys(binding);
    setIsRecording(false);
  };

  const handleSave = async () => {
    if (!command || !recordedKeys) return;

    // Check conflict
    const conflict = validateConflict(command.id, recordedKeys);
    if (conflict.hasConflict && conflict.conflictingCommand) {
      setConflictState({
        newBinding: recordedKeys,
        conflictingCommand: conflict.conflictingCommand,
      });
      return;
    }

    await onSave(recordedKeys);
    onClose();
  };

  const handleReassignConflict = async () => {
    if (!command || !conflictState) return;
    await onSave(conflictState.newBinding);
    setConflictState(null);
    onClose();
  };

  if (!command) return null;

  return (
    <>
      <Dialog open={Boolean(command) && !conflictState} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary-subtle border border-primary-border">
                <Keyboard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base text-primary">
                  Edit Shortcut for {command.label}
                </DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  Press the key combination or 2-key sequence you wish to assign.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Current vs New */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-muted border border-subtle text-xs">
              <span className="text-muted">Current Shortcut:</span>
              <ShortcutHint shortcut={currentBinding} compact />
            </div>

            {/* Recording Area */}
            <div
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onClick={() => {
                setIsRecording(true);
                setRecordedKeys("");
                pendingSeqRef.current = null;
              }}
              className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-focus ${
                isRecording
                  ? "border-accent bg-accent-subtle/30"
                  : "border-strong bg-surface-elevated"
              }`}
            >
              {recordedKeys ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted">Captured Keybinding:</span>
                  <ShortcutHint shortcut={recordedKeys} className="scale-125 my-1" />
                  <span className="text-[11px] text-primary underline">Click to re-record</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent animate-ping mb-1" />
                  <span className="text-xs font-semibold text-primary">
                    {pendingSeqRef.current
                      ? `First key: [${pendingSeqRef.current}] — Press second key...`
                      : "Press desired shortcut keys..."}
                  </span>
                  <span className="text-[11px] text-muted">
                    Supports Ctrl/Cmd combos (e.g. Ctrl+Shift+P) or sequences (e.g. G I)
                  </span>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="danger" className="py-2 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </Alert>
            )}

          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRecordedKeys(command.defaultBinding);
                setIsRecording(false);
              }}
            >
              Reset to Default ({command.defaultBinding})
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!recordedKeys}
              >
                Save Shortcut
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {conflictState && (
        <ShortcutConflictDialog
          open={Boolean(conflictState)}
          newBinding={conflictState.newBinding}
          targetCommand={command}
          conflictingCommand={conflictState.conflictingCommand}
          onKeepExisting={() => setConflictState(null)}
          onReassign={handleReassignConflict}
        />
      )}
    </>
  );
};
