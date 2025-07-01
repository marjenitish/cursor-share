'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { createBrowserClient } from '@/lib/supabase/client';
import { format, addWeeks, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CancelledClass {
  date: string;
  reason: string;
  cancelled_by: string;
}

interface Session {
  id: string;
  name: string;
  code: string;
  day_of_week: string;
  term_details?: {
    fiscal_year: number;
    start_date: string;
    end_date: string;
  };
  cancelled_classes?: CancelledClass[];
}

interface CancellationModalProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CancellationModal({ session, open, onOpenChange, onSuccess }: CancellationModalProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [cancelledDates, setCancelledDates] = useState<string[]>([]);
  const supabase = createBrowserClient();
  const { toast } = useToast();

  // Generate available dates for the session's day of week within the term
  useEffect(() => {
    if (!session || !session.term_details) return;

    const { start_date, end_date } = session.term_details;
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    // Get the day of week as number (0 = Sunday, 1 = Monday, etc.)
    const dayMap: { [key: string]: number } = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const targetDay = dayMap[session.day_of_week];
    const dates: Date[] = [];
    
    // Start from the first occurrence of the target day
    let currentDate = startOfWeek(start);
    while (currentDate.getDay() !== targetDay) {
      currentDate = addDays(currentDate, 1);
    }
    
    // Generate all dates for this day within the term
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = addWeeks(currentDate, 1);
    }
    
    setAvailableDates(dates);
  }, [session]);

  // Load existing cancelled dates
  useEffect(() => {
    if (!session) return;
    
    const loadCancelledDates = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('cancelled_classes')
          .eq('id', session.id)
          .single();
        
        if (error) throw error;
        
        if (data?.cancelled_classes) {
          setCancelledDates(data.cancelled_classes.map((c: any) => c.date));
        }
      } catch (error) {
        console.error('Error loading cancelled dates:', error);
      }
    };
    
    loadCancelledDates();
  }, [session, supabase]);

  const handleDateToggle = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isCancelled = cancelledDates.includes(dateStr);
    
    if (isCancelled) {
      // Remove from cancelled dates
      setCancelledDates(prev => prev.filter(d => d !== dateStr));
    } else {
      // Add to selected dates
      setSelectedDates(prev => {
        const exists = prev.some(d => isSameDay(d, date));
        if (exists) {
          return prev.filter(d => !isSameDay(d, date));
        } else {
          return [...prev, date];
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (selectedDates.length === 0 || !reason.trim()) return;
    
    setIsLoading(true);
    try {
      // Get existing cancelled classes
      const { data: existingData } = await supabase
        .from('sessions')
        .select('cancelled_classes')
        .eq('id', session.id)
        .single();
      
      const existingCancelled = existingData?.cancelled_classes || [];
      
      // Add new cancellations
      const newCancellations = selectedDates.map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        reason: reason.trim(),
        cancelled_at: new Date().toISOString()
      }));
      
      const updatedCancelled = [...existingCancelled, ...newCancellations];
      
      // Update the session
      const { error } = await supabase
        .from('sessions')
        .update({ cancelled_classes: updatedCancelled })
        .eq('id', session.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Cancelled ${selectedDates.length} class(es)`,
      });
      
      onSuccess();
      onOpenChange(false);
      setSelectedDates([]);
      setReason('');
    } catch (error) {
      console.error('Error cancelling classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel classes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDateCancelled = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return cancelledDates.includes(dateStr);
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cancel Classes - {session?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Session Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Day:</span> {session?.day_of_week}
              </div>
              <div>
                <span className="font-medium">Time:</span> {session?.start_time}
              </div>
              <div>
                <span className="font-medium">Venue:</span> {session?.venue?.name}
              </div>
              <div>
                <span className="font-medium">Instructor:</span> {session?.instructor?.name}
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <Label>Select Dates to Cancel</Label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {availableDates.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const cancelled = isDateCancelled(date);
                const selected = isDateSelected(date);
                
                return (
                  <div
                    key={dateStr}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      cancelled 
                        ? 'bg-red-50 border-red-200' 
                        : selected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleDateToggle(date)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={cancelled || selected}
                        disabled={cancelled}
                        readOnly
                      />
                      <span className="text-sm">
                        {format(date, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {cancelled && (
                      <Badge variant="destructive" className="text-xs">
                        Already Cancelled
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for cancellation (e.g., Public holiday, Instructor unavailable, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning */}
          {selectedDates.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Warning:</p>
                <p>You are about to cancel {selectedDates.length} class(es). This action will notify enrolled students.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || selectedDates.length === 0 || !reason.trim()}
            >
              {isLoading ? 'Cancelling...' : 'Cancel Classes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 