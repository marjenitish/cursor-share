'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Loader2, 
  Plus, 
  X, 
  Mail, 
  Users, 
  FileText, 
  CreditCard, 
  Calendar, 
  User,
  Trash2,
  Edit,
  Check,
  AlertCircle
} from 'lucide-react';

const emailSchema = z.string().email('Invalid email address');

const emailingListSchema = z.object({
  enrollments: z.string().optional(),
  paq_forms: z.string().optional(),
  payments: z.string().optional(),
  class_cancellation: z.string().optional(),
  customer_profile_updates: z.string().optional(),
});

type EmailingListFormValues = z.infer<typeof emailingListSchema>;

interface EmailCategory {
  key: keyof EmailingListFormValues;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const emailCategories: EmailCategory[] = [
  {
    key: 'enrollments',
    label: 'Enrollments',
    description: 'Notifications for new enrollments and enrollment updates',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    key: 'paq_forms',
    label: 'PAQ Forms',
    description: 'Notifications for PAQ form submissions and reviews',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800'
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Notifications for payment processing and issues',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    key: 'class_cancellation',
    label: 'Class Cancellations',
    description: 'Notifications for class cancellations and schedule changes',
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-800'
  },
  {
    key: 'customer_profile_updates',
    label: 'Customer Profile Updates',
    description: 'Notifications when customers update their profiles',
    icon: <User className="h-4 w-4" />,
    color: 'bg-pink-100 text-pink-800'
  }
];

export default function EmailingListsPage() {
  const [emailingList, setEmailingList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('enrollments');
  const [editingEmail, setEditingEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const form = useForm<EmailingListFormValues>({
    resolver: zodResolver(emailingListSchema),
    defaultValues: {
      enrollments: '',
      paq_forms: '',
      payments: '',
      class_cancellation: '',
      customer_profile_updates: '',
    },
  });

  useEffect(() => {
    fetchEmailingList();
  }, []);

  const fetchEmailingList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emailing_list')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching emailing list:', error);
        toast({
          title: 'Error',
          description: 'Failed to load emailing list.',
          variant: 'destructive',
        });
        setEmailingList(null);
      } else if (data) {
        setEmailingList(data);
        form.reset({
          enrollments: data.enrollments?.join(', ') || '',
          paq_forms: data.paq_forms?.join(', ') || '',
          payments: data.payments?.join(', ') || '',
          class_cancellation: data.class_cancellation?.join(', ') || '',
          customer_profile_updates: data.customer_profile_updates?.join(', ') || '',
        });
      } else {
        setEmailingList(null);
        form.reset({
          enrollments: '',
          paq_forms: '',
          payments: '',
          class_cancellation: '',
          customer_profile_updates: '',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load emailing list.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getEmailsForCategory = (category: string): string[] => {
    return emailingList?.[category] || [];
  };

  const addEmailToCategory = async (category: string, email: string) => {
    if (!emailingList) return;

    try {
      const currentEmails = getEmailsForCategory(category);
      if (currentEmails.includes(email)) {
        toast({
          title: 'Email already exists',
          description: 'This email is already in the list.',
          variant: 'destructive',
        });
        return;
      }

      const updatedEmails = [...currentEmails, email];
      const updateData = { [category]: updatedEmails };

      const { error } = await supabase
        .from('emailing_list')
        .update(updateData)
        .eq('id', emailingList.id);

      if (error) throw error;

      setEmailingList({ ...emailingList, [category]: updatedEmails });
      setNewEmail('');
      setShowAddDialog(false);

      toast({
        title: 'Success',
        description: 'Email added successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeEmailFromCategory = async (category: string, email: string) => {
    if (!emailingList) return;

    try {
      const currentEmails = getEmailsForCategory(category);
      const updatedEmails = currentEmails.filter(e => e !== email);
      const updateData = { [category]: updatedEmails };

      const { error } = await supabase
        .from('emailing_list')
        .update(updateData)
        .eq('id', emailingList.id);

      if (error) throw error;

      setEmailingList({ ...emailingList, [category]: updatedEmails });

      toast({
        title: 'Success',
        description: 'Email removed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateEmailInCategory = async (category: string, oldEmail: string, newEmail: string) => {
    if (!emailingList) return;

    try {
      const currentEmails = getEmailsForCategory(category);
      const emailIndex = currentEmails.indexOf(oldEmail);
      
      if (emailIndex === -1) return;

      const updatedEmails = [...currentEmails];
      updatedEmails[emailIndex] = newEmail;
      
      const updateData = { [category]: updatedEmails };

      const { error } = await supabase
        .from('emailing_list')
        .update(updateData)
        .eq('id', emailingList.id);

      if (error) throw error;

      setEmailingList({ ...emailingList, [category]: updatedEmails });
      setEditingEmail('');

      toast({
        title: 'Success',
        description: 'Email updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) return;

    try {
      emailSchema.parse(newEmail);
      addEmailToCategory(activeTab, newEmail.trim());
    } catch (error) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEmail = (oldEmail: string, newEmail: string) => {
    if (!newEmail.trim()) return;

    try {
      emailSchema.parse(newEmail);
      updateEmailInCategory(activeTab, oldEmail, newEmail.trim());
    } catch (error) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
    }
  };

  const createEmailingList = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('emailing_list')
        .insert([{
          enrollments: [],
          paq_forms: [],
          payments: [],
          class_cancellation: [],
          customer_profile_updates: [],
        }])
        .select()
        .single();

      if (error) throw error;

      setEmailingList(data);
      toast({
        title: 'Success',
        description: 'Emailing list created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!emailingList) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Emailing Lists</h1>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">No Email List Found</h3>
              <p className="text-muted-foreground">
                Create your first emailing list to start managing notification recipients.
              </p>
              <Button onClick={createEmailingList} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> Create Email List</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Emailing Lists</h1>
        <Badge variant="outline">
          {Object.values(emailingList).filter(Array.isArray).reduce((total, emails) => total + emails.length, 0)} Total Emails
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {emailCategories.map((category) => (
            <TabsTrigger key={category.key} value={category.key} className="flex items-center gap-2">
              {category.icon}
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {emailCategories.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {category.icon}
                      {category.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  </div>
                  <Dialog open={showAddDialog && activeTab === category.key} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setActiveTab(category.key)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Email
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Email to {category.label}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="new-email">Email Address</Label>
                          <Input
                            id="new-email"
                            type="email"
                            placeholder="admin@example.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddEmail}>
                            Add Email
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getEmailsForCategory(category.key).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-8 w-8 mx-auto mb-2" />
                      <p>No emails configured for {category.label}</p>
                      <p className="text-sm">Add emails to receive notifications</p>
                    </div>
                  ) : (
                    getEmailsForCategory(category.key).map((email, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingEmail === email ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleUpdateEmail(email, newEmail)}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateEmail(email, newEmail)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingEmail('');
                                setNewEmail('');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEmail(email);
                                  setNewEmail(email);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeEmailFromCategory(category.key, email)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}