// DUKA POS - M-Pesa C2B Validation
// Validates incoming C2B payment before Safaricom processes it

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  try {
    const body = await req.json();

    // Accept all payments — validation is done at confirmation stage
    // Could add checks here like: reject amounts < 1, reject from blocked numbers, etc.
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});
