/**
 * EditResourceModal - Modal for editing an existing resource
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Resource, ResourceUpdate } from '@/types/resources';

interface EditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: ResourceUpdate) => void;
  resource: Resource | null;
}

export default function EditResourceModal({
  isOpen,
  onClose,
  onSave,
  resource
}: EditResourceModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description || '');
      setUrl(resource.url || '');
    }
  }, [resource]);

  const handleSubmit = () => {
    if (!resource || !title.trim()) {
      return;
    }

    if (resource.resource_type === 'url' && !url.trim()) {
      return;
    }

    onSave(resource.id, {
      title: title.trim(),
      description: description.trim() || null,
      url: resource.resource_type === 'url' ? url.trim() : undefined
    });

    onClose();
  };

  const handleCancel = () => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description || '');
      setUrl(resource.url || '');
    }
    onClose();
  };

  if (!resource) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogDescription>
            Update the resource information
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource name..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="resize-none"
            />
          </div>

          {resource.resource_type === 'url' && (
            <div className="grid gap-2">
              <Label htmlFor="edit-url">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-url"
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
            disabled={!title.trim() || (resource.resource_type === 'url' && !url.trim())}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
