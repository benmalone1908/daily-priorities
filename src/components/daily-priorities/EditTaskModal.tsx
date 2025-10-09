/**
 * EditTaskModal - Modal for editing an existing priority task
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyPriority, DailyPriorityUpdate, PrioritySection, SECTION_LABELS } from '@/types/daily-priorities';
import { useAdvertisersList } from '@/hooks/useAdvertisersList';
import { useAgenciesList } from '@/hooks/useAgenciesList';
import CommentsPanel from './CommentsPanel';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: DailyPriorityUpdate) => void;
  task: DailyPriority;
  onCommentAdded?: () => void;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  onCommentAdded
}: EditTaskModalProps) {
  const [formData, setFormData] = useState({
    section: task.section,
    priority_order: task.priority_order.toString(),
    agency_name: task.agency_name || '',
    client_name: task.client_name || '',
    ticket_url: task.ticket_url || '',
    description: task.description || '',
    assignees: task.assignees?.join(', ') || ''
  });

  const [agencyComboboxOpen, setAgencyComboboxOpen] = useState(false);
  const [agencySearchValue, setAgencySearchValue] = useState('');
  const [advertiserComboboxOpen, setAdvertiserComboboxOpen] = useState(false);
  const [advertiserSearchValue, setAdvertiserSearchValue] = useState('');
  const [ticketUrlError, setTicketUrlError] = useState('');

  const { data: agencies = [] } = useAgenciesList();
  const { data: advertisersData } = useAdvertisersList();

  // Get filtered advertisers based on selected agency
  const advertisers = (() => {
    if (!formData.agency_name || !advertisersData?.byAgency) {
      return advertisersData?.advertisers || [];
    }

    let agencyAdvertisers = advertisersData.byAgency.get(formData.agency_name);

    if (!agencyAdvertisers) {
      const lowerAgencyName = formData.agency_name.toLowerCase();
      for (const [agency, advs] of advertisersData.byAgency.entries()) {
        if (agency.toLowerCase() === lowerAgencyName) {
          agencyAdvertisers = advs;
          break;
        }
      }
    }

    return agencyAdvertisers || [];
  })();

  // Reset form when task changes
  useEffect(() => {
    setFormData({
      section: task.section,
      priority_order: task.priority_order.toString(),
      agency_name: task.agency_name || '',
      client_name: task.client_name || '',
      ticket_url: task.ticket_url || '',
      description: task.description || '',
      assignees: task.assignees?.join(', ') || ''
    });
    setTicketUrlError('');
  }, [task]);

  const validateTicketUrl = (url: string): boolean => {
    // For pre-launch and launches sections, ticket URL is optional
    if (formData.section === 'pre_launch' || formData.section === 'launches') {
      if (!url || url.trim() === '') {
        setTicketUrlError('');
        return true; // Optional for these sections
      }
    } else {
      // For other sections, ticket URL is required
      if (!url || url.trim() === '') {
        setTicketUrlError('Dashboard Task URL is required');
        return false;
      }
    }

    const pattern = /^https:\/\/mediajel\.io\/tasks\/details\/.+$/;
    if (!pattern.test(url)) {
      setTicketUrlError('URL must start with "https://mediajel.io/tasks/details/" followed by a task ID');
      return false;
    }

    setTicketUrlError('');
    return true;
  };

  const handleSubmit = () => {
    // Validate ticket URL
    if (!validateTicketUrl(formData.ticket_url)) {
      return;
    }

    const priorityNum = parseInt(formData.priority_order) || task.priority_order;

    const updates: DailyPriorityUpdate = {
      priority_order: priorityNum,
      agency_name: formData.agency_name || null,
      client_name: formData.client_name || null,
      ticket_url: formData.ticket_url,
      description: formData.description || null,
      assignees: formData.assignees
        ? formData.assignees.split(',').map(a => a.trim()).filter(Boolean)
        : []
    };

    // Only include section if it changed
    if (formData.section !== task.section) {
      updates.section = formData.section;
      // Set original_section if moving to blocked, clear it if moving from blocked
      if (formData.section === 'blocked' && task.section !== 'blocked') {
        updates.original_section = task.section;
      } else if (formData.section !== 'blocked' && task.section === 'blocked') {
        updates.original_section = null;
      }
    }

    onSave(updates);
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      section: task.section,
      priority_order: task.priority_order.toString(),
      agency_name: task.agency_name || '',
      client_name: task.client_name || '',
      ticket_url: task.ticket_url || '',
      description: task.description || '',
      assignees: task.assignees?.join(', ') || ''
    });
    setTicketUrlError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details. All fields are optional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Section and Priority on same row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="section">Section</Label>
              <Select
                value={formData.section}
                onValueChange={(value: PrioritySection) => setFormData({ ...formData, section: value })}
              >
                <SelectTrigger id="section">
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner_success">{SECTION_LABELS.partner_success}</SelectItem>
                  <SelectItem value="engineering">{SECTION_LABELS.engineering}</SelectItem>
                  <SelectItem value="launches">{SECTION_LABELS.launches}</SelectItem>
                  <SelectItem value="pre_launch">{SECTION_LABELS.pre_launch}</SelectItem>
                  <SelectItem value="ops">{SECTION_LABELS.ops}</SelectItem>
                  <SelectItem value="blocked">{SECTION_LABELS.blocked}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority_order">Priority #</Label>
              <Input
                id="priority_order"
                type="number"
                min="1"
                value={formData.priority_order}
                onChange={(e) => setFormData({ ...formData, priority_order: e.target.value })}
                placeholder="1"
              />
            </div>
          </div>

          {/* Agency and Advertiser on same row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Agency</Label>
              <Popover open={agencyComboboxOpen} onOpenChange={setAgencyComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={agencyComboboxOpen}
                    className="justify-between"
                  >
                    {formData.agency_name || "Select agency..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[220px] p-0"
                  align="start"
                  style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}
                >
                  <div className="flex items-center border-b px-3" style={{ flexShrink: 0 }}>
                    <Input
                      placeholder="Search or type..."
                      value={agencySearchValue}
                      onChange={(e) => setAgencySearchValue(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div
                    style={{
                      overflowY: 'scroll',
                      flex: 1,
                      minHeight: 0,
                      maxHeight: '300px',
                      WebkitOverflowScrolling: 'touch',
                      position: 'relative'
                    }}
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                  >
                      {(() => {
                        const filteredAgencies = agencies.filter(agency =>
                          agency.toLowerCase().includes(agencySearchValue.toLowerCase())
                        );
                        const exactMatch = agencies.some(a => a.toLowerCase() === agencySearchValue.toLowerCase());

                        return (
                          <>
                            {agencySearchValue && !exactMatch && (
                              <div
                                className="cursor-pointer py-3 px-4 text-sm hover:bg-accent border-b"
                                onClick={() => {
                                  setFormData({ ...formData, agency_name: agencySearchValue });
                                  setAgencyComboboxOpen(false);
                                  setAgencySearchValue('');
                                }}
                              >
                                Create: <span className="font-semibold">{agencySearchValue}</span>
                              </div>
                            )}
                            {filteredAgencies.length > 0 && (
                              <div className="p-1">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                  Existing Agencies
                                </div>
                                {filteredAgencies.map((agency) => (
                                  <div
                                    key={agency}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                      setFormData({ ...formData, agency_name: agency });
                                      setAgencyComboboxOpen(false);
                                      setAgencySearchValue('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.agency_name === agency
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {agency}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Advertiser</Label>
              <Popover open={advertiserComboboxOpen} onOpenChange={setAdvertiserComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={advertiserComboboxOpen}
                    className="justify-between"
                  >
                    {formData.client_name || "Select advertiser..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[220px] p-0"
                  align="start"
                  style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}
                >
                  <div className="flex items-center border-b px-3" style={{ flexShrink: 0 }}>
                    <Input
                      placeholder="Search or type..."
                      value={advertiserSearchValue}
                      onChange={(e) => setAdvertiserSearchValue(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div
                    style={{
                      overflowY: 'scroll',
                      flex: 1,
                      minHeight: 0,
                      maxHeight: '300px',
                      WebkitOverflowScrolling: 'touch',
                      position: 'relative'
                    }}
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                  >
                      {(() => {
                        const filteredAdvertisers = advertisers.filter(advertiser =>
                          advertiser.toLowerCase().includes(advertiserSearchValue.toLowerCase())
                        );
                        const exactMatch = advertisers.some(a => a.toLowerCase() === advertiserSearchValue.toLowerCase());

                        return (
                          <>
                            {advertiserSearchValue && !exactMatch && (
                              <div
                                className="cursor-pointer py-3 px-4 text-sm hover:bg-accent border-b"
                                onClick={() => {
                                  setFormData({ ...formData, client_name: advertiserSearchValue });
                                  setAdvertiserComboboxOpen(false);
                                  setAdvertiserSearchValue('');
                                }}
                              >
                                Create: <span className="font-semibold">{advertiserSearchValue}</span>
                              </div>
                            )}
                            {filteredAdvertisers.length > 0 && (
                              <div className="p-1">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                  Existing Advertisers
                                </div>
                                {filteredAdvertisers.map((advertiser) => (
                                  <div
                                    key={advertiser}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                      setFormData({ ...formData, client_name: advertiser });
                                      setAdvertiserComboboxOpen(false);
                                      setAdvertiserSearchValue('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.client_name === advertiser
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {advertiser}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ticket_url">
              Dashboard Task URL {formData.section !== 'pre_launch' && formData.section !== 'launches' && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="ticket_url"
              type="url"
              value={formData.ticket_url}
              onChange={(e) => {
                setFormData({ ...formData, ticket_url: e.target.value });
                if (ticketUrlError) {
                  validateTicketUrl(e.target.value);
                }
              }}
              placeholder="https://mediajel.io/tasks/details/..."
              className={ticketUrlError ? 'border-destructive' : ''}
            />
            {ticketUrlError && (
              <p className="text-sm text-destructive">{ticketUrlError}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description and action items..."
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assignees">Assignee(s)</Label>
            <Input
              id="assignees"
              value={formData.assignees}
              onChange={(e) => setFormData({ ...formData, assignees: e.target.value })}
              placeholder="Ben, Tyler, Hannah (comma-separated)"
            />
          </div>

          {/* HIDDEN: Commenting feature temporarily disabled */}
          {/* <div className="pt-4 border-t">
            <CommentsPanel priorityId={task.id} onCommentAdded={onCommentAdded} />
          </div> */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
