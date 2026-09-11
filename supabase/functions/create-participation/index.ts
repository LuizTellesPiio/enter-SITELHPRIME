import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Cliente Premiado LH Prime — criação de participação (somente administradores).
   O código público aleatório é gerado aqui, no servidor, nunca no frontend. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const serviceClient = (): SupabaseClient =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

const readJson = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const countDigits = (value: string): number =>
  value.split("").filter((char) => char >= "0" && char <= "9").length;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código público aleatório e não sequencial, ex.: LH-7K4P9X */
const generateCode = (length = 6): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `LH-${out}`;
};

/** Autorização administrativa no servidor: JWT válido + role = admin. */
const requireAdmin = async (
  req: Request,
): Promise<{ ok: true; supabase: SupabaseClient; userId: string } | { ok: false; response: Response }> => {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : header.trim();

  if (!token) return { ok: false, response: json({ error: "unauthorized" }, 401) };

  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("create-participation: token invalido", error?.message);
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("create-participation: falha ao ler profile", profileError.message);
  }

  if (profile?.role !== "admin") {
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }

  return { ok: true, supabase, userId: data.user.id };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  const body = await readJson(req);
  const customerName = String(body.customer_name ?? "").trim();
  const customerPhone = String(body.customer_phone ?? "").trim();
  const budgetReference = String(body.budget_reference ?? "").trim();
  const adminNotes = String(body.admin_notes ?? "").trim();
  const utmSource = body.utm_source ? String(body.utm_source).trim() : null;

  if (customerName.length < 2) {
    return json({ error: "invalid_name", message: "Informe o nome do cliente." }, 400);
  }
  if (countDigits(customerPhone) < 10) {
    return json({ error: "invalid_phone", message: "Informe o WhatsApp com DDD." }, 400);
  }

  let code = "";
  for (let attempt = 0; attempt < 12 && !code; attempt += 1) {
    const candidate = generateCode();
    const { data: existing, error } = await supabase
      .from("participations")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();

    if (error) {
      console.error("create-participation: falha ao checar codigo", error.message);
      return json({ error: "lookup_failed" }, 500);
    }
    if (!existing) code = candidate;
  }

  if (!code) {
    console.error("create-participation: nao foi possivel gerar codigo unico");
    return json({ error: "code_generation_failed" }, 500);
  }

  const { data, error } = await supabase
    .from("participations")
    .insert({
      code,
      customer_name: customerName,
      customer_phone: customerPhone,
      budget_reference: budgetReference,
      status: "LIBERADO",
      released_at: new Date().toISOString(),
      utm_source: utmSource,
      admin_notes: adminNotes,
      created_by: userId,
    })
    .select("id, code, customer_name, customer_phone, budget_reference, status, created_at, released_at")
    .single();

  if (error) {
    console.error("create-participation: falha no insert", error.message, error.code);
    return json({ error: "insert_failed", message: "Não foi possível criar a participação." }, 500);
  }

  console.log("create-participation: criada", data.code);
  return json({ participation: data });
});
