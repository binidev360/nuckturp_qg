import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    // Get all active conditional notifications
    const { data: rules, error: rulesErr } = await supabase
      .from("conditional_notifications")
      .select("*")
      .eq("active", true);

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No active rules" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all profiles
    // Fetch profiles with fields needed for all triggers and placeholder interpolation
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, created_at, updated_at, tags, blog_enabled, display_name, nickname, bio, slug, experience_level, session_frequency, favorite_systems, favorite_vtts, preferred_days, notification_preferences, preferred_push_hour");

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin user IDs from user_roles
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminUserIds = new Set((adminRoles || []).map((r: any) => r.user_id));
    // Enrich profiles with is_admin from user_roles
    const enrichedProfiles = profiles.map((p: any) => ({ ...p, is_admin: adminUserIds.has(p.user_id) }));

    // Build profile lookup map for placeholder interpolation
    const profileByUserId: Record<string, any> = {};
    enrichedProfiles.forEach((p: any) => { profileByUserId[p.user_id] = p; });

    // Fetch blog author slugs for {{blog_url}} placeholder
    const { data: blogAuthors } = await supabase
      .from("blog_authors")
      .select("profile_id, slug");
    // Map profile slug → blog author slug (via profile_id matching)
    const { data: profileIdRows } = await supabase
      .from("profiles")
      .select("id, user_id");
    const userIdByProfileId: Record<string, string> = {};
    (profileIdRows || []).forEach((pr: any) => { userIdByProfileId[pr.id] = pr.user_id; });
    const blogSlugByUserId: Record<string, string> = {};
    (blogAuthors || []).forEach((ba: any) => {
      if (ba.profile_id) {
        const userId = userIdByProfileId[ba.profile_id];
        if (userId) blogSlugByUserId[userId] = ba.slug;
      }
    });

    // Fetch user emails for {{email}} placeholder
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 10000 });
    const emailByUserId: Record<string, string> = {};
    (authUsers?.users || []).forEach((u: any) => { emailByUserId[u.id] = u.email || ""; });

    // Get memberships for tenant lookups
    const { data: memberships } = await supabase
      .from("memberships")
      .select("user_id, tenant_id");
    const tenantByUser: Record<string, string> = {};
    (memberships || []).forEach((m: any) => { tenantByUser[m.user_id] = m.tenant_id; });

    // Get existing logs to avoid duplicate sends
    const { data: existingLogs } = await supabase
      .from("conditional_notification_logs")
      .select("conditional_notification_id, user_id");
    const sentSet = new Set(
      (existingLogs || []).map((l: any) => `${l.conditional_notification_id}:${l.user_id}`)
    );

    const now = new Date();
    let totalSent = 0;

    for (const rule of rules) {
      // Evaluate which users match this condition
      const matchingUserIds = await evaluateCondition(supabase, rule, enrichedProfiles, tenantByUser, now);

      // Filter by audience
      const filteredUserIds = filterByAudience(rule.target_audience, matchingUserIds, enrichedProfiles);

      // Filter by user notification preferences (opt-out)
      const category = rule.notification_category || "sistema";
      const prefFilteredIds = category === "sistema"
        ? filteredUserIds // "sistema" category cannot be opted out
        : filteredUserIds.filter((uid) => {
          const profile = profileByUserId[uid];
          if (!profile) return true;
          const prefs = profile.notification_preferences || {};
          return prefs[category] !== false; // default = opted in
        });

      // Filter out already-sent users
      const newUserIds = prefFilteredIds.filter(
        (uid) => !sentSet.has(`${rule.id}:${uid}`)
      );

      if (newUserIds.length === 0) continue;

      // Calculate scheduled_for based on delay
      const delayMs = getDelayMs(rule.delay_value, rule.delay_unit);
      const scheduledFor = new Date(now.getTime() + delayMs);

      // If delay is 0 or scheduled time is now/past, send immediately
      const shouldSendNow = delayMs === 0 || scheduledFor <= now;

      // Create logs
      const logRows = newUserIds.map((uid) => ({
        conditional_notification_id: rule.id,
        user_id: uid,
        scheduled_for: scheduledFor.toISOString(),
        status: shouldSendNow ? "sent" : "pending",
        sent_at: shouldSendNow ? now.toISOString() : null,
      }));

      for (let i = 0; i < logRows.length; i += 500) {
        await supabase.from("conditional_notification_logs").insert(logRows.slice(i, i + 500));
      }

      // Send push + in-app notifications for immediate ones
      if (shouldSendNow) {
        await sendNotifications(supabase, rule, newUserIds, profileByUserId, blogSlugByUserId, emailByUserId);
        totalSent += newUserIds.length;
      }
    }

    // Also process pending logs that are now due
    const pendingSent = await processPendingLogs(supabase, rules, now, profileByUserId, blogSlugByUserId, emailByUserId);

    return new Response(
      JSON.stringify({
        processed: rules.length,
        new_sends: totalSent,
        pending_processed: pendingSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-conditional-notifications error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- Condition evaluators ----

async function evaluateCondition(
  supabase: any,
  rule: any,
  profiles: any[],
  tenantByUser: Record<string, string>,
  now: Date
): Promise<string[]> {
  const condition = rule.trigger_condition;

  switch (condition) {
    case "signed_up": {
      // All users (triggered once on signup)
      return profiles.map((p) => p.user_id);
    }

    case "first_campaign": {
      // Users who have at least 1 campaign
      const tenantIds = Object.values(tenantByUser);
      if (tenantIds.length === 0) return [];
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("tenant_id")
        .in("tenant_id", tenantIds);
      const tenantsWithCampaign = new Set((campaigns || []).map((c: any) => c.tenant_id));
      return profiles
        .filter((p) => tenantsWithCampaign.has(tenantByUser[p.user_id]))
        .map((p) => p.user_id);
    }

    case "first_session_done": {
      // Users who have at least 1 session with status = 'done'
      const tenantIds = Object.values(tenantByUser);
      if (tenantIds.length === 0) return [];
      const { data: sessions } = await supabase
        .from("sessions")
        .select("tenant_id")
        .eq("status", "done")
        .in("tenant_id", tenantIds);
      const tenantsWithDone = new Set((sessions || []).map((s: any) => s.tenant_id));
      return profiles
        .filter((p) => tenantsWithDone.has(tenantByUser[p.user_id]))
        .map((p) => p.user_id);
    }

    case "subscribed_premium": {
      // Users with active premium override or stripe subscription
      const { data: overrides } = await supabase
        .from("premium_overrides")
        .select("user_id, starts_at, ends_at");
      const premiumUsers = new Set<string>();
      (overrides || []).forEach((o: any) => {
        if (new Date(o.starts_at) <= now && (!o.ends_at || new Date(o.ends_at) >= now)) {
          premiumUsers.add(o.user_id);
        }
      });
      return profiles
        .filter((p) => premiumUsers.has(p.user_id))
        .map((p) => p.user_id);
    }

    case "inactive_7d":
    case "inactive_15d":
    case "inactive_30d": {
      const days = condition === "inactive_7d" ? 7 : condition === "inactive_15d" ? 15 : 30;
      const threshold = new Date(now.getTime() - days * 86400000);
      return profiles
        .filter((p) => new Date(p.updated_at) < threshold)
        .map((p) => p.user_id);
    }

    case "streak_7d":
    case "streak_15d":
    case "streak_30d": {
      // Simplified: users whose profile updated_at is within the last day
      // (meaning they've been active recently) and account age >= streak days
      const days = condition === "streak_7d" ? 7 : condition === "streak_15d" ? 15 : 30;
      const minAge = new Date(now.getTime() - days * 86400000);
      const recentThreshold = new Date(now.getTime() - 2 * 86400000); // active in last 2 days
      return profiles
        .filter((p) =>
          new Date(p.created_at) <= minAge &&
          new Date(p.updated_at) >= recentThreshold
        )
        .map((p) => p.user_id);
    }

    case "blog_activated": {
      // Users who enabled their personal blog
      return profiles
        .filter((p) => p.blog_enabled === true)
        .map((p) => p.user_id);
    }

    case "first_post_published": {
      // Users who have at least 1 published post linked to their blog_author
      const { data: authors } = await supabase
        .from("blog_authors")
        .select("id, profile_id");
      if (!authors || authors.length === 0) return [];

      // Map profile_id to blog_author_id
      const profileToAuthor: Record<string, string> = {};
      const authorIds: string[] = [];
      for (const a of authors) {
        if (a.profile_id) {
          profileToAuthor[a.profile_id] = a.id;
          authorIds.push(a.id);
        }
      }

      if (authorIds.length === 0) return [];

      const { data: posts } = await supabase
        .from("posts")
        .select("blog_author_id")
        .eq("status", "published")
        .in("blog_author_id", authorIds);

      const authorsWithPost = new Set((posts || []).map((p: any) => p.blog_author_id));

      // Build profile_id set from profiles
      const profileIdByUser: Record<string, string> = {};
      for (const p of profiles) {
        // profile_id in profiles table is the 'id' column (different from user_id)
        // We need to match via a lookup
      }

      // Fetch profile ids for matching
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, user_id")
        .in("user_id", profiles.map((p: any) => p.user_id));

      const userByProfileId: Record<string, string> = {};
      (profileRows || []).forEach((pr: any) => { userByProfileId[pr.id] = pr.user_id; });

      return Object.entries(profileToAuthor)
        .filter(([profileId, authorId]) => authorsWithPost.has(authorId))
        .map(([profileId]) => userByProfileId[profileId])
        .filter(Boolean) as string[];
    }

    case "reached_5_sessions": {
      // Tenants with ≥5 sessions with status = 'done'
      const tenantIds = Object.values(tenantByUser);
      if (tenantIds.length === 0) return [];
      const { data: sessions } = await supabase
        .from("sessions")
        .select("tenant_id")
        .eq("status", "done")
        .in("tenant_id", tenantIds);

      // Count sessions per tenant
      const countByTenant: Record<string, number> = {};
      (sessions || []).forEach((s: any) => {
        countByTenant[s.tenant_id] = (countByTenant[s.tenant_id] || 0) + 1;
      });

      return profiles
        .filter((p) => (countByTenant[tenantByUser[p.user_id]] || 0) >= 5)
        .map((p) => p.user_id);
    }

    case "incomplete_profile_7d": {
      // Users registered ≥7 days ago with incomplete profile
      // Incomplete = missing any of: display_name, nickname, bio, slug,
      //   experience_level, session_frequency, favorite_systems (empty), preferred_days (empty)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      return profiles
        .filter((p) => {
          if (new Date(p.created_at) > sevenDaysAgo) return false; // too new
          const hasFavSystems = Array.isArray(p.favorite_systems) && p.favorite_systems.length > 0;
          const hasPrefDays = Array.isArray(p.preferred_days) && p.preferred_days.length > 0;
          const isIncomplete =
            !p.display_name ||
            !p.nickname ||
            !p.bio ||
            !p.slug ||
            !p.experience_level ||
            !p.session_frequency ||
            !hasFavSystems ||
            !hasPrefDays;
          return isIncomplete;
        })
        .map((p) => p.user_id);
    }

    default:
      return [];
  }
}

function filterByAudience(
  audiences: string[],
  userIds: string[],
  profiles: any[]
): string[] {
  if (!audiences || audiences.length === 0 || audiences.includes("all")) {
    return userIds;
  }

  const userIdSet = new Set(userIds);
  const profileMap: Record<string, any> = {};
  profiles.forEach((p) => { profileMap[p.user_id] = p; });

  return userIds.filter((uid) => {
    const profile = profileMap[uid];
    if (!profile) return false;
    if (audiences.includes("admin") && profile.is_admin) return true;
    if (audiences.includes("blog_active") && profile.blog_enabled) return true;
    if (audiences.includes("commissioned_master") && (profile.commissioned_master === "yes" || profile.commissioned_master === "yes_fulltime")) return true;
    // "premium" and "free" would need stripe check - simplified here
    if (audiences.includes("free") || audiences.includes("premium")) return true;
    return false;
  });
}

function getDelayMs(value: number, unit: string): number {
  switch (unit) {
    case "minute": return value * 60 * 1000;
    case "hour": return value * 3600 * 1000;
    case "day": return value * 86400 * 1000;
    default: return 0;
  }
}

// ---- Placeholder interpolation ----
// Supported: {{nickname}}, {{display_name}}, {{profile_url}}, {{blog_url}}, {{email}}

const SITE_URL = "https://nuckturp.com.br";

function interpolatePlaceholders(
  text: string,
  userId: string,
  profileByUserId: Record<string, any>,
  blogSlugByUserId: Record<string, string>,
  emailByUserId: Record<string, string>
): string {
  const profile = profileByUserId[userId];
  if (!profile) return text;

  const nickname = profile.nickname || "Mestre";
  const displayName = profile.display_name || nickname;
  const slug = profile.slug || "";
  const profileUrl = slug ? `${SITE_URL}/m/${slug}` : `${SITE_URL}/perfil`;
  const blogSlug = blogSlugByUserId[userId] || "";
  const blogUrl = blogSlug ? `${SITE_URL}/blog/${blogSlug}` : "";
  const email = emailByUserId[userId] || "";

  return text
    .replace(/\{\{nickname\}\}/g, nickname)
    .replace(/\{\{display_name\}\}/g, displayName)
    .replace(/\{\{profile_url\}\}/g, profileUrl)
    .replace(/\{\{blog_url\}\}/g, blogUrl)
    .replace(/\{\{email\}\}/g, email);
}

function hasPlaceholders(text: string): boolean {
  return /\{\{(nickname|display_name|profile_url|blog_url|email)\}\}/.test(text);
}

// ---- Smart timing: calcula horário ideal de envio para cada usuário ----
// Horário padrão fallback: 19h (UTC-3, horário típico de RPG)
const DEFAULT_PUSH_HOUR = 19;
// Quiet hours: nunca envia entre 23h-7h
const QUIET_START = 23;
const QUIET_END = 7;

function calculateScheduledPushTime(
  preferredHour: number | null,
  nowUtc: Date
): Date {
  // Hora atual em UTC-3
  const utcOffset = -3;
  const nowLocalHour = (nowUtc.getUTCHours() + utcOffset + 24) % 24;
  const targetHour = preferredHour ?? DEFAULT_PUSH_HOUR;

  // Se o horário alvo é agora ou já passou hoje, agenda para amanhã
  // Exceto se estiver em quiet hours
  let effectiveHour = targetHour;
  if (effectiveHour >= QUIET_START || effectiveHour < QUIET_END) {
    effectiveHour = DEFAULT_PUSH_HOUR; // fallback para 19h se preferência está em quiet hours
  }

  // Calcula a diferença em horas
  let hoursUntilTarget = effectiveHour - nowLocalHour;
  if (hoursUntilTarget <= 0) {
    hoursUntilTarget += 24; // agenda para amanhã
  }

  // Se o horário alvo é dentro de 1 hora, envia agora (não atrasar muito)
  if (hoursUntilTarget <= 1 || (nowLocalHour >= QUIET_END && nowLocalHour < QUIET_START && hoursUntilTarget >= 23)) {
    return nowUtc;
  }

  return new Date(nowUtc.getTime() + hoursUntilTarget * 3600 * 1000);
}

// ---- Send notifications (in-app + push via smart queue) ----

async function sendNotifications(
  supabase: any,
  rule: any,
  userIds: string[],
  profileByUserId: Record<string, any> = {},
  blogSlugByUserId: Record<string, string> = {},
  emailByUserId: Record<string, string> = {}
) {
  const bodyHasPlaceholders = hasPlaceholders(rule.body);
  const nameHasPlaceholders = hasPlaceholders(rule.name);
  const linkHasPlaceholders = rule.link_url ? hasPlaceholders(rule.link_url) : false;
  const needsPersonalization = bodyHasPlaceholders || nameHasPlaceholders || linkHasPlaceholders;
  const now = new Date();

  if (needsPersonalization) {
    // Personalized: create one notification per user with interpolated body/link
    for (const uid of userIds) {
      const personalBody = interpolatePlaceholders(rule.body, uid, profileByUserId, blogSlugByUserId, emailByUserId);
      const personalName = interpolatePlaceholders(rule.name, uid, profileByUserId, blogSlugByUserId, emailByUserId);
      const personalLink = rule.link_url
        ? interpolatePlaceholders(rule.link_url, uid, profileByUserId, blogSlugByUserId, emailByUserId)
        : null;

      const { data: notif, error: notifErr } = await supabase
        .from("notifications")
        .insert({
          title: personalName,
          body: personalBody,
          link_url: personalLink,
          type: "info",
          target_audience: "all",
          created_by: rule.created_by,
          status: "published",
          published_at: now.toISOString(),
          sent_count: 1,
        })
        .select("id")
        .single();

      if (notifErr || !notif) {
        console.error("Failed to create personalized notification:", notifErr);
        continue;
      }

      // In-app notification
      await supabase.from("user_notifications").insert({ notification_id: notif.id, user_id: uid });

      // Queue push with smart timing (instead of sending immediately)
      const profile = profileByUserId[uid];
      const preferredHour = profile?.preferred_push_hour ?? null;
      const scheduledFor = calculateScheduledPushTime(preferredHour, now);

      await supabase.from("pending_push_queue").insert({
        user_id: uid,
        notification_id: notif.id,
        title: personalName,
        body: personalBody,
        url: personalLink || "/dashboard",
        image_url: null,
        scheduled_for: scheduledFor.toISOString(),
        status: "pending",
      });
    }
  } else {
    // No placeholders — single shared notification (efficient)
    const { data: notif, error: notifErr } = await supabase
      .from("notifications")
      .insert({
        title: rule.name,
        body: rule.body,
        link_url: rule.link_url || null,
        type: "info",
        target_audience: "all",
        created_by: rule.created_by,
        status: "published",
        published_at: now.toISOString(),
        sent_count: userIds.length,
      })
      .select("id")
      .single();

    if (notifErr || !notif) {
      console.error("Failed to create notification record:", notifErr);
      return;
    }

    // Create user_notifications for in-app bell
    const rows = userIds.map((uid) => ({
      notification_id: notif.id,
      user_id: uid,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await supabase
        .from("user_notifications")
        .upsert(rows.slice(i, i + 500), { onConflict: "notification_id,user_id", ignoreDuplicates: true });
    }

    // Queue push for each user with smart timing
    const pushRows = userIds.map((uid) => {
      const profile = profileByUserId[uid];
      const preferredHour = profile?.preferred_push_hour ?? null;
      const scheduledFor = calculateScheduledPushTime(preferredHour, now);
      return {
        user_id: uid,
        notification_id: notif.id,
        title: rule.name,
        body: rule.body,
        url: rule.link_url || "/dashboard",
        image_url: null,
        scheduled_for: scheduledFor.toISOString(),
        status: "pending",
      };
    });

    for (let i = 0; i < pushRows.length; i += 500) {
      await supabase.from("pending_push_queue").insert(pushRows.slice(i, i + 500));
    }
  }
}

// ---- Process pending logs that are now due ----

async function processPendingLogs(
  supabase: any,
  rules: any[],
  now: Date,
  profileByUserId: Record<string, any> = {},
  blogSlugByUserId: Record<string, string> = {},
  emailByUserId: Record<string, string> = {}
): Promise<number> {
  const { data: pendingLogs } = await supabase
    .from("conditional_notification_logs")
    .select("id, conditional_notification_id, user_id, scheduled_for")
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString());

  if (!pendingLogs || pendingLogs.length === 0) return 0;

  // Group by rule
  const byRule: Record<string, string[]> = {};
  const logIds: string[] = [];
  for (const log of pendingLogs) {
    if (!byRule[log.conditional_notification_id]) byRule[log.conditional_notification_id] = [];
    byRule[log.conditional_notification_id].push(log.user_id);
    logIds.push(log.id);
  }

  const ruleMap: Record<string, any> = {};
  rules.forEach((r) => { ruleMap[r.id] = r; });

  // Send for each rule group
  for (const [ruleId, userIds] of Object.entries(byRule)) {
    const rule = ruleMap[ruleId];
    if (rule) {
      await sendNotifications(supabase, rule, userIds, profileByUserId, blogSlugByUserId, emailByUserId);
    }
  }

  // Mark logs as sent
  for (let i = 0; i < logIds.length; i += 500) {
    await supabase
      .from("conditional_notification_logs")
      .update({ status: "sent", sent_at: now.toISOString() })
      .in("id", logIds.slice(i, i + 500));
  }

  return pendingLogs.length;
}
