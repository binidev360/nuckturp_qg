import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Encoding helpers ----

function b64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b.length % 4)) % 4;
  const raw = atob(b + "=".repeat(pad));
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

// ---- VAPID JWT ----

async function createVapidJwt(
  audience: string,
  subject: string,
  privKeyB64: string,
  pubKeyB64: string
): Promise<string> {
  const enc = new TextEncoder();
  const pubRaw = b64urlDecode(pubKeyB64);
  const privRaw = b64urlDecode(privKeyB64);

  const x = b64url(pubRaw.slice(1, 33));
  const y = b64url(pubRaw.slice(33, 65));
  const d = b64url(privRaw);

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const unsigned = `${header}.${payload}`;

  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned))
  );

  return `${unsigned}.${b64url(sig)}`;
}

// ---- RFC 8291 Encryption ----

async function hkdfDeriveBytes(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  bits: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bits)
  );
}

async function encryptPayload(
  clientPubB64: string,
  clientAuthB64: string,
  payload: Uint8Array
): Promise<{ body: Uint8Array; localPubRaw: Uint8Array; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const clientPub = b64urlDecode(clientPubB64);
  const clientAuth = b64urlDecode(clientAuthB64);

  // Generate local ephemeral key pair
  const localPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localPair.publicKey));

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, localPair.privateKey, 256)
  );

  // Info for IKM derivation (RFC 8291 Section 3.3)
  const authInfo = concat(
    enc.encode("WebPush: info\0"),
    clientPub,
    localPubRaw
  );

  // IKM = HKDF(shared_secret, auth_secret, auth_info, 32)
  const ikm = await hkdfDeriveBytes(sharedSecret, clientAuth, authInfo, 256);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK and nonce
  const cekInfo = concat(enc.encode("Content-Encoding: aes128gcm\0"));
  const nonceInfo = concat(enc.encode("Content-Encoding: nonce\0"));

  const cek = await hkdfDeriveBytes(ikm, salt, cekInfo, 128);
  const nonce = await hkdfDeriveBytes(ikm, salt, nonceInfo, 96);

  // AES-128-GCM encrypt with padding delimiter
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const paddedPayload = concat(payload, new Uint8Array([2])); // delimiter byte
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload)
  );

  // aes128gcm header: salt(16) + rs(4) + idLen(1) + keyId(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([localPubRaw.length]), localPubRaw);

  return { body: concat(header, encrypted), localPubRaw, salt };
}

// ---- Send single push ----

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payloadJson: string,
  vapidPub: string,
  vapidPriv: string,
  vapidSubject: string
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createVapidJwt(audience, vapidSubject, vapidPriv, vapidPub);

  const { body } = await encryptPayload(sub.p256dh, sub.auth, new TextEncoder().encode(payloadJson));

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPub}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body,
  });

  return { ok: res.ok, status: res.status };
}

// ---- Main handler ----

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth: somente JWT de admin válido — service role key NÃO é aceito como auth de usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: u, error: ue } = await supabase.auth.getUser(token);
    if (ue || !u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: adminRole } = await supabase.from("user_roles").select("id").eq("user_id", u.user.id).eq("role", "admin").limit(1).single();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { notification_id, user_ids, title, body: msgBody, url, image } = body;

    // Limita batch a 500 usuários por chamada para evitar abuse/DoS
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 500) {
      return new Response(JSON.stringify({ error: "user_ids exceeds maximum batch size of 500" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPub = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "";

    if (!vapidPub || !vapidPriv) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RFC 8292: VAPID_SUBJECT deve ser mailto: ou https://
    if (!vapidSubject || !(/^(mailto:|https:\/\/)/.test(vapidSubject))) {
      console.error("VAPID_SUBJECT inválido — deve começar com mailto: ou https://");
      return new Response(JSON.stringify({ error: "VAPID subject misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build push payload
    let pushTitle = title || "QG do Mestre";
    let pushBody = msgBody || "";
    let pushUrl = url || "/dashboard";
    let pushImage = image || null;

    if (notification_id) {
      const { data: notif } = await supabase
        .from("notifications")
        .select("title, body, image_url, link_url")
        .eq("id", notification_id)
        .single();
      if (notif) {
        pushTitle = notif.title;
        pushBody = notif.body;
        pushUrl = notif.link_url || "/dashboard";
        pushImage = notif.image_url;
      }
    }

    const payloadJson = JSON.stringify({
      title: pushTitle,
      body: pushBody,
      url: pushUrl,
      image: pushImage,
      notification_id,
      tag: notification_id || "qg-push",
    });

    // Fetch subscriptions
    let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }
    const { data: subs } = await query;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        const r = await sendWebPush(sub, payloadJson, vapidPub, vapidPriv, vapidSubject);
        if (r.ok) { sent++; }
        else if (r.status === 404 || r.status === 410) { expired.push(sub.endpoint); failed++; }
        else { console.error(`Push ${sub.endpoint}: ${r.status}`); failed++; }
      } catch (e) {
        console.error(`Push error ${sub.endpoint}:`, e);
        failed++;
      }
    }

    // Cleanup expired
    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, expired_cleaned: expired.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
