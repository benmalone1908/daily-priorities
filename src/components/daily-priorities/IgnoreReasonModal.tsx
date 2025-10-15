import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";

export const IGNORE_REASONS = [
  "Integration not possible",
  "No ecomm to track",
  "Awareness-only campaign",
  "Campaign type doesn't support attribution (ie DOOH)"
] as const;

export type IgnoreReason = typeof IGNORE_REASONS[number];

interface IgnoreReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  onConfirm: (reason: IgnoreReason) => void;
}

export function IgnoreReasonModal({ open, onOpenChange, campaignName, onConfirm }: IgnoreReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<IgnoreReason | null>(null);

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
      onOpenChange(false);
      setSelectedReason(null);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedReason(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ignore ROAS Alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select a reason for ignoring ROAS alerts for:
          </p>
          <p className="text-sm font-medium">{campaignName}</p>

          <RadioGroup value={selectedReason || ""} onValueChange={(value) => setSelectedReason(value as IgnoreReason)}>
            {IGNORE_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} />
                <Label htmlFor={reason} className="cursor-pointer font-normal">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedReason}>
            Ignore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
