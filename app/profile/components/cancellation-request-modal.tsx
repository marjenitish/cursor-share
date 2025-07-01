'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { createBrowserClient } from '@/lib/supabase/client';
import { format, addWeeks, startOfWeek, addDays, isSameDay } from 'date-fns';
import { AlertCircle, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CancellationRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentSession: any;
  onSuccess: () => void;
}

export function CancellationRequestModal({ 
  open, 
  onOpenChange, 
  enrollmentSession, 
  onSuccess 
}: CancellationRequestModalProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const supabase = createBrowserClient();
  const { toast } = useToast();

  // Generate available dates based on enrollment type
  useEffect(() => {
    if (!enrollmentSession?.session?.term_details) return;

    const { start_date, end_date } = enrollmentSession.session.term_details;
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    // Get the day of week as number (0 = Sunday, 1 = Monday, etc.)
    const dayMap: { [key: string]: number } = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const targetDay = dayMap[enrollmentSession.session.day_of_week];
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

    // Filter dates based on enrollment type
    let filteredDates = dates;
    
    if (enrollmentSession.enrollment_type === 'partial' && enrollmentSession.partial_dates) {
      // For partial enrollments, only show dates they're enrolled for
      filteredDates = dates.filter(date => 
        enrollmentSession.partial_dates.includes(format(date, 'yyyy-MM-dd'))
      );
    } else if (enrollmentSession.enrollment_type === 'trial' && enrollmentSession.trial_date) {
      // For trial enrollments, only show their trial date
      filteredDates = dates.filter(date => 
        format(date, 'yyyy-MM-dd') === enrollmentSession.trial_date
      );
    }
    
    // Remove past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filteredDates = filteredDates.filter(date => date >= today);
    
    setAvailableDates(filteredDates);
  }, [enrollmentSession]);

  const handleDateToggle = (date: Date) => {
    setSelectedDates(prev => {
      const exists = prev.some(d => isSameDay(d, date));
      if (exists) {
        return prev.filter(d => !isSameDay(d, date));
      } else {
        return [...prev, date];
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image or PDF file',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      setMedicalCertificate(file);
    }
  };

  const uploadMedicalCertificate = async (): Promise<string | null> => {
    if (!medicalCertificate) return null;

    try {
      const fileExt = medicalCertificate.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `medical_certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bookings')
        .upload(filePath, medicalCertificate);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading medical certificate:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (selectedDates.length === 0 || !reason.trim() || !medicalCertificate) return;
    
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // Upload medical certificate
      setUploadProgress(25);
      const medicalCertificateUrl = await uploadMedicalCertificate();
      setUploadProgress(50);

      // Get existing cancelled dates
      const { data: existingData } = await supabase
        .from('enrollment_sessions')
        .select('cancelled_dates')
        .eq('id', enrollmentSession.id)
        .single();
      
      const existingCancelled = existingData?.cancelled_dates || [];
      
      // Add new cancellation requests
      const newCancellations = selectedDates.map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        reason: reason.trim(),
        medical_certificate_url: medicalCertificateUrl,
        status: 'pending',
        requested_at: new Date().toISOString()
      }));
      
      const updatedCancelled = [...existingCancelled, ...newCancellations];
      setUploadProgress(75);
      
      // Update the enrollment session
      const { error } = await supabase
        .from('enrollment_sessions')
        .update({ cancelled_dates: updatedCancelled })
        .eq('id', enrollmentSession.id);
      
      if (error) throw error;
      setUploadProgress(100);
      
      toast({
        title: 'Success',
        description: `Cancellation request submitted for ${selectedDates.length} class(es)`,
      });
      
      onSuccess();
      onOpenChange(false);
      setSelectedDates([]);
      setReason('');
      setMedicalCertificate(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error submitting cancellation request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit cancellation request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const getEnrollmentTypeLabel = () => {
    if (enrollmentSession?.is_free_trial) return 'Trial Class';
    if (enrollmentSession?.enrollment_type === 'partial') return 'Partial Enrollment';
    return 'Full Term';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Class Cancellation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Session Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Session:</span> {enrollmentSession?.session?.name}
              </div>
              <div>
                <span className="font-medium">Type:</span> {getEnrollmentTypeLabel()}
              </div>
              <div>
                <span className="font-medium">Day:</span> {enrollmentSession?.session?.day_of_week}
              </div>
              <div>
                <span className="font-medium">Time:</span> {enrollmentSession?.session?.start_time}
              </div>
              <div>
                <span className="font-medium">Venue:</span> {enrollmentSession?.session?.venue?.name}
              </div>
              <div>
                <span className="font-medium">Instructor:</span> {enrollmentSession?.session?.instructor?.name}
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <Label>Select Dates to Cancel</Label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {availableDates.map((date) => {
                const selected = isDateSelected(date);
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleDateToggle(date)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selected}
                        onChange={() => handleDateToggle(date)}
                      />
                      <span className="text-sm">
                        {format(date, 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {availableDates.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No available dates for cancellation
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for the cancellation request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Medical Certificate Upload */}
          <div className="space-y-2">
            <Label>Medical Certificate (Required)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {medicalCertificate ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      {medicalCertificate.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMedicalCertificate(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF up to 5MB
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="medical-certificate"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('medical-certificate')?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <Label>Uploading...</Label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Warning */}
          {selectedDates.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p>Your cancellation request will be reviewed by admin. Credits will be added to your account if approved.</p>
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
              disabled={isLoading || selectedDates.length === 0 || !reason.trim() || !medicalCertificate}
            >
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 