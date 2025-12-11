/**
 * AddTaskModal - Modal for adding a new priority task
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyPriorityInsert, PrioritySection } from '@/types/daily-priorities';
import { useAdvertisersList } from '@/hooks/useAdvertisersList';
import { useAgenciesList } from '@/hooks/useAgenciesList';
import { useAuth } from '@/contexts/use-auth';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: DailyPriorityInsert) => void;
  section: PrioritySection;
  date: string;
  nextPriorityOrder: number;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onAdd,
  section,
  date,
  nextPriorityOrder
}: AddTaskModalProps) {
  console.log('AddTaskModal rendered with section:', section);

  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    priority_order: nextPriorityOrder.toString(),
    agency_name: '',
    client_name: '',
    ticket_url: '',
    description: '',
    assignees: ''
  });

  const [agencyComboboxOpen, setAgencyComboboxOpen] = useState(false);
  const [agencySearchValue, setAgencySearchValue] = useState('');
  const [advertiserComboboxOpen, setAdvertiserComboboxOpen] = useState(false);
  const [advertiserSearchValue, setAdvertiserSearchValue] = useState('');
  const [ticketUrlError, setTicketUrlError] = useState('');

  // Update priority_order when nextPriorityOrder prop changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      priority_order: nextPriorityOrder.toString()
    }));
  }, [nextPriorityOrder]);

  const { data: agencies = [], isLoading: isLoadingAgencies, error: agenciesError } = useAgenciesList();
  const { data: advertisersData, isLoading: isLoadingAdvertisers, error: advertisersError } = useAdvertisersList();

  // Debug logging
  console.log('[AddTaskModal] agencies:', agencies.length, 'loading:', isLoadingAgencies, 'error:', agenciesError);
  console.log('[AddTaskModal] advertisers:', advertisersData?.advertisers.length, 'loading:', isLoadingAdvertisers, 'error:', advertisersError);

  // Get filtered advertisers based on selected agency
  const advertisers = (() => {
    if (!formData.agency_name || !advertisersData?.byAgency) {
      return advertisersData?.advertisers || [];
    }

    // Try exact match first
    let agencyAdvertisers = advertisersData.byAgency.get(formData.agency_name);

    // If no exact match, try case-insensitive match
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

  const validateTicketUrl = (url: string): boolean => {
    console.log('Validating ticket URL - Section:', section, 'URL:', url);

    // For pre-launch and launches sections, ticket URL is optional
    if (section === 'pre_launch' || section === 'launches') {
      if (!url || url.trim() === '') {
        console.log('Section is pre_launch or launches, URL is optional - validation passed');
        setTicketUrlError('');
        return true; // Optional for these sections
      }
    } else {
      // For other sections, ticket URL is required
      if (!url || url.trim() === '') {
        console.log('Section requires URL but URL is empty - validation failed');
        setTicketUrlError('Dashboard Task URL is required');
        return false;
      }
    }

    // Accept URLs that start with either /tasks/details/ or /tasks/projects/
    const detailsPattern = /^https:\/\/mediajel\.io\/tasks\/details\/.+$/;
    const projectsPattern = /^https:\/\/mediajel\.io\/tasks\/projects\/.+$/;
    
    if (!detailsPattern.test(url) && !projectsPattern.test(url)) {
      setTicketUrlError('URL must start with "https://mediajel.io/tasks/details/" or "https://mediajel.io/tasks/projects/" followed by an ID');
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

    // Parse and validate priority number
    let priorityNum = parseInt(formData.priority_order);

    // If invalid (NaN, negative, or zero), use the next available priority
    if (isNaN(priorityNum) || priorityNum < 1) {
      console.warn('Invalid priority_order entered:', formData.priority_order, '- using default:', nextPriorityOrder);
      priorityNum = nextPriorityOrder;
    }

    const taskToAdd = {
      active_date: date,
      created_date: new Date().toISOString(), // Use current timestamp for unique identification
      section,
      priority_order: priorityNum,
      agency_name: formData.agency_name || null,
      client_name: formData.client_name || null,
      ticket_url: formData.ticket_url,
      description: formData.description || null,
      assignees: formData.assignees
        ? formData.assignees.split(',').map(a => a.trim()).filter(Boolean)
        : [],
      created_by: currentUser?.id || null
    };

    console.log('Adding task with data:', taskToAdd);
    onAdd(taskToAdd);

    // Reset form
    setFormData({
      priority_order: nextPriorityOrder.toString(),
      agency_name: '',
      client_name: '',
      ticket_url: '',
      description: '',
      assignees: ''
    });
    setTicketUrlError('');
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      priority_order: nextPriorityOrder.toString(),
      agency_name: '',
      client_name: '',
      ticket_url: '',
      description: '',
      assignees: ''
    });
    setTicketUrlError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Add a new priority task. All fields are optional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="priority_order">Priority #</Label>
            <Input
              id="priority_order"
              type="number"
              min="1"
              value={formData.priority_order}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive integers or empty string
                if (value === '' || parseInt(value) >= 1) {
                  setFormData({ ...formData, priority_order: value });
                }
              }}
              placeholder="1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers = higher priority. Will be inserted at this position.
            </p>
          </div>

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
              Dashboard Task URL {section !== 'pre_launch' && section !== 'launches' && <span className="text-destructive">*</span>}
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
              placeholder="https://mediajel.io/tasks/details/... or https://mediajel.io/tasks/projects/..."
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
