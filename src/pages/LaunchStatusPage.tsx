/**
 * LaunchStatusPage - Page for tracking launch process steps
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useLaunchStatusTracking } from '@/hooks/useLaunchStatusTracking';
import { RenewalProcessStatus, RenewalStatusTrackingUpdate } from '@/types/daily-priorities';
import { StatusTrackingCard } from '@/components/status-tracking/StatusTrackingCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, ArrowLeft, CalendarIcon } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6 flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={resetErrorBoundary}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LaunchStatusPage() {
  const navigate = useNavigate();
  const {
    trackingRecords,
    isLoading,
    error,
    isError,
    createTrackingRecord,
    updateTrackingRecord,
    deleteTrackingRecord,
    hasTrackingRecord,
    isCreating,
    isDeleting
  } = useLaunchStatusTracking();

  const [newCampaignName, setNewCampaignName] = useState('');
  const [newLaunchDate, setNewLaunchDate] = useState<Date | undefined>(undefined);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [openNewDatePicker, setOpenNewDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('open');
  const [openNotesModal, setOpenNotesModal] = useState<Record<string, boolean>>({});
  const [notesInputs, setNotesInputs] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Split records into open and completed, sorted by launch date (stored in renewal_date field)
  const sortByLaunchDate = (a: typeof trackingRecords[0], b: typeof trackingRecords[0]) => {
    if (!a.renewal_date && !b.renewal_date) return 0;
    if (!a.renewal_date) return 1;
    if (!b.renewal_date) return -1;
    return new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime();
  };
  const openRecords = trackingRecords.filter(r => !r.completed).sort(sortByLaunchDate);
  const completedRecords = trackingRecords.filter(r => r.completed).sort(sortByLaunchDate);

  const handleAddManual = () => {
    if (!newCampaignName.trim()) {
      toast.warning('Please enter a campaign name');
      return;
    }

    if (hasTrackingRecord(newCampaignName.trim())) {
      toast.warning('This campaign already has a tracking record');
      return;
    }

    createTrackingRecord(
      {
        campaign_name: newCampaignName.trim(),
        renewal_date: newLaunchDate ? format(newLaunchDate, 'yyyy-MM-dd') : null
      },
      {
        onSuccess: () => {
          setNewCampaignName('');
          setNewLaunchDate(undefined);
          setShowAddDialog(false);
        }
      }
    );
  };

  const handleCheckboxChange = (
    id: string,
    field: keyof RenewalStatusTrackingUpdate,
    checked: boolean
  ) => {
    updateTrackingRecord({
      id,
      updates: { [field]: checked }
    });
  };

  const handleStatusChange = (id: string, status: RenewalProcessStatus) => {
    updateTrackingRecord({
      id,
      updates: { status }
    });
  };

  const handleRenewalDateChange = (id: string, date: string) => {
    updateTrackingRecord({
      id,
      updates: { renewal_date: date || null }
    });
  };

  const handleTaskUrlChange = (id: string, url: string | null) => {
    updateTrackingRecord({
      id,
      updates: { task_url: url }
    });
  };

  const handleOpenNotesModal = (id: string, notes: string | null) => {
    setNotesInputs(prev => ({ ...prev, [id]: notes || '' }));
    setOpenNotesModal(prev => ({ ...prev, [id]: true }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    updateTrackingRecord({
      id,
      updates: {
        notes: notes || null,
        notes_updated_at: new Date().toISOString()
      }
    });
    setOpenNotesModal(prev => ({ ...prev, [id]: false }));
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteTrackingRecord(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleMarkComplete = (id: string) => {
    updateTrackingRecord({
      id,
      updates: {
        completed: true,
        completed_at: new Date().toISOString()
      }
    });
  };

  const handleReopen = (id: string) => {
    updateTrackingRecord({
      id,
      updates: {
        completed: false,
        completed_at: null
      }
    });
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-xl">Launch Status</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track launch process steps for campaigns
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add Manually
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Campaign</DialogTitle>
                      <DialogDescription>
                        Add a new campaign to track its launch process.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Campaign Name</label>
                        <Input
                          placeholder="Enter campaign name"
                          value={newCampaignName}
                          onChange={(e) => setNewCampaignName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Launch Date (Optional)</label>
                        <Popover open={openNewDatePicker} onOpenChange={setOpenNewDatePicker}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newLaunchDate ? format(newLaunchDate, 'PPP') : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newLaunchDate}
                              onSelect={(date) => {
                                setNewLaunchDate(date);
                                setOpenNewDatePicker(false);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button onClick={handleAddManual} className="w-full" disabled={isCreating}>
                        {isCreating ? 'Adding...' : 'Add Campaign'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 bg-gray-50">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-2">Failed to load tracking records.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {(error as Error)?.message || 'Please check your connection and try again.'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="w-full">
                {/* Tabs */}
                <div className="flex gap-6 mb-6 border-b">
                  <button
                    onClick={() => setActiveTab('open')}
                    className={`pb-2 text-sm font-medium transition-colors ${
                      activeTab === 'open'
                        ? 'text-foreground border-b-2 border-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Open ({openRecords.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`pb-2 text-sm font-medium transition-colors ${
                      activeTab === 'completed'
                        ? 'text-foreground border-b-2 border-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Completed ({completedRecords.length})
                  </button>
                </div>

                {/* Open Records Tab */}
                {activeTab === 'open' && (
                  <>
                    {openRecords.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="mb-2">No open launch tracking records.</p>
                        <p className="text-sm">Add a campaign to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {openRecords.map((record) => (
                          <StatusTrackingCard
                            key={record.id}
                            record={record}
                            isCompleted={false}
                            useLaunchLabels={true}
                            onCheckboxChange={handleCheckboxChange}
                            onStatusChange={handleStatusChange}
                            onRenewalDateChange={handleRenewalDateChange}
                            onTaskUrlChange={handleTaskUrlChange}
                            onOpenNotesModal={handleOpenNotesModal}
                            onDelete={handleDelete}
                            onMarkComplete={handleMarkComplete}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Completed Records Tab */}
                {activeTab === 'completed' && (
                  <>
                    {completedRecords.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="mb-2">No completed launch tracking records.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {completedRecords.map((record) => (
                          <StatusTrackingCard
                            key={record.id}
                            record={record}
                            isCompleted={true}
                            useLaunchLabels={true}
                            onCheckboxChange={handleCheckboxChange}
                            onStatusChange={handleStatusChange}
                            onRenewalDateChange={handleRenewalDateChange}
                            onTaskUrlChange={handleTaskUrlChange}
                            onOpenNotesModal={handleOpenNotesModal}
                            onDelete={handleDelete}
                            onReopen={handleReopen}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes Modal for each record */}
      {trackingRecords.map((record) => (
        <Dialog
          key={`notes-${record.id}`}
          open={openNotesModal[record.id] || false}
          onOpenChange={(open) => setOpenNotesModal(prev => ({ ...prev, [record.id]: open }))}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Notes for {record.campaign_name}
              </DialogTitle>
              <DialogDescription>
                Add or edit notes for this campaign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter notes..."
                value={notesInputs[record.id] || ''}
                onChange={(e) => setNotesInputs(prev => ({ ...prev, [record.id]: e.target.value }))}
                className="min-h-[200px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenNotesModal(prev => ({ ...prev, [record.id]: false }))}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleNotesChange(record.id, notesInputs[record.id] || '')}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tracking Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tracking record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
}
