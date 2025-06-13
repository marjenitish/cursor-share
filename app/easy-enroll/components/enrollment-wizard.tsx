'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentForm } from '@/components/enrollment/payment-form';
import { createBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { EnrollmentInfo } from './enrollment-info';
import type { Session } from '../page';

export type EnrollmentSessionData = {
    session_id: string;
    enrollment_type: 'full' | 'trial' | 'partial';
    trial_date?: string;
    partial_dates?: string[];
    fee_amount: number;
    session_details: {
        name: string;
        code: string;
        day_of_week: string;
        start_time: string;
        end_time?: string;
        venue_id: string;
        instructor_id: string;
        exercise_type_id: string;
        term_id: string;
    };
};

type EnrollmentWizardProps = {
    isOpen: boolean;
    onClose: () => void;
    selectedSessions: Session[];
    totalAmount: number;
    enrollmentSessionsData: EnrollmentSessionData[];
};

const PAQ_QUESTIONS = [
  {
    id: 'heart_condition',
    question: 'Has your doctor ever told you that you have a heart condition or have you ever suffered a stroke?',
    description: 'Heart conditions include, but are not limited to: post myocardial infarction (heart attack), angina, coronary artery bypass, coronary angioplasty, heart failure, cardiomyopathy, heart transplant, pacemaker insertion, congenital heart disease, heart valve disease and peripheral artery disease'
  },
  {
    id: 'chest_pain',
    question: 'Do you ever experience unexplained pains in your chest at rest or during physical activity/exercise?',
    description: 'Any unexplained chest pain that feels like constriction, burning, knifelike pains and/or dull ache'
  },
  {
    id: 'dizziness',
    question: 'Do you ever feel faint or have spells of dizziness during physical activity/exercise that causes you to lose balance?',
    description: 'Examples of dizziness may include, but are not limited to: lightheadedness or the feeling of nearly fainting, loss of balance or other sensations such as floating or swimming'
  },
  {
    id: 'asthma',
    question: 'Have you had an asthma attack requiring immediate medical attention at any time over the last 12 months?',
    description: 'Medical attention refers to a medical practitioner or hospital visit following an asthma attack. It does not include the self administration of medications prescribed for asthma'
  },
  {
    id: 'diabetes',
    question: 'If you have diabetes (type I or type II) have you had trouble controlling your blood glucose in the last 3 months?',
    description: 'Trouble controlling blood sugar refers to suffering from hyperglycaemia (high) or hypoglycaemia (low)'
  },
  {
    id: 'joint_problems',
    question: 'Do you have any diagnosed muscle, bone or joint problems that you have been told could be made worse by participating in physical activity/exercise?',
    description: 'Examples include, but not limited to: recent bone fracture/s, surgeries or injuries'
  },
  {
    id: 'other_medical',
    question: 'Do you have any other medical condition(s) or recent changes in your health status that may require special consideration for you to exercise?',
    description: 'Examples include, but not limited to: acute injury, epilepsy, transplants, cancer'
  },
  {
    id: 'medical_clearance',
    question: 'Has Healthy Lifestyle asked you to provide a Medical Clearance since you last enrolled due to Leader or refund request?',
    description: ''
  }
];

export function EnrollmentWizard({ isOpen, onClose, selectedSessions, totalAmount, enrollmentSessionsData }: EnrollmentWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Customer form data
    id: '',
    surname: '',
    first_name: '',
    street_number: '',
    street_name: '',
    suburb: '',
    post_code: '',
    contact_no: '',
    email: '',
    country_of_birth: '',
    date_of_birth: '',
    work_mobile: '',
    australian_citizen: false,
    language_other_than_english: '',
    english_proficiency: '',
    indigenous_status: '',
    reason_for_class: '',
    how_did_you_hear: '',
    occupation: '',
    next_of_kin_name: '',
    next_of_kin_relationship: '',
    next_of_kin_mobile: '',
    next_of_kin_phone: '',
    equipment_purchased: [] as string[],
    
    // PAQ form data
    paq_answers: {} as Record<string, boolean>,
    medical_clearance_file: null as File | null,
  });

  const supabase = createBrowserClient();
  const { toast } = useToast();

  const handleFormDataUpdate = (data: any) => {
    setFormData(prev => ({
      ...prev,
      ...data
    }));
  };

  const handlePAQAnswer = (questionId: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      paq_answers: { ...prev.paq_answers, [questionId]: value }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, medical_clearance_file: file }));
    }
  };

  const handleSubmit = async () => {
    setStep(3);
    // try {
    //   // Create customer record
    //   const { data: customer, error: customerError } = await supabase
    //     .from('customers')
    //     .insert([{
    //       ...formData,
    //       paq_form: true,
    //       paq_filled_date: new Date().toISOString(),
    //       paq_status: Object.values(formData.paq_answers).some(answer => answer) ? 'Requires Medical Clearance' : 'Cleared'
    //     }])
    //     .select()
    //     .single();

    //   if (customerError) throw customerError;

    //   // Upload medical clearance if provided
    //   if (formData.medical_clearance_file) {
    //     const { error: uploadError } = await supabase.storage
    //       .from('medical-certificates')
    //       .upload(`${customer.id}/${formData.medical_clearance_file.name}`, formData.medical_clearance_file);

    //     if (uploadError) throw uploadError;

    //     // Update customer with document URL
    //     const { error: updateError } = await supabase
    //       .from('customers')
    //       .update({
    //         paq_document_url: `${customer.id}/${formData.medical_clearance_file.name}`
    //       })
    //       .eq('id', customer.id);

    //     if (updateError) throw updateError;
    //   }

    //   // Move to payment step
    //   setStep(3);
    // } catch (error) {
    //   console.error('Error submitting form:', error);
    //   toast({
    //     title: 'Error',
    //     description: 'Failed to submit form. Please try again.',
    //     variant: 'destructive'
    //   });
    // }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <EnrollmentInfo onFormDataUpdate={handleFormDataUpdate} />
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pre-Exercise Questionnaire</h3>
              <Button variant="outline" size="sm" asChild>
                <a href="https://pfoargdymscqqrekzref.supabase.co/storage/v1/object/public/medical-certificates//paq_form.pdf" target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download Form
                </a>
              </Button>
            </div>
            <div className="space-y-6">
              {PAQ_QUESTIONS.map((q) => (
                <div key={q.id} className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id={q.id}
                      checked={formData.paq_answers[q.id] || false}
                      onCheckedChange={(checked) => handlePAQAnswer(q.id, checked as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={q.id} className="font-medium">{q.question}</Label>
                      {q.description && (
                        <p className="text-sm text-muted-foreground">{q.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {Object.values(formData.paq_answers).some(answer => answer) && (
              <div className="space-y-2">
                <Label htmlFor="medical_clearance">Medical Clearance Form</Label>
                <Input
                  id="medical_clearance"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Please upload a signed medical clearance form from your doctor.
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSubmit}>Next</Button>
            </div>
          </div>
        );

      case 3:
        return (
          <PaymentForm
            selectedClasses={selectedSessions}
            enrollmentSessionsData={enrollmentSessionsData}
            enrollmentData={formData}
            enrollmentId=""
            onComplete={onClose}
            customer={formData}
          />
        );

      default:
        return null;
    }
  };

  console.log("enrollmentSessionsData", enrollmentSessionsData);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Enrollment Process</DialogTitle>
        </DialogHeader>
        <div className="mt-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
} 