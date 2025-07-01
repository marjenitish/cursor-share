'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';

const cancelSchema = z.object({
  paqDocument: z.any().optional(),
  consent: z.boolean().optional(),
  heartCondition: z.string().optional(),
  chestPain: z.string().optional(),
  dizziness: z.string().optional(),
  asthma: z.string().optional(),
  diabetes: z.string().optional(),
  muscleProblems: z.string().optional(),
  otherConditions: z.string().optional(),
  medicalClearance: z.string().optional(),
});

type PaqFormValues = z.infer<typeof cancelSchema>;

interface PAQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  onCancel: () => void;
}

export function PAQModal({
  open,
  onOpenChange,
  customerId,
  onCancel,
}: PAQModalProps) {
  const [uploading, setUploading] = useState(false);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const form = useForm<PaqFormValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: {
      consent: false,
      paqDocument: undefined,
    },
  });

  const questions = [
    {
      name: 'heartCondition' as const,
      label: 'Has your doctor ever told you that you have a heart condition or have you ever suffered a stroke?',
      description: 'Heart conditions include, but are not limited to: post myocardial infarction (heart attack), angina, coronary artery bypass, coronary angioplasty, heart failure, cardiomyopathy, heart transplant, pacemaker insertion, congenital heart disease, heart valve disease and peripheral artery disease',
    },
    {
      name: 'chestPain' as const,
      label: 'Do you ever experience unexplained pains in your chest at rest or during physical activity/exercise?',
      description: 'Any unexplained chest pain that feels like constriction, burning, knifelike pains and/or dull ache',
    },
    {
      name: 'dizziness' as const,
      label: 'Do you ever feel faint or have spells of dizziness during physical activity/exercise that causes you to lose balance?',
      description: 'Examples of dizziness may include, but are not limited to: lightheadedness or the feeling of nearly fainting, loss of balance or other sensations such as floating or swimming',
    },
    {
      name: 'asthma' as const,
      label: 'Have you had an asthma attack requiring immediate medical attention at any time over the last 12 months?',
      description: 'Medical attention refers to a medical practitioner or hospital visit following an asthma attack. It does not include the self administration of medications prescribed for asthma',
    },
    {
      name: 'diabetes' as const,
      label: 'If you have diabetes (type I or type II) have you had trouble controlling your blood glucose in the last 3 months?',
      description: 'Trouble controlling blood sugar refers to suffering from hyperglycaemia (high) or hypoglycaemia (low)',
    },
    {
      name: 'muscleProblems' as const,
      label: 'Do you have any diagnosed muscle, bone or joint problems that you have been told could be made worse by participating in physical activity/exercise?',
      description: 'Examples include, but not limited to: recent bone fracture/s, surgeries or injuries',
    },
    {
      name: 'otherConditions' as const,
      label: 'Do you have any other medical condition(s) or recent changes in your health status that may require special consideration for you to exercise?',
      description: 'Examples include, but not limited to: acute injury, epilepsy, transplants, cancer',
    },
    {
      name: 'medicalClearance' as const,
      label: 'Has Healthy Lifestyle asked you to provide a Medical Clearance since you last enrolled due to Leader or refund request?',
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSelected(file);
    }
  };

  const onSubmit = async (data: PaqFormValues) => {
    if (!customerId) {
      toast({
        title: 'Error',
        description: 'Customer ID is missing.',
        variant: 'destructive',
      });
      return;
    }

    // Check if PAQ document upload is required (when any question is answered "yes")
    const formValues = form.watch();
    const hasYesAnswer = questions.some(question => 
      formValues[question.name] === 'yes'
    );

    if (hasYesAnswer && !fileSelected) {
      console.log("TODO: PAQ document upload required when health questions are answered 'yes'");
      toast({
        title: 'Document Required',
        description: 'Please upload a PAQ document signed by your doctor.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasYesAnswer) {
      console.log("TODO: Handle submission when no health issues are reported");
      
      try {
        setUploading(true);
        
        // Update PAQ form as accepted when no health issues
        const { error: updateError } = await supabase
          .from('customers')
          .update({ 
            paq_status: 'accepted', 
            paq_filled_date: new Date().toISOString(), 
            paq_form: true 
          })
          .eq('id', customerId);

        if (updateError) throw updateError;

        toast({
          title: 'Submission Complete',
          description: 'Your PAQ form has been submitted successfully.',
        });
        onCancel();
        onOpenChange(false);
        window.location.reload();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
      return;
    }

    try {
      setUploading(true);

      let paqDocumentUrl = '';
      let fileName = '';

      // Upload medical certificate if provided
      if (fileSelected) {
        fileName = `paq_documents/${customerId}_${Date.now()}_${fileSelected.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('customers')
          .upload(fileName, fileSelected, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = await supabase.storage
          .from('customers')
          .getPublicUrl(fileName);

        paqDocumentUrl = urlData.publicUrl;
      }

      // Update PAQ form
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          paq_document_url: fileName,
          paq_status: 'pending',
          paq_filled_date: new Date().toISOString(),
          paq_form: true
        })
        .eq('id', customerId);

      if (updateError) throw updateError;

      toast({
        title: 'Customer PAQ uploaded successfully',
        description: 'Your Customer PAQ uploaded successfully for review.',
      });

      onCancel();
      onOpenChange(false);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1080px]">
        <ScrollArea className="h-[600px]">
          <DialogHeader>
            <DialogTitle>Upload PAQ</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {questions.map((question) => (
                <FormField
                  key={question.name}
                  control={form.control}
                  name={question.name}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{question.label}</FormLabel>
                      {question.description && (
                        <p className="text-sm text-muted-foreground">{question.description}</p>
                      )}
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                          disabled={false}
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="yes" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="no" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              {(() => {
                const formValues = form.watch();
                const hasYesAnswer = questions.some(question => 
                  formValues[question.name] === 'yes'
                );
                
                return hasYesAnswer ? (
                  <FormField
                    control={form.control}
                    name="paqDocument"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>PAQ Document (Signed By Doctor)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                handleFileChange(e);
                                onChange(e.target.files?.[0]);
                              }}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Upload doctor signed PAQ form to be eligible for enrollments.
                          Accepted formats: PDF, JPG, PNG.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null;
              })()}

              <Card className="p-6">
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={false}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I wish to enroll in the Healthy Lifestyle exercise classes and acknowledge that:
                        </FormLabel>
                        <ul className="text-sm text-muted-foreground list-disc pl-4 mt-2 space-y-1">
                          <li>I have completed this Pre-Exercise Questionnaire honestly and to the best of my knowledge</li>
                          <li>I will seek the advice of my medical Doctor, where indicated, regarding my suitability to participate in group-based exercise</li>
                          <li>I will inform the Exercise Leader should there be any change in my health status or medications which may affect my ability to participate</li>
                        </ul>
                      </div>
                    </FormItem>
                  )}
                />
              </Card>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading || !form.watch('consent')}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}