'use client';

import { useState } from 'react';
import { Plus, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomersTable } from '@/components/customers/customers-table';
import { CustomerModal } from '@/components/customers/customer-modal';
import { MarketingModal } from '@/components/customers/marketing-modal';
import { NewCustomerWizard } from '@/components/customers/new-customer-wizard';
import { BlockCustomerModal } from '@/components/customers/block-customer-modal';
import { UnblockCustomerModal } from '@/components/customers/unblock-customer-modal';
import { useToast } from '@/hooks/use-toast';
import { createBrowserClient } from '@/lib/supabase/client';
import { usePermissions } from '@/components/providers/permission-provider';
import { blockCustomer, unblockCustomer } from '@/app/actions/customer';

export default function CustomersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  
  const supabase = createBrowserClient();

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setIsWizardOpen(true);
  };

  const handleBlockCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setIsBlockModalOpen(true);
  };

  const handleUnblockCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setIsUnblockModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            surname: data.surname,
            first_name: data.firstName,
            street_number: data.streetNumber,
            street_name: data.streetName,
            suburb: data.suburb,
            post_code: data.postCode,
            contact_no: data.contactNo,
            email: data.email,
            country_of_birth: data.countryOfBirth,
            date_of_birth: data.dateOfBirth,
            work_mobile: data.workMobile,
            paq_form: data.paqForm,
            australian_citizen: data.australianCitizen,
            language_other_than_english: data.languageOtherThanEnglish,
            english_proficiency: data.englishProficiency,
            indigenous_status: data.indigenousStatus,
            reason_for_class: data.reasonForClass,
            how_did_you_hear: data.howDidYouHear,
            occupation: data.occupation,
            next_of_kin_name: data.nextOfKinName,
            next_of_kin_relationship: data.nextOfKinRelationship,
            next_of_kin_mobile: data.nextOfKinMobile,
            next_of_kin_phone: data.nextOfKinPhone,
            equipment_purchased: data.equipmentPurchased,
            status: data.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedCustomer.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Customer updated successfully',
        });
      }

      setIsModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleWizardComplete = () => {
    toast({
      title: 'Success',
      description: 'Customer created successfully',
    });
    setRefreshKey(prev => prev + 1);
  };

  const handleSendMarketing = async (message: string) => {
    try {
      toast({
        title: 'Success',
        description: `Marketing email sent to ${selectedCustomers.length} customers`,
      });
      setIsMarketingModalOpen(false);
      setSelectedCustomers([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleBlockCustomerSubmit = async (note: string) => {
    try {
      if (selectedCustomer) {
        const result = await blockCustomer(selectedCustomer.id, note);
        
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Customer blocked successfully and login disabled',
          });
        } else {
          throw new Error(result.error || 'Failed to block customer');
        }
      }

      setIsBlockModalOpen(false);
      setSelectedCustomer(null);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUnblockCustomerSubmit = async () => {
    try {
      if (selectedCustomer) {
        const result = await unblockCustomer(selectedCustomer.id);
        
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Customer unblocked successfully and login enabled',
          });
        } else {
          throw new Error(result.error || 'Failed to unblock customer');
        }
      }

      setIsUnblockModalOpen(false);
      setSelectedCustomer(null);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const canCreate = hasPermission('customer_create');
  const canEdit = hasPermission('customer_update');
  const canRead = hasPermission('customer_read');
  const canBlock = hasPermission('customer_block');

  if (!canRead) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage customers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <div className="flex gap-2">
          {canRead && selectedCustomers.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsMarketingModalOpen(true)}
            >
              Send Marketing Email
            </Button>
          )}
          {canCreate && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {canRead && (
        <CustomersTable
          onEdit={canEdit ? handleEdit : undefined}
          onBlock={canBlock ? handleBlockCustomer : undefined}
          onUnblock={canBlock ? handleUnblockCustomer : undefined}
          refreshKey={refreshKey}
          selectedCustomers={selectedCustomers}
          onSelectedCustomersChange={setSelectedCustomers}
        />            
      )}
      

      {canEdit && (
        <CustomerModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          customer={selectedCustomer}
          onSubmit={handleSubmit}
        />
      )}

      {canCreate && (
        <NewCustomerWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          onComplete={handleWizardComplete}
        />
      )}

      <MarketingModal
        open={isMarketingModalOpen}
        onOpenChange={setIsMarketingModalOpen}
        onSubmit={handleSendMarketing}
        selectedCount={selectedCustomers.length}
      />

      {canBlock && (
        <>
          <BlockCustomerModal
            open={isBlockModalOpen}
            onOpenChange={setIsBlockModalOpen}
            customer={selectedCustomer}
            onSubmit={handleBlockCustomerSubmit}
          />
          <UnblockCustomerModal
            open={isUnblockModalOpen}
            onOpenChange={setIsUnblockModalOpen}
            customer={selectedCustomer}
            onSubmit={handleUnblockCustomerSubmit}
          />
        </>
      )}
    </div>
  );
}