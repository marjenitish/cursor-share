'use server';

import { createServerClient } from '@/lib/supabase/server';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  marked_at: string;
}

interface CustomerAttendance {
  id: string;
  enrollment_id: string;
  session_id: string;
  customer_name: string;
  email: string;
  contact_no: string;
  enrollment_type: string;
  attendance_status?: 'present' | 'absent' | 'late';
}

export async function getCustomersForAttendance(
  sessionId: string,
  date: string
): Promise<{ success: boolean; data?: CustomerAttendance[]; error?: string }> {
  try {
    const supabase = createServerClient();

    // Get all enrolled customers for the session and date
    const { data: enrollmentSessions, error } = await supabase
      .from('enrollment_sessions')
      .select(`
        id,
        enrollment_id,
        session_id,
        enrollment_type,
        trial_date,
        partial_dates,
        attendance,
        enrollments (
          customers (
            id,
            first_name,
            surname,
            email,
            contact_no
          )
        )
      `)
      .eq('session_id', sessionId);

    if (error) throw error;

    if (!enrollmentSessions) {
      return { success: true, data: [] };
    }

    // Filter customers based on enrollment type and date
    const customersForDate: CustomerAttendance[] = [];

    for (const enrollment of enrollmentSessions) {
      let shouldInclude = false;

      // Check if customer should be included for this date
      if (enrollment.enrollment_type === 'full') {
        // Full enrollment - always included
        shouldInclude = true;
      } else if (enrollment.enrollment_type === 'trial' && enrollment.trial_date === date) {
        // Trial enrollment - only if trial date matches
        shouldInclude = true;
      } else if (enrollment.enrollment_type === 'partial' && enrollment.partial_dates) {
        // Partial enrollment - only if date is in partial_dates array
        shouldInclude = enrollment.partial_dates.includes(date);
      }

      if (shouldInclude) {
        // Check existing attendance for this date
        const existingAttendance = enrollment.attendance?.find(
          (record: AttendanceRecord) => record.date === date
        );

        const enrollmentData = enrollment as any;
        customersForDate.push({
          id: enrollment.id,
          enrollment_id: enrollment.enrollment_id,
          session_id: enrollment.session_id,
          customer_name: `${enrollmentData.enrollments.customers.first_name} ${enrollmentData.enrollments.customers.surname}`,
          email: enrollmentData.enrollments.customers.email,
          contact_no: enrollmentData.enrollments.customers.contact_no,
          enrollment_type: enrollment.enrollment_type,
          attendance_status: existingAttendance?.status
        });
      }
    }

    return { success: true, data: customersForDate };

  } catch (error) {
    console.error('Error fetching customers for attendance:', error);
    return { 
      success: false, 
      error: 'Failed to fetch customers for attendance' 
    };
  }
}

export async function markAttendance(
  enrollmentSessionId: string,
  date: string,
  status: 'present' | 'absent' | 'late'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();

    // Get current user (instructor)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Get instructor ID
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (instructorError || !instructor) {
      throw new Error('Instructor not found');
    }

    // Get current attendance data
    const { data: enrollmentSession, error: fetchError } = await supabase
      .from('enrollment_sessions')
      .select('attendance')
      .eq('id', enrollmentSessionId)
      .single();

    if (fetchError) throw fetchError;

    const currentAttendance = enrollmentSession.attendance || [];
    
    // Remove existing attendance record for this date if it exists
    const filteredAttendance = currentAttendance.filter(
      (record: AttendanceRecord) => record.date !== date
    );

    // Add new attendance record
    const newAttendanceRecord: AttendanceRecord = {
      date,
      status,
      marked_by: instructor.id,
      marked_at: new Date().toISOString()
    };

    const updatedAttendance = [...filteredAttendance, newAttendanceRecord];

    // Update the enrollment session
    const { error: updateError } = await supabase
      .from('enrollment_sessions')
      .update({ attendance: updatedAttendance })
      .eq('id', enrollmentSessionId);

    if (updateError) throw updateError;

    return { success: true };

  } catch (error) {
    console.error('Error marking attendance:', error);
    return { 
      success: false, 
      error: 'Failed to mark attendance' 
    };
  }
}

export async function getAttendanceReport(
  sessionId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = createServerClient();

    // Get all enrollment sessions for the session
    const { data: enrollmentSessions, error } = await supabase
      .from('enrollment_sessions')
      .select(`
        id,
        enrollment_type,
        attendance,
        enrollments (
          customers (
            first_name,
            surname,
            email
          )
        )
      `)
      .eq('session_id', sessionId);

    if (error) throw error;

    // Process attendance data
    const attendanceReport = enrollmentSessions?.map(enrollment => {
      const enrollmentData = enrollment as any;
      const customerName = `${enrollmentData.enrollments.customers.first_name} ${enrollmentData.enrollments.customers.surname}`;
      const attendance = enrollment.attendance || [];
      
      // Filter attendance for the date range
      const dateRangeAttendance = attendance.filter((record: AttendanceRecord) => 
        record.date >= startDate && record.date <= endDate
      );

      return {
        customer_name: customerName,
        email: enrollmentData.enrollments.customers.email,
        enrollment_type: enrollment.enrollment_type,
        attendance_records: dateRangeAttendance,
        total_sessions: dateRangeAttendance.length,
        present_count: dateRangeAttendance.filter((r: AttendanceRecord) => r.status === 'present').length,
        absent_count: dateRangeAttendance.filter((r: AttendanceRecord) => r.status === 'absent').length,
        late_count: dateRangeAttendance.filter((r: AttendanceRecord) => r.status === 'late').length
      };
    });

    return { success: true, data: attendanceReport };

  } catch (error) {
    console.error('Error generating attendance report:', error);
    return { 
      success: false, 
      error: 'Failed to generate attendance report' 
    };
  }
} 