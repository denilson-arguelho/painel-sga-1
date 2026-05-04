// Edge Function: proxy HTTPS -> SGA (HTTP ou HTTPS)
// Resolve o problema de Mixed Content: o navegador chama esta função em HTTPS
// e ela faz a requisição ao servidor SGA (mesmo que esteja em HTTP).
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, method = "GET", headers = {}, body } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Parâmetro 'url' obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bloqueia esquemas inseguros que não sejam http/https
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL deve usar http ou https" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...headers,
      },
      body: body ?? undefined,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Falha no proxy SGA",
        message: (err as Error).message,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
