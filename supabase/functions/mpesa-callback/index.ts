// DUKA POS - M-Pesa STK Push Callback
// Receives payment confirmation/failure from Safaricom

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    // Log every callback for reconciliation (team insight)
    await supabase.from('audit_log').insert({
      action: 'mpesa_stk_callback',
      entity_type: 'mpesa',
      new_values: body,
    });

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    // Find the sale by CheckoutRequestID
    const { data: sale } = await supabase
      .from('sales')
      .select('id, status, payment_status')
      .eq('mpesa_checkout_request_id', CheckoutRequestID)
      .single();

    if (!sale) {
      // Log orphaned callback
      await supabase.from('audit_log').insert({
        action: 'mpesa_stk_callback_orphan',
        entity_type: 'sale',
        new_values: { CheckoutRequestID, ResultCode, message: 'No matching sale found' },
      });
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (ResultCode === 0) {
      // Payment successful — extract M-Pesa receipt
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      let mpesaRef = '';
      let amount = 0;
      let phone = '';

      for (const item of metadata) {
        if (item.Name === 'MpesaReceiptNumber') mpesaRef = item.Value;
        if (item.Name === 'Amount') amount = item.Value;
        if (item.Name === 'PhoneNumber') phone = String(item.Value);
      }

      await supabase
        .from('sales')
        .update({
          payment_status: 'completed',
          status: 'completed',
          mpesa_ref: mpesaRef,
          mpesa_phone: phone || undefined,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sale.id);

      await supabase.from('audit_log').insert({
        action: 'mpesa_stk_payment_success',
        entity_type: 'sale',
        entity_id: sale.id,
        new_values: { mpesa_ref: mpesaRef, amount, phone, CheckoutRequestID },
      });
    } else {
      // Payment failed
      await supabase
        .from('sales')
        .update({ payment_status: 'failed' })
        .eq('id', sale.id);

      await supabase.from('audit_log').insert({
        action: 'mpesa_stk_payment_failed',
        entity_type: 'sale',
        entity_id: sale.id,
        new_values: { ResultCode, ResultDesc, CheckoutRequestID },
      });
    }

    // Safaricom expects this response
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Must still return 200 to Safaricom
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
