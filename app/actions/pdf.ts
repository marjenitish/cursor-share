'use server';

import { createServerClient } from '@/lib/supabase/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CustomerData {
  id: string;
  first_name: string;
  surname: string;
  email: string;
  contact_no: string;
  enrollment_type: string;
}

interface SessionData {
  id: string;
  name: string;
  code: string;
  day_of_week: string;
  start_time: string;
  end_time: string | null;
  venues: {
    id: string;
    name: string;
  };
  exercise_types: {
    id: string;
    name: string;
  };
  terms?: {
    fiscal_year: number;
    start_date: string;
    end_date: string;
  };
}

export async function generateClassRollPDF(
  sessionId: string,
  date: string,
  customerData: CustomerData[]
) {
  try {
    const supabase = createServerClient();

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        name,
        code,
        day_of_week,
        start_time,
        end_time,
        venues (
          id,
          name
        ),
        exercise_types (
          id,
          name
        ),
        terms (
          fiscal_year,
          start_date,
          end_date
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Failed to fetch session details');
    }

    const sessionData = session as unknown as SessionData;

    // Create PDF document
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Class Roll', 105, 20, { align: 'center' });
    
    // Add session details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Session: ${sessionData.name} (${sessionData.code})`, 20, 35);
    doc.text(`Date: ${new Date(date).toLocaleDateString('en-AU')}`, 20, 45);
    doc.text(`Day: ${sessionData.day_of_week}`, 20, 55);
    doc.text(`Time: ${sessionData.start_time}${sessionData.end_time ? ` - ${sessionData.end_time}` : ''}`, 20, 65);
    doc.text(`Venue: ${sessionData.venues.name}`, 20, 75);
    doc.text(`Exercise Type: ${sessionData.exercise_types.name}`, 20, 85);
    
    if (sessionData.terms) {
      doc.text(`Term: ${sessionData.terms.fiscal_year}`, 20, 95);
    }

    // Add attendance instructions
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Instructions: Mark ✓ for present, leave empty for absent', 20, 105);
    doc.text('Total Enrolled: ' + customerData.length, 20, 112);

    // Add table
    const tableData = customerData.map((customer, index) => [
      index + 1,
      `${customer.first_name} ${customer.surname}`,
      customer.email,
      customer.contact_no,
      customer.enrollment_type,
      '' // Empty cell for checkbox
    ]);

    autoTable(doc, {
      head: [['#', 'Name', 'Email', 'Contact', 'Enrollment Type', 'Present']],
      body: tableData,
      startY: 120,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue color
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light gray
      },
      columnStyles: {
        0: { cellWidth: 15 }, // Number column
        1: { cellWidth: 45 }, // Name column
        2: { cellWidth: 45 }, // Email column
        3: { cellWidth: 25 }, // Contact column
        4: { cellWidth: 30 }, // Enrollment Type column
        5: { cellWidth: 20, halign: 'center' }, // Attendance checkbox column
      },
      didParseCell: function(data) {
        // Keep the attendance column simple and empty
        if (data.column.index === 5) {
          data.cell.styles.halign = 'center';
        }
      },
    });

    // Add attendance summary at the bottom of the last page
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    
    // Get the final Y position of the table
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    
    // Add summary section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 20, finalY + 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Enrolled: ${customerData.length}`, 20, finalY + 30);
    doc.text('Present: _____', 20, finalY + 40);
    doc.text('Absent: _____', 20, finalY + 50);
    doc.text('Instructor Signature: _________________', 20, finalY + 60);
    doc.text('Date: _________________', 20, finalY + 70);

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Generated on ${new Date().toLocaleString('en-AU')} - Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Convert to base64 string
    const pdfBase64 = doc.output('datauristring');
    
    return {
      success: true,
      pdfData: pdfBase64,
      fileName: `class-roll-${session.code}-${date.replace(/-/g, '')}.pdf`
    };

  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: 'Failed to generate PDF'
    };
  }
}

export async function generateCSVContent(
  sessionId: string,
  date: string,
  customerData: CustomerData[]
) {
  try {
    const supabase = createServerClient();

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        name,
        code,
        day_of_week,
        start_time,
        end_time,
        venues (
          id,
          name
        ),
        exercise_types (
          id,
          name
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Failed to fetch session details');
    }

    const sessionData = session as unknown as SessionData;

    // Create CSV content
    const csvHeader = [
      'Session Name',
      'Session Code',
      'Date',
      'Day',
      'Time',
      'Venue',
      'Exercise Type',
      'Customer Name',
      'Email',
      'Contact',
      'Enrollment Type',
      'Present'
    ].join(',');

    const csvRows = customerData.map(customer => [
      sessionData.name,
      sessionData.code,
      new Date(date).toLocaleDateString('en-AU'),
      sessionData.day_of_week,
      `${sessionData.start_time}${sessionData.end_time ? ` - ${sessionData.end_time}` : ''}`,
      sessionData.venues.name,
      sessionData.exercise_types.name,
      `${customer.first_name} ${customer.surname}`,
      customer.email,
      customer.contact_no,
      customer.enrollment_type,
      '' // Empty column for manual attendance tracking
    ].join(','));

    const csvContent = [csvHeader, ...csvRows].join('\n');

    return {
      success: true,
      csvContent,
      fileName: `class-roll-${session.code}-${date.replace(/-/g, '')}.csv`
    };

  } catch (error) {
    console.error('Error generating CSV:', error);
    return {
      success: false,
      error: 'Failed to generate CSV'
    };
  }
} 