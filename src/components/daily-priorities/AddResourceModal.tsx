/**
 * AddResourceModal - Modal for adding a new resource (URL or file)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link2, FileUp } from 'lucide-react';
import { useAuth } from '@/contexts/use-auth';
import { ResourceInsert } from '@/types/resources';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (resource: ResourceInsert) => void;
}

export default function AddResourceModal({
  isOpen,
  onClose,
  onAdd
}: AddResourceModalProps) {
  const { currentUser } = useAuth();
  const [resourceType, setResourceType] = useState<'url' | 'file'>('url');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    if (resourceType === 'url' && !url.trim()) {
      return;
    }

    onAdd({
      title: title.trim(),
      description: description.trim() || null,
      resource_type: resourceType,
      url: resourceType === 'url' ? url.trim() : null,
      created_by: currentUser?.id || 'unknown'
    });

    // Reset form
    setTitle('');
    setDescription('');
    setUrl('');
    setResourceType('url');
    onClose();
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setResourceType('url');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
          <DialogDescription>
            Add a permanent resource link for the team to access
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource name..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label>Resource Type <span className="text-destructive">*</span></Label>
            <RadioGroup value={resourceType} onValueChange={(value) => setResourceType(value as 'url' | 'file')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url" className="font-normal cursor-pointer flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link/URL
                </Label>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <RadioGroupItem value="file" id="file" disabled />
                <Label htmlFor="file" className="font-normal cursor-not-allowed flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  File Upload (Coming soon)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {resourceType === 'url' && (
            <div className="grid gap-2">
              <Label htmlFor="url">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || (resourceType === 'url' && !url.trim())}
          >
            Add Resource
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
