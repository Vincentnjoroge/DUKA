// DUKA POS - M-Pesa STK Push Edge Function
// Initiates Lipa Na M-Pesa Online (STK Push) payment request

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STKRequest {
  phone: string;
  amount: number;
  sale_id: string;
  receipt_number: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { phone, amount, sale_id, receipt_number } = (await req.json()) as STKRequest;

    // Validate inputs
    if (!phone || !amount || !sale_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone, amount, sale_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch M-Pesa credentials from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'mpesa_consumer_key',
        'mpesa_consumer_secret',
        'mpesa_shortcode',
        'mpesa_passkey',
        'mpesa_callback_url',
        'mpesa_environment',
      ]);

    const config: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      config[s.key] = s.value;
    });

    const isSandbox = config.mpesa_environment === 'sandbox';
    const baseUrl = isSandbox
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    // Step 1: Get OAuth token
    const authString = btoa(`${config.mpesa_consumer_key}:${config.mpesa_consumer_secret}`);
    const tokenRes = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${authString}` },
      }
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      // Log failure
      await supabase.from('audit_log').insert({
        action: 'mpesa_stk_token_failure',
        entity_type: 'sale',
        entity_id: sale_id,
        new_values: { error: tokenData },
      });
      return new Response(
        JSON.stringify({ error: 'Failed to obtain M-Pesa access token' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Generate password
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:\.Z]/g, '')
      .substring(0, 14);
    const password = btoa(`${config.mpesa_shortcode}${config.mpesa_passkey}${timestamp}`);

    // Step 3: Send STK Push
    const stkPayload = {
      BusinessShortCode: config.mpesa_shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount), // M-Pesa requires whole numbers
      PartyA: phone,
      PartyB: config.mpesa_shortcode,
      PhoneNumber: phone,
      CallBackURL: config.mpesa_callback_url,
      AccountReference: receipt_number || sale_id.substring(0, 12),
      TransactionDesc: `DUKA POS Payment - ${receipt_number}`,
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json();

    // Log every Daraja request (team insight: log all callbacks for reconciliation)
    await supabase.from('audit_log').insert({
      action: 'mpesa_stk_push_request',
      entity_type: 'sale',
      entity_id: sale_id,
      new_values: {
        checkout_request_id: stkData.CheckoutRequestID,
        merchant_request_id: stkData.MerchantRequestID,
        response_code: stkData.ResponseCode,
        phone,
        amount,
      },
    });

    if (stkData.ResponseCode === '0') {
      // Update sale with checkout request ID
      await supabase
        .from('sales')
        .update({
          mpesa_checkout_request_id: stkData.CheckoutRequestID,
          mpesa_phone: phone,
        })
        .eq('id', sale_id);

      return new Response(
        JSON.stringify({
          success: true,
          CheckoutRequestID: stkData.CheckoutRequestID,
          MerchantRequestID: stkData.MerchantRequestID,
          CustomerMessage: stkData.CustomerMessage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: stkData.errorMessage || stkData.ResponseDescription || 'STK Push failed',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Internal error: ${(error as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
