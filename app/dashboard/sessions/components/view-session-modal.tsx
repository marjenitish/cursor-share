'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, User, DollarSign, Users, AlertTriangle } from 'lucide-react';

interface ViewSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
}

export function ViewSessionModal({ open, onOpenChange, session }: ViewSessionModalProps) {
  if (!session) return null;

  const formatTime = (time: string) => {
    return format(new Date(`2000-01-01T${time}`), 'h:mm a');
  };

  const getDayColor = (day: string) => {
    const colors: { [key: string]: string } = {
      'Monday': 'bg-blue-100 text-blue-800',
      'Tuesday': 'bg-purple-100 text-purple-800',
      'Wednesday': 'bg-green-100 text-green-800',
      'Thursday': 'bg-orange-100 text-orange-800',
      'Friday': 'bg-pink-100 text-pink-800',
      'Saturday': 'bg-indigo-100 text-indigo-800',
    };
    return colors[day] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Session Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{session.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {session.code}
                </Badge>
                <Badge className={getDayColor(session.day_of_week)}>
                  {session.day_of_week}
                </Badge>
                {session.is_subsidised && (
                  <Badge variant="secondary">Subsidised</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(session.start_time)}
                      {session.end_time && ` - ${formatTime(session.end_time)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Capacity</p>
                    <p className="text-sm text-gray-600">
                      {session.class_capacity || 'Unlimited'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{session.venue?.name}</p>
                  <p className="text-sm text-gray-600">
                    {session.address}
                    {session.zip_code && `, ${session.zip_code}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Instructor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{session.instructor?.name}</p>
                  <p className="text-sm text-gray-600">
                    {session.instructor?.contact_no}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Fee Amount</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${session.fee_amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Fee Criteria</p>
                  <p className="text-sm text-gray-600">{session.fee_criteria}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Term Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Term Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Term</p>
                  <p className="text-sm text-gray-600">{session.term}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Fiscal Year</p>
                  <p className="text-sm text-gray-600">
                    FY {session.term_details?.fiscal_year}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-gray-600">
                    {session.term_details?.start_date && 
                      format(new Date(session.term_details.start_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">End Date</p>
                  <p className="text-sm text-gray-600">
                    {session.term_details?.end_date && 
                      format(new Date(session.term_details.end_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercise Type */}
          {session.exercise_type && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exercise Type</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{session.exercise_type.name}</p>
              </CardContent>
            </Card>
          )}

          {/* Cancelled Classes */}
          {session.cancelled_classes && session.cancelled_classes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Cancelled Classes ({session.cancelled_classes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {session.cancelled_classes.map((cancelled: any, index: number) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-800">
                            {format(parseISO(cancelled.date), 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-sm text-red-600 mt-1">
                            Reason: {cancelled.reason}
                          </p>
                          {cancelled.cancelled_by && (
                            <p className="text-xs text-gray-500 mt-1">
                              Cancelled by: {cancelled.cancelled_by}
                            </p>
                          )}
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          Cancelled
                        </Badge>
                      </div>
                      {cancelled.cancelled_at && (
                        <p className="text-xs text-red-500 mt-2">
                          Cancelled on: {format(parseISO(cancelled.cancelled_at), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Classes in Term</p>
                  <p className="text-lg font-semibold">
                    {session.term_details ? 
                      Math.ceil((new Date(session.term_details.end_date).getTime() - 
                                new Date(session.term_details.start_date).getTime()) / 
                               (1000 * 60 * 60 * 24 * 7)) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cancelled Classes</p>
                  <p className="text-lg font-semibold text-red-600">
                    {session.cancelled_classes?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 