import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, ticket_id } = await req.json();

    // Init Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Placeholder: Connect to OpenAI and get embedding for the message
    // const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', { ... })
    // const [{ embedding }] = await embeddingResponse.json();

    // Placeholder: Perform similarity search using pgvector
    /*
    const { data: articles, error } = await supabase.rpc('match_support_articles', {
      query_embedding: embedding,
      match_threshold: 0.78,
      match_count: 5
    });
    */

    // Placeholder: Generate AI response using OpenAI based on the retrieved articles
    const aiResponseText = "This is a placeholder response from the AI support agent. I am not fully configured with an LLM yet, but I can answer product, billing, tracking, permissions, and setup questions once connected.";

    // Save AI response to support_messages if ticket_id is provided
    if (ticket_id) {
      await supabase.from('support_messages').insert({
        ticket_id,
        is_ai: true,
        message: aiResponseText,
      });
    }

    return new Response(
      JSON.stringify({ response: aiResponseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
