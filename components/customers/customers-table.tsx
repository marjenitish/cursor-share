'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Pencil, Search, Eye, Ban, Unlock, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { usePermissions } from '@/components/providers/permission-provider';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CustomersTableProps {
  onEdit?: (customer: any) => void;
  onBlock?: (customer: any) => void;
  onUnblock?: (customer: any) => void;
  refreshKey: number;
  selectedCustomers: string[];
  onSelectedCustomersChange: (ids: string[]) => void;
}

export function CustomersTable({
  onEdit,
  onBlock,
  onUnblock,
  refreshKey,
  selectedCustomers,
  onSelectedCustomersChange,
}: CustomersTableProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('surname');

        if (error) throw error;

        setCustomers(data || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [refreshKey]);

  const filteredCustomers = customers.filter((customer) => {
    const searchString = searchTerm.toLowerCase();
    return (
      customer.surname.toLowerCase().includes(searchString) ||
      customer.first_name.toLowerCase().includes(searchString) ||
      customer.email?.toLowerCase().includes(searchString) ||
      customer.contact_no?.includes(searchString)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedCustomersChange(filteredCustomers.map(c => c.id));
    } else {
      onSelectedCustomersChange([]);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      onSelectedCustomersChange([...selectedCustomers, customerId]);
    } else {
      onSelectedCustomersChange(selectedCustomers.filter(id => id !== customerId));
    }
  };

  const handleViewDetails = (customer: any) => {
    if (hasPermission('customer_read')) {
      router.push(`/dashboard/customers/${customer.id}`);
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      
      // Get the data to export (filtered customers or all customers)
      const dataToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;
      
      // Prepare the data for Excel
      const excelData = dataToExport.map(customer => ({
        'ID': customer.id,
        'First Name': customer.first_name || '',
        'Surname': customer.surname || '',
        'Email': customer.email || '',
        'Contact Number': customer.contact_no || '',
        'Work Mobile': customer.work_mobile || '',
        'Date of Birth': customer.date_of_birth ? format(new Date(customer.date_of_birth), 'dd/MM/yyyy') : '',
        'Street Number': customer.street_number || '',
        'Street Name': customer.street_name || '',
        'Suburb': customer.suburb || '',
        'Post Code': customer.post_code || '',
        'Country of Birth': customer.country_of_birth || '',
        'Australian Citizen': customer.australian_citizen ? 'Yes' : 'No',
        'Language Other Than English': customer.language_other_than_english || '',
        'English Proficiency': customer.english_proficiency || '',
        'Indigenous Status': customer.indigenous_status || '',
        'Occupation': customer.occupation || '',
        'Next of Kin Name': customer.next_of_kin_name || '',
        'Next of Kin Relationship': customer.next_of_kin_relationship || '',
        'Next of Kin Mobile': customer.next_of_kin_mobile || '',
        'Next of Kin Phone': customer.next_of_kin_phone || '',
        'Status': customer.status || '',
        'Customer Credit': customer.customer_credit || 0,
        'PAQ Form Completed': customer.paq_form ? 'Yes' : 'No',
        'Registration Date': customer.created_at ? format(new Date(customer.created_at), 'dd/MM/yyyy HH:mm') : '',
        'Last Updated': customer.updated_at ? format(new Date(customer.updated_at), 'dd/MM/yyyy HH:mm') : '',
      }));

      // Convert to CSV format
      const headers = Object.keys(excelData[0]);
      const csvContent = [
        headers.join(','),
        ...excelData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${excelData.length} customers to Excel/CSV format`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export customers data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setExporting(true);
      
      // Get the data to export (filtered customers or all customers)
      const dataToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;
      
      // Create PDF using jsPDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Customers Report', 105, 20, { align: 'center' });
      
      // Add generation date
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 30, { align: 'center' });
      
      // Add total count
      doc.text(`Total Customers: ${dataToExport.length}`, 105, 40, { align: 'center' });
      
      // Prepare table data
      const tableData = dataToExport.map(customer => [
        `${customer.surname}, ${customer.first_name}`,
        customer.email || '',
        customer.contact_no || '',
        `${customer.street_number || ''} ${customer.street_name || ''}`,
        customer.suburb || '',
        customer.status || '',
        customer.date_of_birth ? format(new Date(customer.date_of_birth), 'dd/MM/yyyy') : ''
      ]);
      
      // Add table using autoTable plugin
      (doc as any).autoTable({
        head: [['Name', 'Email', 'Contact', 'Street', 'Suburb', 'Status', 'DOB']],
        body: tableData,
        startY: 50,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 }
        }
      });
      
      // Save the PDF
      doc.save(`customers_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);

      toast({
        title: 'Export Successful',
        description: `Exported ${dataToExport.length} customers to PDF format`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export customers data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  const canViewDetails = hasPermission('customer_read');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={exporting || (filteredCustomers.length === 0 && customers.length === 0)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting || (filteredCustomers.length === 0 && customers.length === 0)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedCustomers.length === filteredCustomers.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {customer.surname}, {customer.first_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {customer.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{customer.contact_no}</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.work_mobile}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{customer.street_number} {customer.street_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.suburb}, {customer.post_code}
                  </div>
                </TableCell>
                <TableCell>
                  {customer.date_of_birth
                    ? format(new Date(customer.date_of_birth), 'dd/MM/yyyy')
                    : '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={customer.status === 'Active' ? 'default' : 'secondary'}
                  >
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {canViewDetails && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(customer)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                    {onBlock && customer.status !== 'blocked' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onBlock(customer)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Ban className="h-4 w-4" />
                        <span className="sr-only">Block</span>
                      </Button>
                    )}
                    {onUnblock && customer.status === 'blocked' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onUnblock(customer)}
                        className="text-green-500 hover:text-green-700 hover:bg-green-50"
                      >
                        <Unlock className="h-4 w-4" />
                        <span className="sr-only">Unblock</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No customers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}