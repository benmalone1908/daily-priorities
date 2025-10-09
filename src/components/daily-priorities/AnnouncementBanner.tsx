/**
 * AnnouncementBanner - Displays active announcements at the top of Daily Priorities
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, X, Plus } from 'lucide-react';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import AddAnnouncementModal from './AddAnnouncementModal';

export default function AnnouncementBanner() {
  const { announcements, isLoading, addAnnouncement, deleteAnnouncement } = useAnnouncements();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Announcements</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1 h-7 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {announcements.length === 0 ? (
            <div className="text-center py-3 text-muted-foreground">
              <p className="text-xs">No active announcements</p>
              <Button
                variant="link"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-1 h-auto py-1 text-xs"
              >
                Add your first announcement
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-center gap-2 p-2 rounded border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                >
                  <Megaphone className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100 whitespace-pre-wrap leading-tight">
                      {announcement.message}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="h-6 w-6 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-100"
                    title="Delete announcement"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddAnnouncementModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addAnnouncement}
      />
    </>
  );
}
