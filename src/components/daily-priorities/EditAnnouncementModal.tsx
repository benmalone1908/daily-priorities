/**
 * EditAnnouncementModal - Modal for editing an existing announcement
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Announcement, AnnouncementUpdate } from '@/types/announcements';

interface EditAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, update: AnnouncementUpdate) => void;
  announcement: Announcement | null;
}

export default function EditAnnouncementModal({
  isOpen,
  onClose,
  onUpdate,
  announcement
}: EditAnnouncementModalProps) {
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date>(new Date());

  // Update form when announcement changes
  useEffect(() => {
    if (announcement) {
      setMessage(announcement.message);
      setExpiresAt(new Date(announcement.expires_at));
    }
  }, [announcement]);

  const handleSubmit = () => {
    if (!message.trim() || !announcement) {
      return;
    }

    onUpdate(announcement.id, {
      message: message.trim(),
      expires_at: expiresAt.toISOString()
    });

    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    if (announcement) {
      setMessage(announcement.message);
      setExpiresAt(new Date(announcement.expires_at));
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>
            Update your announcement message or expiration date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-message">
              Announcement Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-message"
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
            Update Announcement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
