'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function blockCustomer(customerId: string, note: string) {
  try {
    const supabase = createServerClient();

    // First, get the user_id associated with this customer
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('user_id')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // Update customer record
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        status: 'blocked',
        block_note: note,
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (updateError) throw updateError;

    // If customer has a user_id, disable their auth account
    if (customerData?.user_id) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        customerData.user_id,
        { user_metadata: { disabled: true, disabled_reason: note } }
      );

      if (authError) {
        console.warn('Failed to disable auth account:', authError);
        // Don't throw error here as customer is already blocked in the database
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error blocking customer:', error);
    return { success: false, error: error.message };
  }
}

export async function unblockCustomer(customerId: string) {
  try {
    const supabase = createServerClient();

    // First, get the user_id associated with this customer
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('user_id')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // Update customer record
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        status: 'active',
        block_note: null,
        blocked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (updateError) throw updateError;

    // If customer has a user_id, enable their auth account
    if (customerData?.user_id) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        customerData.user_id,
        { user_metadata: { disabled: false, disabled_reason: null } }
      );

      if (authError) {
        console.warn('Failed to enable auth account:', authError);
        // Don't throw error here as customer is already unblocked in the database
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error unblocking customer:', error);
    return { success: false, error: error.message };
  }
} 