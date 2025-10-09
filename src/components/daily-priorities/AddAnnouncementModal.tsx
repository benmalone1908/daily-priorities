/**
 * AddAnnouncementModal - Modal for creating a new announcement
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/use-auth';
import { AnnouncementInsert } from '@/types/announcements';

interface AddAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (announcement: AnnouncementInsert) => void;
}

export default function AddAnnouncementModal({
  isOpen,
  onClose,
  onAdd
}: AddAnnouncementModalProps) {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date>(addDays(new Date(), 7)); // Default to 7 days from now

  const handleSubmit = () => {
    if (!message.trim()) {
      return;
    }

    onAdd({
      message: message.trim(),
      created_by: currentUser?.id || 'unknown',
      expires_at: expiresAt.toISOString()
    });

    // Reset form
    setMessage('');
    setExpiresAt(addDays(new Date(), 7));
    onClose();
  };

  const handleCancel = () => {
    setMessage('');
    setExpiresAt(addDays(new Date(), 7));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Announcement</DialogTitle>
          <DialogDescription>
            Create a team announcement. It will automatically disappear after the expiration date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message">
              Announcement Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your announcement..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label>Expiration Date <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => date && setExpiresAt(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Announcement will be hidden after this date
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!message.trim()}>
            Add Announcement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
