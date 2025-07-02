'use client';

import { useState } from 'react';
import { Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface UnblockCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  onSubmit: () => void;
}

export function UnblockCustomerModal({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: UnblockCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-green-500" />
            Unblock Customer
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to unblock this customer? They will be able to access the system again.
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
                <Badge variant="destructive">
                  {customer.status}
                </Badge>
              </div>
              {customer.block_note && (
                <div className="flex items-start gap-2">
                  <span className="font-medium">Block Reason:</span>
                  <span className="text-muted-foreground">{customer.block_note}</span>
                </div>
              )}
              {customer.blocked_at && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Blocked Since:</span>
                  <span className="text-muted-foreground">
                    {new Date(customer.blocked_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Information */}
          <div className="p-3 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-start gap-2">
              <Unlock className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700">
                <p className="font-medium">What will happen:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Customer will be able to log in again</li>
                  <li>• Customer will be able to enroll in new sessions</li>
                  <li>• All existing enrollments will remain active</li>
                  <li>• Block history will be cleared</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Unblocking...' : 'Unblock Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 