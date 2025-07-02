'use client';

import { useState } from 'react';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface BlockCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  onSubmit: (note: string) => void;
}

export function BlockCustomerModal({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: BlockCustomerModalProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(note);
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNote('');
    }
    onOpenChange(newOpen);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-500" />
            Block Customer
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to block this customer? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Information */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Customer Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Name:</span>
                <span>{customer.first_name} {customer.surname}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Email:</span>
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={customer.status === 'blocked' ? 'destructive' : 'secondary'}>
                  {customer.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Block Note */}
          <div className="space-y-2">
            <Label htmlFor="block-note">
              Reason for blocking <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="block-note"
              placeholder="Please provide a reason for blocking this customer..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This note will be recorded with the block action and can be reviewed later.
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-start gap-2">
              <Ban className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Warning:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Customer will be unable to enroll in new sessions</li>
                  <li>• Existing enrollments will remain active</li>
                  <li>• This action can be reversed by an administrator</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!note.trim() || isSubmitting}
          >
            {isSubmitting ? 'Blocking...' : 'Block Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 