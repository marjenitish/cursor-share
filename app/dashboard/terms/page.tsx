'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { TermForm } from './components/term-form';

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

interface Term {
  id: number;
  fiscal_year: number;
  term_number: number;
  day_of_week: DayOfWeek;
  start_date: string;
  end_date: string;
  number_of_weeks: number;
}

const daysOfWeek: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const termNumbers = [1, 2, 3, 4];

export default function TermsPage() {
  const supabase = createBrowserClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTerms = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('fiscal_year', selectedYear)
        .order('term_number')
        .order('day_of_week');
      
      if (error) throw error;
      setTerms(data as Term[]);
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTerms();
  }, [selectedYear]);

  const years = Array.from({ length: 10 }, (_, i) => selectedYear + i - 5);

  const getTermsForDay = (day: DayOfWeek) => {
    if (!terms) return Array(4).fill(null);
    return termNumbers.map(termNumber => 
      terms.find((term: Term) => term.day_of_week === day && term.term_number === termNumber)
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Terms Management</CardTitle>
          <div className="flex items-center space-x-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TermForm type="create" onSuccess={fetchTerms} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Term 1</TableHead>
                    <TableHead>Term 2</TableHead>
                    <TableHead>Term 3</TableHead>
                    <TableHead>Term 4</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daysOfWeek.map((day) => (
                    <TableRow key={day}>
                      <TableCell className="font-medium">{day}</TableCell>
                      {getTermsForDay(day).map((term, index) => (
                        <TableCell key={index} className="cursor-pointer hover:bg-gray-50" onClick={() => term && setSelectedTerm(term)}>
                          {term ? (
                            <>
                              {formatDate(term.start_date)} - {formatDate(term.end_date)}
                              <br />
                              <span className="text-sm text-gray-500">
                                ({term.number_of_weeks} wks)
                              </span>
                            </>
                          ) : (
                            'Not set'
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {selectedTerm && (
                <TermForm
                  type="edit"
                  defaultValues={selectedTerm}
                  termId={selectedTerm.id}
                  onSuccess={fetchTerms}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 