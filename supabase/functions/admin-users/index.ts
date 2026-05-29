import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Get user from token (gateway already verified JWT)
    const token = req.headers.get("Authorization")!.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = user.id;

    // Check admin via user_roles table
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET actions
    if (req.method === "GET") {
      if (action === "list-all-tags") {
        const { data } = await supabase.rpc("admin_all_tags");
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "list-users") {
        const search = url.searchParams.get("search") || undefined;
        const page = Math.max(0, parseInt(url.searchParams.get("page") || "0"));
        const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") || "50")));
        const filterTag = url.searchParams.get("filter_tag") || undefined;
        const filterPremium = url.searchParams.get("filter_premium") || "all";
        const sortField = url.searchParams.get("sort_field") || "ranking";
        const sortDirection = url.searchParams.get("sort_direction") || "desc";

        // Determine is_admin and tag filters for the RPC
        let isAdminFilter: boolean | null = null;
        let tagFilter: string | null = null;
        if (filterTag === "_admin") {
          isAdminFilter = true;
        } else if (filterTag && filterTag !== "all") {
          tagFilter = filterTag;
        }

        // For premium/banned filters or post-enrichment sorting we need a larger window
        const needsPostFilter = filterPremium !== "all";
        const needsPostSort = sortField === "last_sign_in_at" || sortField === "storage_bytes";

        // If we need post-filtering/sorting, fetch a larger window
        const fetchLimit = (needsPostFilter || needsPostSort) ? 500 : pageSize;
        const fetchOffset = (needsPostFilter || needsPostSort) ? 0 : page * pageSize;

        // 1. Get count (for non-premium filters, use DB count)
        const { data: totalCountResult } = await supabase.rpc("admin_count_users", {
          _search: search || null,
          _is_admin: isAdminFilter,
          _tag: tagFilter,
        });
        const dbTotal = Number(totalCountResult) || 0;

        // 2. Get user profiles from RPC with server-side sorting
        const { data } = await supabase.rpc("admin_list_users", {
          _search: search || null,
          _limit: fetchLimit,
          _offset: fetchOffset,
          _is_admin: isAdminFilter,
          _tag: tagFilter,
          _sort_field: sortField,
          _sort_direction: sortDirection,
        });

        const pageUsers = data || [];
        if (pageUsers.length === 0) {
          return new Response(JSON.stringify({ users: [], total_count: 0, page, page_size: pageSize }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 3. Collect user_ids for targeted lookups
        const userIds: string[] = pageUsers.map((u: any) => u.user_id);

        // 4. Get auth user emails - fetch only the users we need
        const emailMap: Record<string, { email: string; last_sign_in_at: string | null }> = {};
        const authResults = await Promise.all(
          userIds.map(uid => supabase.auth.admin.getUserById(uid).catch(() => null))
        );
        for (const result of authResults) {
          const u = result?.data?.user;
          if (u) {
            emailMap[u.id] = { email: u.email || "", last_sign_in_at: u.last_sign_in_at || null };
          }
        }

        // 5. Get premium overrides
        const { data: overrides } = await supabase
          .from("premium_overrides")
          .select("user_id, starts_at, ends_at")
          .in("user_id", userIds);
        const overrideMap: Record<string, { starts_at: string; ends_at: string | null }> = {};
        (overrides || []).forEach((o: any) => { overrideMap[o.user_id] = { starts_at: o.starts_at, ends_at: o.ends_at }; });

        // 6. Get blog_enabled
        const { data: blogProfiles } = await supabase
          .from("profiles")
          .select("user_id, blog_enabled")
          .in("user_id", userIds);
        const blogEnabledMap: Record<string, boolean> = {};
        (blogProfiles || []).forEach((p: any) => { blogEnabledMap[p.user_id] = !!p.blog_enabled; });

        // 7. Check Stripe subscriptions
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
        const emailToStripe: Record<string, boolean> = {};
        let hasMoreSubs = true;
        let startingAfter: string | undefined;
        while (hasMoreSubs) {
          const params: any = { status: "active", limit: 100, expand: ["data.customer"] };
          if (startingAfter) params.starting_after = startingAfter;
          const subs = await stripe.subscriptions.list(params);
          for (const sub of subs.data) {
            const cust = sub.customer as any;
            if (cust?.email) {
              emailToStripe[cust.email.toLowerCase()] = true;
            }
          }
          hasMoreSubs = subs.has_more;
          if (subs.data.length > 0) startingAfter = subs.data[subs.data.length - 1].id;
        }

        // 8. Get banned emails
        const { data: bannedEmails } = await supabase.from("banned_emails").select("email, reason");
        const bannedMap: Record<string, string | null> = {};
        (bannedEmails || []).forEach((b: any) => { bannedMap[b.email.toLowerCase()] = b.reason || null; });

        // 9. Enrich users
        const enriched = pageUsers.map((u: any) => {
          const email = emailMap[u.user_id]?.email || "";
          const emailLower = email.toLowerCase();
          const ov = overrideMap[u.user_id];
          const now = new Date();
          const hasActiveOverride = ov && new Date(ov.starts_at) <= now && (!ov.ends_at || new Date(ov.ends_at) >= now);
          return {
            ...u,
            email,
            last_sign_in_at: emailMap[u.user_id]?.last_sign_in_at || null,
            premium_override: ov || null,
            has_active_override: !!hasActiveOverride,
            has_stripe_subscription: !!emailToStripe[emailLower],
            is_banned: emailLower in bannedMap,
            ban_reason: bannedMap[emailLower] ?? null,
            blog_enabled: blogEnabledMap[u.user_id] || false,
          };
        });

        // 10. Post-enrichment sorting for fields not available in the RPC
        let sortedEnriched = enriched;
        if (sortField === "last_sign_in_at" || sortField === "storage_bytes") {
          // For storage_bytes, fetch storage per user
          if (sortField === "storage_bytes") {
            const storageResults = await Promise.all(
              sortedEnriched.map((u: any) =>
                supabase.rpc("get_user_storage_bytes", { _user_id: u.user_id }).then(r => ({
                  user_id: u.user_id,
                  storage_bytes: (r.data as number) || 0,
                }))
              )
            );
            const storageMap: Record<string, number> = {};
            storageResults.forEach(s => { storageMap[s.user_id] = s.storage_bytes; });
            sortedEnriched = sortedEnriched.map((u: any) => ({ ...u, storage_bytes: storageMap[u.user_id] || 0 }));
          }

          const dir = sortDirection === "desc" ? -1 : 1;
          sortedEnriched.sort((a: any, b: any) => {
            let va: number, vb: number;
            if (sortField === "last_sign_in_at") {
              va = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
              vb = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
            } else {
              va = a.storage_bytes || 0;
              vb = b.storage_bytes || 0;
            }
            return (va - vb) * dir;
          });
        }

        // 11. Apply premium/banned post-filter if needed
        let finalUsers = sortedEnriched;
        let finalTotal = dbTotal;
        if (needsPostFilter) {
          finalUsers = sortedEnriched.filter((u: any) => {
            if (filterPremium === "premium_paid") return u.has_stripe_subscription;
            if (filterPremium === "premium_free") return u.has_active_override && !u.has_stripe_subscription;
            if (filterPremium === "free") return !u.has_stripe_subscription && !u.has_active_override && !u.is_banned;
            if (filterPremium === "banned") return u.is_banned;
            if (filterPremium === "blog_active") return u.blog_enabled;
            return true;
          });
          finalTotal = finalUsers.length;
          finalUsers = finalUsers.slice(page * pageSize, (page + 1) * pageSize);
        } else if (needsPostSort) {
          // We fetched a larger window for sorting, now paginate
          finalUsers = finalUsers.slice(page * pageSize, (page + 1) * pageSize);
        }

        return new Response(JSON.stringify({ users: finalUsers, total_count: finalTotal, page, page_size: pageSize }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ═══ RECOMPUTE ENGAGEMENT SCORES (manual trigger from admin) ═══
      if (action === "recompute-engagement") {
        // Fetch all data in parallel for batch computation
        const [
          { data: reProfs }, { data: reMembs }, { data: reCamps },
          { data: reSess }, { data: reNotes }, { data: reWbs },
          { data: rePlayers }, { data: rePcs },
          { data: reNpcRels }, { data: rePosts },
          { data: reAuthors }, { data: reProfilesFull },
        ] = await Promise.all([
          supabase.from("profiles").select("user_id"),
          supabase.from("memberships").select("user_id, tenant_id"),
          supabase.from("campaigns").select("id, tenant_id"),
          supabase.from("sessions").select("tenant_id"),
          supabase.from("notes").select("tenant_id"),
          supabase.from("whiteboards").select("tenant_id"),
          supabase.from("players").select("tenant_id"),
          supabase.from("player_campaigns").select("id, campaign_id"),
          supabase.from("character_relationships").select("player_campaign_id").eq("entity_type", "npc"),
          supabase.from("posts").select("blog_author_id").eq("status", "published"),
          supabase.from("blog_authors").select("id, profile_id"),
          supabase.from("profiles").select("id, user_id"),
        ]);

        // Build lookup maps
        const reTenantByUser: Record<string, string> = {};
        (reMembs || []).forEach((m: any) => { reTenantByUser[m.user_id] = m.tenant_id; });

        const reCountByTenant = (items: any[]) => {
          const m: Record<string, number> = {};
          (items || []).forEach((i: any) => { m[i.tenant_id] = (m[i.tenant_id] || 0) + 1; });
          return m;
        };
        const reCampCounts = reCountByTenant(reCamps || []);
        const reSessCounts = reCountByTenant(reSess || []);
        const reNoteCounts = reCountByTenant(reNotes || []);
        const reWbCounts = reCountByTenant(reWbs || []);
        const rePlCounts = reCountByTenant(rePlayers || []);

        const reCToT: Record<string, string> = {};
        (reCamps || []).forEach((c: any) => { reCToT[c.id] = c.tenant_id; });

        const reCharCounts: Record<string, number> = {};
        (rePcs || []).forEach((pc: any) => {
          const t = reCToT[pc.campaign_id]; if (t) reCharCounts[t] = (reCharCounts[t] || 0) + 1;
        });

        const rePcToC: Record<string, string> = {};
        (rePcs || []).forEach((pc: any) => { rePcToC[pc.id] = pc.campaign_id; });
        const reNpcCounts: Record<string, number> = {};
        (reNpcRels || []).forEach((n: any) => {
          const cId = rePcToC[n.player_campaign_id]; if (!cId) return;
          const t = reCToT[cId]; if (t) reNpcCounts[t] = (reNpcCounts[t] || 0) + 1;
        });

        const reProfIdToUser: Record<string, string> = {};
        (reProfilesFull || []).forEach((p: any) => { reProfIdToUser[p.id] = p.user_id; });
        const reAuthToUser: Record<string, string> = {};
        (reAuthors || []).forEach((a: any) => { if (a.profile_id) reAuthToUser[a.id] = reProfIdToUser[a.profile_id]; });
        const rePostByUser: Record<string, number> = {};
        (rePosts || []).forEach((p: any) => {
          const uid = reAuthToUser[p.blog_author_id]; if (uid) rePostByUser[uid] = (rePostByUser[uid] || 0) + 1;
        });

        // Build rows and batch upsert
        const reRows = (reProfs || []).map((profile: any) => {
          const uid = profile.user_id;
          const tid = reTenantByUser[uid] || "";
          const cc = reCampCounts[tid] || 0, sc = reSessCounts[tid] || 0;
          const nc = reNoteCounts[tid] || 0, wc = reWbCounts[tid] || 0;
          const plc = rePlCounts[tid] || 0, chc = reCharCounts[tid] || 0;
          const npc = reNpcCounts[tid] || 0, poc = rePostByUser[uid] || 0;
          return {
            user_id: uid, campaign_count: cc, session_count: sc, note_count: nc,
            whiteboard_count: wc, player_count: plc, character_count: chc,
            npc_count: npc, post_count: poc,
            ranking_score: cc*5 + sc*4 + plc*3 + chc*3 + poc*3 + npc*2 + nc*2 + wc,
            total_usage: cc + sc + nc + wc + plc + chc + npc,
            computed_at: new Date().toISOString(),
          };
        }).filter((r: any) => reTenantByUser[r.user_id]);

        let reUpdated = 0;
        for (let i = 0; i < reRows.length; i += 500) {
          const chunk = reRows.slice(i, i + 500);
          await supabase.from("user_engagement_scores").upsert(chunk, { onConflict: "user_id" });
          reUpdated += chunk.length;
        }

        return new Response(JSON.stringify({ updated: reUpdated, computed_at: new Date().toISOString() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }


      if (action === "stats") {
        // Query stats directly instead of RPC (service role doesn't set auth.uid())
        const [
          { count: totalUsers },
          { count: totalCampaigns },
          { count: totalSessions },
          { count: totalNotes },
          { count: totalWhiteboards },
          { count: totalWhiteboardItems },
          { count: totalFolders },
          { count: activeCampaigns },
          { count: totalPosts },
          { count: publishedPosts },
          { count: totalBlogAuthors },
          { count: onboardingCompleted },
          { count: totalAiUsage },
          { count: totalPlayers },
          { count: totalCharacters },
          { count: totalNpcs },
          { count: totalInventoryItems },
          { count: totalFavorites },
          { count: totalFollows },
          { count: totalDigestsSent },
          { count: totalFeedbackConfigs },
          { count: totalFeedbackResponses },
          { count: totalFeedbackViews },
          { count: totalBlogViews },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("campaigns").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("sessions").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("notes").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("whiteboards").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("whiteboard_items").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("folders").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active").then(r => ({ count: r.count || 0 })),
          supabase.from("posts").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").then(r => ({ count: r.count || 0 })),
          supabase.from("blog_authors").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_completed", true).then(r => ({ count: r.count || 0 })),
          supabase.from("ai_usage_logs").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("players").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("player_campaigns").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("character_relationships").select("*", { count: "exact", head: true }).eq("entity_type", "npc").then(r => ({ count: r.count || 0 })),
          supabase.from("character_inventory").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("favorites").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          // Follow system stats
          supabase.from("author_follows").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("reengagement_logs").select("*", { count: "exact", head: true }).ilike("email_type", "blog_digest:%").then(r => ({ count: r.count || 0 })),
          // Feedback stats
          supabase.from("session_feedback_configs").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("session_feedback_responses").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          supabase.from("feedback_view_events").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
          // Blog views (post_view_events)
          supabase.from("post_view_events").select("*", { count: "exact", head: true }).then(r => ({ count: r.count || 0 })),
        ]);

        const now = new Date();
        const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
        const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

        const [
          { count: usersLast7d },
          { count: usersLast30d },
          { count: campaignsLast30d },
          { count: notesLast30d },
          { count: sessionsLast30d },
          { count: postsLast30d },
          { count: aiUsageLast7d },
          { count: aiUsageLast30d },
          { count: whiteboardsLast30d },
          { count: playersLast30d },
          { count: charactersLast30d },
          { count: npcsLast30d },
          { count: followsLast30d },
          { count: blogViewsLast30d },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", d7).then(r => ({ count: r.count || 0 })),
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("campaigns").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("notes").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("sessions").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("ai_usage_logs").select("*", { count: "exact", head: true }).gte("created_at", d7).then(r => ({ count: r.count || 0 })),
          supabase.from("ai_usage_logs").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("whiteboards").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("players").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("player_campaigns").select("*", { count: "exact", head: true }).gte("joined_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("character_relationships").select("*", { count: "exact", head: true }).eq("entity_type", "npc").gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("author_follows").select("*", { count: "exact", head: true }).gte("created_at", d30).then(r => ({ count: r.count || 0 })),
          // Blog views last 30d
          supabase.from("post_view_events").select("*", { count: "exact", head: true }).gte("viewed_at", d30).then(r => ({ count: r.count || 0 })),
        ]);

        // Unique followers count (distinct user_id)
        const { data: followData } = await supabase.from("author_follows").select("user_id");
        const uniqueFollowers = new Set((followData || []).map((r: any) => r.user_id)).size;
        const { data: aiUsers } = await supabase.from("ai_usage_logs").select("user_id");
        const uniqueAiUsers = new Set((aiUsers || []).map((r: any) => r.user_id)).size;

        // Feedback avg NPS
        const { data: feedbackNpsData } = await supabase.from("session_feedback_responses").select("nps_score");
        const feedbackAvgNps = feedbackNpsData && feedbackNpsData.length > 0
          ? (feedbackNpsData as any[]).reduce((s: number, r: any) => s + r.nps_score, 0) / feedbackNpsData.length
          : 0;
        // Active feedback configs (currently open)
        const { count: activeFeedbackConfigs } = await supabase.from("session_feedback_configs").select("*", { count: "exact", head: true }).eq("active", true);
        // Feedback responses last 30d
        const { count: feedbackResponsesLast30d } = await supabase.from("session_feedback_responses").select("*", { count: "exact", head: true }).gte("created_at", d30);

        // Get experience level and session frequency distributions
        const { data: profilesData } = await supabase.from("profiles").select("experience_level, session_frequency");
        const experienceDistribution: Record<string, number> = {};
        const frequencyDistribution: Record<string, number> = {};
        for (const p of (profilesData || []) as any[]) {
          const exp = p.experience_level || "not_set";
          const freq = p.session_frequency || "not_set";
          experienceDistribution[exp] = (experienceDistribution[exp] || 0) + 1;
          frequencyDistribution[freq] = (frequencyDistribution[freq] || 0) + 1;
        }

        // ── Previous period (30-60 days ago) for temporal comparison ──
        const d60 = new Date(now.getTime() - 60 * 86400000).toISOString();
        const [
          { count: prevUsers },
          { count: prevCampaigns },
          { count: prevSessions },
          { count: prevNotes },
          { count: prevAiUsage },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", d60).lt("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("campaigns").select("*", { count: "exact", head: true }).gte("created_at", d60).lt("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("sessions").select("*", { count: "exact", head: true }).gte("created_at", d60).lt("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("notes").select("*", { count: "exact", head: true }).gte("created_at", d60).lt("created_at", d30).then(r => ({ count: r.count || 0 })),
          supabase.from("ai_usage_logs").select("*", { count: "exact", head: true }).gte("created_at", d60).lt("created_at", d30).then(r => ({ count: r.count || 0 })),
        ]);

        return new Response(JSON.stringify({
          total_users: totalUsers,
          total_campaigns: totalCampaigns,
          total_adventures: 0,
          total_sessions: totalSessions,
          total_notes: totalNotes,
          total_whiteboards: totalWhiteboards,
          total_whiteboard_items: totalWhiteboardItems,
          total_folders: totalFolders,
          active_campaigns: activeCampaigns,
          users_last_7d: usersLast7d,
          users_last_30d: usersLast30d,
          campaigns_last_30d: campaignsLast30d,
          notes_last_30d: notesLast30d,
          sessions_last_30d: sessionsLast30d,
          whiteboards_last_30d: whiteboardsLast30d,
          // New feature counts
          total_players: totalPlayers,
          total_characters: totalCharacters,
          total_npcs: totalNpcs,
          total_inventory_items: totalInventoryItems,
          total_favorites: totalFavorites,
          players_last_30d: playersLast30d,
          characters_last_30d: charactersLast30d,
          npcs_last_30d: npcsLast30d,
          // Blog stats
          total_posts: totalPosts,
          published_posts: publishedPosts,
          total_blog_authors: totalBlogAuthors,
          posts_last_30d: postsLast30d,
          // Onboarding
          onboarding_completed: onboardingCompleted,
          // AI usage
          total_ai_usage: totalAiUsage,
          ai_usage_last_7d: aiUsageLast7d,
          ai_usage_last_30d: aiUsageLast30d,
          unique_ai_users: uniqueAiUsers,
          // Profile demographics
          experience_distribution: experienceDistribution,
          frequency_distribution: frequencyDistribution,
          // Previous period comparison (30-60d ago)
          prev_users_30d: prevUsers,
          prev_campaigns_30d: prevCampaigns,
          prev_sessions_30d: prevSessions,
          prev_notes_30d: prevNotes,
          prev_ai_usage_30d: prevAiUsage,
          // Follow & Digest stats
          total_follows: totalFollows,
          unique_followers: uniqueFollowers,
          follows_last_30d: followsLast30d,
          total_digests_sent: totalDigestsSent,
          // Blog views
          total_blog_views: totalBlogViews,
          blog_views_last_30d: blogViewsLast30d,
          // Feedback stats
          total_feedback_configs: totalFeedbackConfigs,
          total_feedback_responses: totalFeedbackResponses,
          total_feedback_views: totalFeedbackViews,
          feedback_avg_nps: feedbackAvgNps,
          active_feedback_configs: activeFeedbackConfigs || 0,
          feedback_responses_last_30d: feedbackResponsesLast30d || 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "retention-cohorts") {
        // Get all profiles with created_at
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, created_at")
          .order("created_at", { ascending: true });

        if (!profiles || profiles.length === 0) {
          return new Response(JSON.stringify({ cohorts: [], retention: {} }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get all memberships to map user_id -> tenant_id
        const { data: memberships } = await supabase
          .from("memberships")
          .select("user_id, tenant_id");
        const tenantMap: Record<string, string> = {};
        (memberships || []).forEach((m: any) => { tenantMap[m.user_id] = m.tenant_id; });

        // Get ALL activities including new features
        const [
          { data: campaigns },
          { data: notes },
          { data: sessions },
          { data: players },
          { data: playerCampaigns },
          { data: whiteboards },
        ] = await Promise.all([
          supabase.from("campaigns").select("tenant_id, created_at"),
          supabase.from("notes").select("tenant_id, created_at"),
          supabase.from("sessions").select("tenant_id, created_at"),
          supabase.from("players").select("tenant_id, created_at"),
          supabase.from("player_campaigns").select("campaign_id, joined_at"),
          supabase.from("whiteboards").select("tenant_id, created_at"),
        ]);

        // Build tenant->user map (reverse)
        const userByTenant: Record<string, string> = {};
        (memberships || []).forEach((m: any) => { userByTenant[m.tenant_id] = m.user_id; });

        // Build campaign->tenant map for player_campaigns
        const campaignTenant: Record<string, string> = {};
        (campaigns || []).forEach((c: any) => { campaignTenant[c.id] = c.tenant_id; });

        // Combine all activities into user_id + month
        const userActivity: Record<string, Set<string>> = {};
        const addActivity = (items: any[], dateField = "created_at") => {
          (items || []).forEach((item: any) => {
            const userId = userByTenant[item.tenant_id];
            if (!userId) return;
            const month = item[dateField]?.substring(0, 7);
            if (!month) return;
            if (!userActivity[userId]) userActivity[userId] = new Set();
            userActivity[userId].add(month);
          });
        };
        addActivity(campaigns || []);
        addActivity(notes || []);
        addActivity(sessions || []);
        addActivity(players || []);
        addActivity(whiteboards || []);
        // player_campaigns reference campaign_id, resolve tenant
        (playerCampaigns || []).forEach((pc: any) => {
          // We need campaign->tenant mapping; get from campaigns data
          const camp = (campaigns || []).find((c: any) => c.id === pc.campaign_id);
          if (!camp) return;
          const userId = userByTenant[camp.tenant_id];
          if (!userId) return;
          const month = pc.joined_at?.substring(0, 7);
          if (!month) return;
          if (!userActivity[userId]) userActivity[userId] = new Set();
          userActivity[userId].add(month);
        });

        // Build cohorts by signup month
        const cohortUsers: Record<string, string[]> = {};
        profiles.forEach((p: any) => {
          const month = p.created_at?.substring(0, 7);
          if (!month) return;
          if (!cohortUsers[month]) cohortUsers[month] = [];
          cohortUsers[month].push(p.user_id);
        });

        // Dynamic max offset based on data range
        const sortedMonths = Object.keys(cohortUsers).sort();
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        
        const cohorts = sortedMonths.map(signupMonth => {
          const users = cohortUsers[signupMonth];
          const size = users.length;
          const retention: Record<number, number> = {};

          // Calculate max possible offset from signup month to current month
          const [sYear, sMon] = signupMonth.split("-").map(Number);
          const [cYear, cMon] = currentMonth.split("-").map(Number);
          const maxOffset = (cYear - sYear) * 12 + (cMon - sMon);

          for (let offset = 0; offset <= Math.min(maxOffset, 11); offset++) {
            const targetDate = new Date(sYear, sMon - 1 + offset, 1);
            const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
            if (targetMonth > currentMonth) break;

            const activeCount = users.filter(uid => userActivity[uid]?.has(targetMonth)).length;
            retention[offset] = size > 0 ? Math.round((activeCount / size) * 100) : 0;
          }

          return { month: signupMonth, size, retention };
        });

        // Overall retention rates
        const totalUsers = profiles.length;
        const activeEver = Object.keys(userActivity).length;
        const lastMonth = (() => {
          const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })();
        const activeThisMonth = Object.values(userActivity).filter(s => s.has(currentMonth)).length;
        const activeLastMonth = Object.values(userActivity).filter(s => s.has(lastMonth)).length;

        return new Response(JSON.stringify({
          cohorts: cohorts.slice(-12), // Last 12 months
          summary: {
            total_users: totalUsers,
            activated_ever: activeEver,
            activation_rate: totalUsers > 0 ? Math.round((activeEver / totalUsers) * 100) : 0,
            active_this_month: activeThisMonth,
            active_last_month: activeLastMonth,
            mom_retention: activeLastMonth > 0 ? Math.round((activeThisMonth / activeLastMonth) * 100) : 0,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "activation-funnel") {
        // Get all user IDs
        const { data: allProfiles } = await supabase.from("profiles").select("user_id, onboarding_completed");
        const totalUsers = (allProfiles || []).length;
        const onboardedUsers = (allProfiles || []).filter((p: any) => p.onboarding_completed).length;

        // Get memberships to map users to tenants
        const { data: membs } = await supabase.from("memberships").select("user_id, tenant_id");
        const tenantToUser: Record<string, string> = {};
        (membs || []).forEach((m: any) => { tenantToUser[m.tenant_id] = m.user_id; });

        // Get distinct tenant_ids that have each feature
        const [
          { data: campData },
          { data: playerData },
          { data: sessionData },
          { data: charData },
          { data: noteData },
          { data: wbData },
          { data: npcData },
          { data: campsForMap },
          { data: pcForNpc },
        ] = await Promise.all([
          supabase.from("campaigns").select("tenant_id"),
          supabase.from("players").select("tenant_id"),
          supabase.from("sessions").select("tenant_id"),
          supabase.from("player_campaigns").select("campaign_id"),
          supabase.from("notes").select("tenant_id"),
          supabase.from("whiteboards").select("tenant_id"),
          supabase.from("character_relationships").select("player_campaign_id").eq("entity_type", "npc"),
          supabase.from("campaigns").select("id, tenant_id"),
          supabase.from("player_campaigns").select("id, campaign_id"),
        ]);

        const usersWithFeature = (items: any[], field = "tenant_id") => {
          const s = new Set<string>();
          (items || []).forEach((item: any) => {
            const uid = tenantToUser[item[field]];
            if (uid) s.add(uid);
          });
          return s.size;
        };

        // campaign -> tenant map
        const campToTenant: Record<string, string> = {};
        (campsForMap || []).forEach((c: any) => { campToTenant[c.id] = c.tenant_id; });

        // Characters: player_campaigns.campaign_id -> campaigns.tenant_id -> user
        const usersWithCharacters = (() => {
          const s = new Set<string>();
          (charData || []).forEach((pc: any) => {
            const tId = campToTenant[pc.campaign_id];
            if (tId) { const uid = tenantToUser[tId]; if (uid) s.add(uid); }
          });
          return s.size;
        })();

        // NPCs: character_relationships.player_campaign_id -> player_campaigns.campaign_id -> tenant -> user
        const pcToCamp: Record<string, string> = {};
        (pcForNpc || []).forEach((pc: any) => { pcToCamp[pc.id] = pc.campaign_id; });
        const usersWithNpcs = (() => {
          const s = new Set<string>();
          (npcData || []).forEach((n: any) => {
            const campId = pcToCamp[n.player_campaign_id];
            if (!campId) return;
            const tId = campToTenant[campId];
            if (!tId) return;
            const uid = tenantToUser[tId];
            if (uid) s.add(uid);
          });
          return s.size;
        })();

        const funnel = [
          { step: "Cadastro", count: totalUsers, pct: 100 },
          { step: "Onboarding", count: onboardedUsers, pct: totalUsers > 0 ? Math.round((onboardedUsers / totalUsers) * 100) : 0 },
          { step: "1ª Campanha", count: usersWithFeature(campData), pct: totalUsers > 0 ? Math.round((usersWithFeature(campData) / totalUsers) * 100) : 0 },
          { step: "1º Jogador", count: usersWithFeature(playerData), pct: totalUsers > 0 ? Math.round((usersWithFeature(playerData) / totalUsers) * 100) : 0 },
          { step: "1º Personagem", count: usersWithCharacters, pct: totalUsers > 0 ? Math.round((usersWithCharacters / totalUsers) * 100) : 0 },
          { step: "1ª Sessão", count: usersWithFeature(sessionData), pct: totalUsers > 0 ? Math.round((usersWithFeature(sessionData) / totalUsers) * 100) : 0 },
          { step: "1ª Nota", count: usersWithFeature(noteData), pct: totalUsers > 0 ? Math.round((usersWithFeature(noteData) / totalUsers) * 100) : 0 },
          { step: "1º Whiteboard", count: usersWithFeature(wbData), pct: totalUsers > 0 ? Math.round((usersWithFeature(wbData) / totalUsers) * 100) : 0 },
          { step: "1º NPC", count: usersWithNpcs, pct: totalUsers > 0 ? Math.round((usersWithNpcs / totalUsers) * 100) : 0 },
        ];

        return new Response(JSON.stringify({ funnel }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "stripe-stats") {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

        // Get all customers
        const customers = await stripe.customers.list({ limit: 100 });
        const subscriptions = await stripe.subscriptions.list({ status: "active", limit: 100 });
        const cancelledSubs = await stripe.subscriptions.list({ status: "canceled", limit: 100 });

        // Calculate MRR
        let mrr = 0;
        for (const sub of subscriptions.data) {
          for (const item of sub.items.data) {
            if (item.price.recurring?.interval === "month") {
              mrr += (item.price.unit_amount || 0) / 100;
            } else if (item.price.recurring?.interval === "year") {
              mrr += (item.price.unit_amount || 0) / 100 / 12;
            }
          }
        }

        // Recent charges
        const charges = await stripe.charges.list({ limit: 10 });
        const recentCharges = charges.data.map((c) => ({
          id: c.id,
          amount: (c.amount || 0) / 100,
          currency: c.currency,
          status: c.status,
          created: new Date(c.created * 1000).toISOString(),
          customer_email: c.billing_details?.email || "",
        }));

        // Balance
        const balance = await stripe.balance.retrieve();
        const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
        const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

        // Count premium overrides (active)
        const { data: overridesData } = await supabase
          .from("premium_overrides")
          .select("user_id, starts_at, ends_at");
        const now = new Date();
        let premiumOverrideCount = 0;
        const overrideUserIds = new Set<string>();
        (overridesData || []).forEach((o: any) => {
          if (new Date(o.starts_at) <= now && (!o.ends_at || new Date(o.ends_at) >= now)) {
            premiumOverrideCount++;
            overrideUserIds.add(o.user_id);
          }
        });

        // Total users
        const { count: totalUsersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const totalUsers = totalUsersCount || 0;
        const stripePremium = subscriptions.data.length;
        const freeUsers = Math.max(0, totalUsers - stripePremium - premiumOverrideCount);

        // MRR History: gather paid invoices from last 12 months grouped by month
        const twelveMonthsAgo = Math.floor(Date.now() / 1000) - 365 * 86400;
        const mrrHistory: Record<string, number> = {};
        let hasMoreInvoices = true;
        let invoiceStartingAfter: string | undefined;
        while (hasMoreInvoices) {
          const invoiceParams: any = { limit: 100, status: "paid", created: { gte: twelveMonthsAgo } };
          if (invoiceStartingAfter) invoiceParams.starting_after = invoiceStartingAfter;
          const invoices = await stripe.invoices.list(invoiceParams);
          for (const inv of invoices.data) {
            const month = new Date(inv.created * 1000).toISOString().substring(0, 7); // YYYY-MM
            mrrHistory[month] = (mrrHistory[month] || 0) + (inv.amount_paid || 0) / 100;
          }
          hasMoreInvoices = invoices.has_more;
          if (invoices.data.length > 0) invoiceStartingAfter = invoices.data[invoices.data.length - 1].id;
        }

        // Build sorted array of monthly revenue
        const mrrHistoryArray = Object.entries(mrrHistory)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, revenue]) => ({ month, revenue }));

        // Previous month comparison
        const currentMonth = new Date().toISOString().substring(0, 7);
        const prevDate = new Date();
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonth = prevDate.toISOString().substring(0, 7);
        const currentMonthRevenue = mrrHistory[currentMonth] || 0;
        const prevMonthRevenue = mrrHistory[prevMonth] || 0;

        // Previous period subscriptions (cancelled last 30d vs 30-60d)
        const d30 = new Date(Date.now() - 30 * 86400000);
        const d60 = new Date(Date.now() - 60 * 86400000);
        let cancelledLast30 = 0;
        let cancelledPrev30 = 0;
        for (const sub of cancelledSubs.data) {
          const cancelDate = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
          if (cancelDate && cancelDate >= d30) cancelledLast30++;
          else if (cancelDate && cancelDate >= d60 && cancelDate < d30) cancelledPrev30++;
        }

        return new Response(JSON.stringify({
          total_customers: customers.data.length,
          active_subscriptions: stripePremium,
          cancelled_subscriptions: cancelledSubs.data.length,
          mrr,
          recent_charges: recentCharges,
          available_balance: availableBalance,
          pending_balance: pendingBalance,
          premium_override_count: premiumOverrideCount,
          free_users: freeUsers,
          total_users: totalUsers,
          mrr_history: mrrHistoryArray,
          current_month_revenue: currentMonthRevenue,
          prev_month_revenue: prevMonthRevenue,
          cancelled_last_30d: cancelledLast30,
          cancelled_prev_30d: cancelledPrev30,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "cost-settings") {
        const { data } = await supabase
          .from("admin_cost_settings")
          .select("key, value, label")
          .order("key");
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "ai-details") {
        // AI usage breakdown: by feature, daily trend (last 30d), top users
        const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: logs } = await supabase
          .from("ai_usage_logs")
          .select("user_id, feature, model, created_at")
          .gte("created_at", d30)
          .order("created_at", { ascending: true });

        // By feature
        const byFeature: Record<string, number> = {};
        // By day
        const byDay: Record<string, number> = {};
        // By user
        const byUser: Record<string, { count: number; features: Set<string> }> = {};

        (logs || []).forEach((l: any) => {
          byFeature[l.feature] = (byFeature[l.feature] || 0) + 1;
          const day = l.created_at.substring(0, 10);
          byDay[day] = (byDay[day] || 0) + 1;
          if (!byUser[l.user_id]) byUser[l.user_id] = { count: 0, features: new Set() };
          byUser[l.user_id].count++;
          byUser[l.user_id].features.add(l.feature);
        });

        // Get top 10 users by usage
        const topUsers = Object.entries(byUser)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([uid, data]) => ({ user_id: uid, count: data.count, features: Array.from(data.features) }));

        // Enrich top users with display names
        if (topUsers.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", topUsers.map(u => u.user_id));
          const profileMap: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
          topUsers.forEach((u: any) => {
            const p = profileMap[u.user_id];
            u.display_name = p?.display_name || "Sem nome";
            u.avatar_url = p?.avatar_url || null;
          });
        }

        // Daily trend as array
        const dailyTrend = Object.entries(byDay)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([day, count]) => ({ day, count }));

        // Features array
        const features = Object.entries(byFeature)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));

        return new Response(JSON.stringify({ features, daily_trend: dailyTrend, top_users: topUsers }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "db-row-counts") {
        // Count rows per table for capacity monitoring
        const tables = [
          "profiles", "campaigns", "sessions", "notes",
          "whiteboards", "whiteboard_items", "folders", "posts",
          "blog_authors", "post_categories", "favorites", "ai_usage_logs",
          "notifications", "user_notifications", "note_shares", "campaign_shares",
          "share_events", "dictionary_entries", "featured_links", "menu_items",
          "memberships", "tenants", "premium_overrides", "journey_progress",
          "post_features", "site_settings",
        ];

        const counts: Record<string, number> = {};
        await Promise.all(tables.map(async (t) => {
          const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
          counts[t] = count || 0;
        }));

        const totalRows = Object.values(counts).reduce((s, c) => s + c, 0);

        return new Response(JSON.stringify({ counts, total_rows: totalRows }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "blog-author-stats") {
        // Get all posts with author info for blog author ranking
        const { data: posts } = await supabase
          .from("posts")
          .select("id, blog_author_id, status, tags, category_ids, created_at, reading_time_min, featured, pinned, visibility, view_count");

        const { data: authors } = await supabase
          .from("blog_authors")
          .select("id, name, email, avatar_url, slug, profile_id, profiles(slug, avatar_url)");

        const { data: authorProfiles } = await supabase
          .from("profiles")
          .select("id, blog_enabled");

        const blogEnabledMap = new Set<string>();
        (authorProfiles || []).forEach((p: any) => { if (p.blog_enabled) blogEnabledMap.add(p.id); });

        const authorStats = (authors || []).map((a: any) => {
          const authorPosts = (posts || []).filter((p: any) => p.blog_author_id === a.id);
          const published = authorPosts.filter((p: any) => p.status === "published");
          const draft = authorPosts.filter((p: any) => p.status === "draft");
          const featured = authorPosts.filter((p: any) => p.featured);
          const totalViews = authorPosts.reduce((s: number, p: any) => s + (p.view_count || 0), 0);
          const allTags: Record<string, number> = {};
          authorPosts.forEach((p: any) => (p.tags || []).forEach((t: string) => { allTags[t] = (allTags[t] || 0) + 1; }));
          const topTags = Object.entries(allTags).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
          const totalReadTime = authorPosts.reduce((s: number, p: any) => s + (p.reading_time_min || 0), 0);
          const blogEnabled = a.profile_id ? blogEnabledMap.has(a.profile_id) : false;

          const profileSlug = a.profiles?.slug || null;
          const resolvedAvatar = a.profiles?.avatar_url || a.avatar_url;

          return {
            id: a.id,
            name: a.name,
            email: a.email || null,
            avatar_url: resolvedAvatar,
            slug: a.slug,
            profile_slug: profileSlug,
            blog_enabled: blogEnabled,
            total_posts: authorPosts.length,
            published: published.length,
            drafts: draft.length,
            featured: featured.length,
            total_views: totalViews,
            top_tags: topTags,
            total_reading_time: totalReadTime,
            last_post_at: authorPosts.length > 0 ? authorPosts.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0].created_at : null,
          };
        });

        return new Response(JSON.stringify(authorStats.sort((a: any, b: any) => b.total_posts - a.total_posts)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "blog-post-ranking") {
        // Top posts by view count
        const { data: topPosts } = await supabase
          .from("posts")
          .select("id, title, slug, view_count, featured, blog_author_id, published_at, cover_url, blog_authors(name, avatar_url)")
          .eq("status", "published")
          .order("view_count", { ascending: false })
          .limit(20);

        // Get admin actions summary per post
        const postIds = (topPosts || []).map((p: any) => p.id);
        const { data: actions } = await supabase
          .from("post_admin_actions")
          .select("post_id, action_type, created_at, admin_user_id")
          .in("post_id", postIds.length > 0 ? postIds : ["00000000-0000-0000-0000-000000000000"]);

        // Group actions by post
        const actionsByPost: Record<string, any[]> = {};
        (actions || []).forEach((a: any) => {
          if (!actionsByPost[a.post_id]) actionsByPost[a.post_id] = [];
          actionsByPost[a.post_id].push(a);
        });

        const enriched = (topPosts || []).map((p: any) => ({
          ...p,
          admin_actions: actionsByPost[p.id] || [],
        }));

        return new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "storage-usage") {
        // Otimizado: usa RPC SQL em vez de listRecursive (~21s → <1s)
        const { data: rpcResult, error: rpcErr } = await supabase.rpc("admin_storage_usage_summary");
        if (rpcErr) throw rpcErr;

        const result = rpcResult as any;
        const totalSize = result?.total_size || 0;
        const totalCount = result?.total_count || 0;
        const categories = result?.categories || {};

        // Check if storage is at 90%+ and auto-notify admins
        const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB free tier
        const usagePct = (totalSize / STORAGE_LIMIT_BYTES) * 100;
        let storageAlert = null;

        if (usagePct >= 90) {
          // Check if we already sent this alert recently (last 24h)
          const { data: recentAlert } = await supabase
            .from("notifications")
            .select("id")
            .eq("type", "alert")
            .eq("target_audience", "admins")
            .ilike("title", "%storage%90%")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!recentAlert || recentAlert.length === 0) {
            const { data: notif } = await supabase.from("notifications").insert({
              title: `⚠️ Storage a ${usagePct.toFixed(1)}% da capacidade`,
              body: `O armazenamento está em ${(totalSize / (1024 * 1024)).toFixed(1)} MB de ${STORAGE_LIMIT_BYTES / (1024 * 1024)} MB (${usagePct.toFixed(1)}%). Considere fazer upgrade do plano ou limpar arquivos não utilizados.`,
              type: "alert",
              target_audience: "admins",
              status: "sent",
              published_at: new Date().toISOString(),
              created_by: user.id,
            }).select("id").single();

            if (notif) {
              const { data: admins } = await supabase
                .from("user_roles")
                .select("user_id")
                .eq("role", "admin");

              if (admins && admins.length > 0) {
                const rows = admins.map((a: any) => ({
                  user_id: a.user_id,
                  notification_id: notif.id,
                }));
                await supabase.from("user_notifications").insert(rows);
                await supabase.from("notifications").update({ sent_count: admins.length }).eq("id", notif.id);
              }
              storageAlert = { sent: true, pct: usagePct.toFixed(1) };
            }
          } else {
            storageAlert = { sent: false, pct: usagePct.toFixed(1), reason: "already_notified_24h" };
          }
        }

        return new Response(JSON.stringify({
          categories,
          total_size: totalSize,
          total_count: totalCount,
          storage_alert: storageAlert,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "daily-signups") {
        // Get user signups per day for last 30 days
        const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: profiles } = await supabase
          .from("profiles")
          .select("created_at")
          .gte("created_at", d30)
          .order("created_at", { ascending: true });

        const byDay: Record<string, number> = {};
        // Pre-fill last 30 days with 0
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          const key = d.toISOString().substring(0, 10);
          byDay[key] = 0;
        }
        (profiles || []).forEach((p: any) => {
          const day = p.created_at.substring(0, 10);
          byDay[day] = (byDay[day] || 0) + 1;
        });

        const dailySignups = Object.entries(byDay)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([day, count]) => ({ day, count }));

        return new Response(JSON.stringify(dailySignups), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "infra-health") {
        // Infrastructure health monitoring using Supabase DB directly
        let cacheHitRatio = 0;
        let longQueries: any[] = [];
        let dbSizeMB = 0;
        let activeConnections = 0;
        let maxConnections = 0;
        let deadTuples = 0;
        let indexUsageRatio = 0;
        let alerts: { level: string; message: string; detail: string }[] = [];

        // Use the user's JWT token (already validated as admin) so auth.uid() works in RPCs
        const rpcHeaders = {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "",
          "Authorization": `Bearer ${token}`,
        };

        try {
          const cacheRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/admin_db_cache_hit`, {
            method: "POST",
            headers: rpcHeaders,
            body: "{}",
          });
          if (cacheRes.ok) {
            const cacheData = await cacheRes.json();
            cacheHitRatio = cacheData?.ratio || 0;
          }
        } catch (_) { /* ignore */ }

        try {
          const longRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/admin_long_queries`, {
            method: "POST",
            headers: rpcHeaders,
            body: "{}",
          });
          if (longRes.ok) {
            longQueries = await longRes.json();
          }
        } catch (_) { /* ignore */ }

        try {
          const sizeRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/admin_db_size`, {
            method: "POST",
            headers: rpcHeaders,
            body: "{}",
          });
          if (sizeRes.ok) {
            const sizeData = await sizeRes.json();
            dbSizeMB = sizeData?.size_mb || 0;
            activeConnections = sizeData?.active_connections || 0;
            maxConnections = sizeData?.max_connections || 0;
            deadTuples = sizeData?.dead_tuples || 0;
            indexUsageRatio = sizeData?.index_usage_ratio || 0;
          }
        } catch (_) { /* ignore */ }

        // Generate alerts
        if (cacheHitRatio > 0 && cacheHitRatio < 95) {
          alerts.push({
            level: cacheHitRatio < 80 ? "critical" : "warning",
            message: `Cache hit ratio baixo: ${cacheHitRatio.toFixed(1)}%`,
            detail: "Considere otimizar queries ou aumentar memória. O ideal é manter acima de 99%.",
          });
        }

        if (longQueries.length > 0) {
          alerts.push({
            level: "warning",
            message: `${longQueries.length} query(s) longa(s) em execução`,
            detail: "Queries rodando há mais de 5 minutos podem impactar a performance.",
          });
        }

        if (activeConnections > 0 && maxConnections > 0) {
          const connPct = (activeConnections / maxConnections) * 100;
          if (connPct > 80) {
            alerts.push({
              level: connPct > 90 ? "critical" : "warning",
              message: `Conexões: ${activeConnections}/${maxConnections} (${connPct.toFixed(0)}%)`,
              detail: "Número alto de conexões ativas. Considere usar connection pooling.",
            });
          }
        }

        if (deadTuples > 10000) {
          alerts.push({
            level: deadTuples > 50000 ? "warning" : "info",
            message: `${deadTuples.toLocaleString()} dead tuples detectadas`,
            detail: "Considere executar VACUUM para liberar espaço e melhorar performance.",
          });
        }

        if (indexUsageRatio > 0 && indexUsageRatio < 95) {
          alerts.push({
            level: "warning",
            message: `Index usage ratio: ${indexUsageRatio.toFixed(1)}%`,
            detail: "Algumas queries podem estar fazendo table scans. Considere adicionar índices.",
          });
        }

        return new Response(JSON.stringify({
          cache_hit_ratio: cacheHitRatio,
          long_queries: longQueries,
          db_size_mb: dbSizeMB,
          active_connections: activeConnections,
          max_connections: maxConnections,
          dead_tuples: deadTuples,
          index_usage_ratio: indexUsageRatio,
          alerts,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "infra-extended") {
        const rpcHeaders = {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "",
          "Authorization": `Bearer ${token}`,
        };

        let extData: any = {};
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/admin_infra_extended`, {
            method: "POST",
            headers: rpcHeaders,
            body: "{}",
          });
          if (res.ok) extData = await res.json();
        } catch (_) { /* ignore */ }

        return new Response(JSON.stringify(extData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "infra-history") {
        const { data } = await supabase
          .from("infra_snapshots")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(200);

        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "infra-snapshot") {
        // Take a snapshot using the user's JWT so auth.uid() works
        const rpcHeaders = {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "",
          "Authorization": `Bearer ${token}`,
        };
        let snapResult: any = null;
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/admin_take_infra_snapshot`, {
            method: "POST",
            headers: rpcHeaders,
            body: "{}",
          });
          if (res.ok) snapResult = await res.json();
        } catch (_) { /* ignore */ }

        return new Response(JSON.stringify(snapResult || { error: "Failed to take snapshot" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ═══ ADMIN ACTIONS WIDGET — aggregates actionable alerts across the platform ═══
      if (action === "admin-actions") {
        const actions: Array<{ id: string; level: "critical" | "warning" | "info"; category: string; title: string; detail: string; count?: number; link?: string }> = [];

        // 1. Posts pending review (status = 'pending')
        const { count: pendingPosts } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending");
        if ((pendingPosts || 0) > 0) {
          actions.push({
            id: "pending-posts",
            level: "warning",
            category: "blog",
            title: `${pendingPosts} post(s) aguardando revisão`,
            detail: "Posts enviados por autores aguardando aprovação para publicação.",
            count: pendingPosts || 0,
            link: "/admin/blog",
          });
        }

        // 2. Pending feature requests
        const { count: pendingFeatures } = await supabase.from("post_features").select("*", { count: "exact", head: true }).eq("status", "pending");
        if ((pendingFeatures || 0) > 0) {
          actions.push({
            id: "pending-features",
            level: "info",
            category: "blog",
            title: `${pendingFeatures} destaque(s) pendente(s)`,
            detail: "Pedidos de destaque de posts aguardando análise.",
            count: pendingFeatures || 0,
            link: "/admin/blog",
          });
        }

        // 3. Draft notifications
        const { count: draftNotifs } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("status", "draft");
        if ((draftNotifs || 0) > 0) {
          actions.push({
            id: "draft-notifs",
            level: "info",
            category: "notifications",
            title: `${draftNotifs} notificação(ões) em rascunho`,
            detail: "Notificações criadas mas ainda não enviadas aos usuários.",
            count: draftNotifs || 0,
          });
        }

        // 4. Storage capacity check
        const buckets = ["profile-assets", "blog-assets"];
        let totalStorageSize = 0;
        const listRecursiveActions = async (bucket: string, prefix: string): Promise<void> => {
          const { data: items } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
          if (!items) return;
          for (const item of items) {
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            const size = (item.metadata as any)?.size || 0;
            if (size > 0) {
              totalStorageSize += size;
            } else {
              await listRecursiveActions(bucket, fullPath);
            }
          }
        };
        for (const bucket of buckets) {
          await listRecursiveActions(bucket, "");
        }
        const STORAGE_LIMIT = 1 * 1024 * 1024 * 1024;
        const storagePct = (totalStorageSize / STORAGE_LIMIT) * 100;
        if (storagePct >= 80) {
          actions.push({
            id: "storage-capacity",
            level: storagePct >= 90 ? "critical" : "warning",
            category: "infra",
            title: `Storage a ${storagePct.toFixed(0)}% da capacidade`,
            detail: `${(totalStorageSize / (1024 * 1024)).toFixed(1)} MB de ${STORAGE_LIMIT / (1024 * 1024)} MB utilizados.`,
          });
        }

        // 5. DB row capacity
        const tables = [
          "profiles", "campaigns", "sessions", "notes", "whiteboards", "whiteboard_items",
          "folders", "posts", "blog_authors", "post_categories", "favorites", "ai_usage_logs",
          "notifications", "user_notifications", "note_shares", "campaign_shares",
          "dictionary_entries", "featured_links", "menu_items", "memberships", "tenants",
          "premium_overrides", "journey_progress", "post_features",
        ];
        let totalRows = 0;
        await Promise.all(tables.map(async (t) => {
          const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
          totalRows += count || 0;
        }));
        const DB_LIMIT = 500000;
        const dbPct = (totalRows / DB_LIMIT) * 100;
        if (dbPct >= 70) {
          actions.push({
            id: "db-capacity",
            level: dbPct >= 90 ? "critical" : "warning",
            category: "infra",
            title: `Banco de dados a ${dbPct.toFixed(0)}% da capacidade`,
            detail: `${totalRows.toLocaleString()} de ${DB_LIMIT.toLocaleString()} linhas utilizadas.`,
          });
        }

        // 6. Users without onboarding completed (>30 days old)
        const d30ago = new Date(Date.now() - 30 * 86400000).toISOString();
        const { count: staleOnboarding } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("onboarding_completed", false)
          .lt("created_at", d30ago);
        if ((staleOnboarding || 0) > 5) {
          actions.push({
            id: "stale-onboarding",
            level: "info",
            category: "users",
            title: `${staleOnboarding} usuários sem onboarding (>30 dias)`,
            detail: "Usuários antigos que nunca completaram o onboarding. Considere enviar uma notificação de reengajamento.",
            count: staleOnboarding || 0,
          });
        }

        // 7. Conditional notifications that are inactive
        const { count: inactiveCondNotifs } = await supabase
          .from("conditional_notifications")
          .select("*", { count: "exact", head: true })
          .eq("active", false);
        if ((inactiveCondNotifs || 0) > 0) {
          actions.push({
            id: "inactive-cond-notifs",
            level: "info",
            category: "notifications",
            title: `${inactiveCondNotifs} notificação(ões) condicional(is) inativa(s)`,
            detail: "Notificações condicionais criadas mas desativadas.",
            count: inactiveCondNotifs || 0,
          });
        }

        // Sort: critical first, then warning, then info
        const levelOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        actions.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

        return new Response(JSON.stringify({ actions, timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Email pipeline settings ───
      if (action === "email-pipeline-settings") {
        const { data } = await supabase
          .from("email_pipeline_settings")
          .select("*")
          .order("id");
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Email logs with recipient email from auth.users ───
      if (action === "email-logs-enriched") {
        const { data: logs } = await supabase
          .from("reengagement_logs")
          .select("*")
          .order("sent_at", { ascending: false })
          .limit(2000);

        if (!logs || logs.length === 0) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Collect unique user IDs
        const userIds = [...new Set(logs.map((l: any) => l.user_id))];
        
        // Fetch emails from auth.users (service_role required)
        const emailMap: Record<string, string> = {};
        // Batch in groups of 50
        for (let i = 0; i < userIds.length; i += 50) {
          const batch = userIds.slice(i, i + 50);
          for (const uid of batch) {
            try {
              const { data: authUser } = await supabase.auth.admin.getUserById(uid);
              if (authUser?.user?.email) {
                emailMap[uid] = authUser.user.email;
              }
            } catch (_e) { /* skip */ }
          }
        }

        const enriched = logs.map((l: any) => ({
          ...l,
          recipient_email: emailMap[l.user_id] || null,
        }));

        return new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      // ─── Toggle email pipeline ───
      if (action === "toggle-email-pipeline") {
        const { pipeline_id, active } = body;
        if (typeof pipeline_id !== "string" || typeof active !== "boolean") {
          return new Response(JSON.stringify({ error: "Invalid params" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        const { error: upErr } = await supabase
          .from("email_pipeline_settings")
          .update({ active, updated_at: new Date().toISOString(), updated_by: user.id })
          .eq("id", pipeline_id);
        if (upErr) throw upErr;
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "save-cost-settings") {
        const { costs } = body; // Array of { key, value }
        if (!Array.isArray(costs)) {
          return new Response(JSON.stringify({ error: "Invalid costs array" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        for (const c of costs) {
          if (typeof c.key !== "string" || typeof c.value !== "number") continue;
          await supabase
            .from("admin_cost_settings")
            .update({ value: c.value, updated_at: new Date().toISOString(), updated_by: user.id })
            .eq("key", c.key);
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "create-user") {
        const { email, password, display_name } = body;

        // Validate email
        if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(JSON.stringify({ error: "Invalid email" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Validate password
        if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
          return new Response(JSON.stringify({ error: "Password must be 8-128 characters" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Validate display_name
        if (display_name !== undefined && (typeof display_name !== "string" || display_name.length > 100)) {
          return new Response(JSON.stringify({ error: "Display name must be under 100 characters" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
        });
        if (createError) throw createError;

        return new Response(JSON.stringify({ user_id: newUser.user.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update-user") {
        const { user_id, display_name, is_admin: newIsAdmin, tags } = body;

        // Validate user_id is a UUID
        if (!user_id || typeof user_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
          return new Response(JSON.stringify({ error: "Invalid user ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        if (display_name !== undefined && (typeof display_name !== "string" || display_name.length > 100)) {
          return new Response(JSON.stringify({ error: "Display name must be under 100 characters" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        if (newIsAdmin !== undefined && typeof newIsAdmin !== "boolean") {
          return new Response(JSON.stringify({ error: "is_admin must be boolean" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        if (tags !== undefined) {
          if (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== "string" || (t as string).length > 50)) {
            return new Response(JSON.stringify({ error: "Tags must be array of strings (max 50 chars each)" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            });
          }
        }

        // Handle admin role via user_roles table
        if (newIsAdmin !== undefined) {
          if (newIsAdmin) {
            await supabase.from("user_roles").upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
          } else {
            await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
          }
        }

        // Handle profile field updates
        const updates: Record<string, unknown> = {};
        if (display_name !== undefined) updates.display_name = display_name.trim();
        if (tags !== undefined) updates.tags = tags.map((t: string) => t.trim().toLowerCase());

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("profiles")
            .update(updates)
            .eq("user_id", user_id);
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "reset-password") {
        const { user_id, new_password } = body;

        if (!user_id || typeof user_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
          return new Response(JSON.stringify({ error: "Invalid user ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        if (!new_password || typeof new_password !== "string" || new_password.length < 8 || new_password.length > 128) {
          return new Response(JSON.stringify({ error: "Password must be 8-128 characters" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (updateError) throw updateError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "set-premium") {
        const { user_id, starts_at, ends_at } = body;

        // Validate user_id
        if (!user_id || typeof user_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
          return new Response(JSON.stringify({ error: "Invalid user ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Validate dates
        if (!starts_at || isNaN(Date.parse(starts_at))) {
          return new Response(JSON.stringify({ error: "Invalid starts_at date" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        if (ends_at !== null && ends_at !== undefined && isNaN(Date.parse(ends_at))) {
          return new Response(JSON.stringify({ error: "Invalid ends_at date" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Check if user has active Stripe subscription
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user_id)
          .single();

        if (!profileData) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        // Get user email to check Stripe
        const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
        if (authUser?.user?.email) {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
          const customers = await stripe.customers.list({ email: authUser.user.email, limit: 1 });
          if (customers.data.length > 0) {
            const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
            if (subs.data.length > 0) {
              return new Response(JSON.stringify({ error: "User already has an active paid subscription" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 409,
              });
            }
          }
        }

        // Upsert premium override
        const { error: upsertError } = await supabase
          .from("premium_overrides")
          .upsert({
            user_id,
            starts_at,
            ends_at: ends_at || null,
            granted_by: user.id,
          }, { onConflict: "user_id" });

        if (upsertError) throw upsertError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "remove-premium") {
        const { user_id } = body;

        if (!user_id || typeof user_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
          return new Response(JSON.stringify({ error: "Invalid user ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        await supabase
          .from("premium_overrides")
          .delete()
          .eq("user_id", user_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "ban-user") {
        const { user_id, reason } = body;

        if (!user_id || typeof user_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
          return new Response(JSON.stringify({ error: "Invalid user ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Prevent banning yourself
        if (user_id === user.id) {
          return new Response(JSON.stringify({ error: "Cannot ban yourself" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
        if (!authUser?.user?.email) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        const email = authUser.user.email.toLowerCase();

        // 1. Cancel Stripe subscription if any
        try {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
          const customers = await stripe.customers.list({ email, limit: 1 });
          if (customers.data.length > 0) {
            const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 10 });
            for (const sub of subs.data) {
              await stripe.subscriptions.cancel(sub.id);
            }
          }
        } catch (stripeErr) {
          console.error("Stripe cancel error (non-blocking):", stripeErr);
        }

        // 2. Remove premium override
        await supabase.from("premium_overrides").delete().eq("user_id", user_id);

        // 3. Add email to banned list
        const { error: banError } = await supabase
          .from("banned_emails")
          .upsert({
            email,
            reason: reason || null,
            banned_by: user.id,
          }, { onConflict: "email" });

        if (banError) throw banError;

        // 4. Ban the user in Auth (disables login without deleting data)
        const { error: banAuthError } = await supabase.auth.admin.updateUserById(user_id, {
          ban_duration: "876600h", // ~100 years
        });
        if (banAuthError) throw banAuthError;

        return new Response(JSON.stringify({ success: true, banned_email: email }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "unban-email") {
        const { email } = body;

        if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(JSON.stringify({ error: "Invalid email" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const normalizedEmail = email.toLowerCase();

        // Remove from banned list
        await supabase
          .from("banned_emails")
          .delete()
          .eq("email", normalizedEmail);

        // Find user by email and unban in Auth
        const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const bannedUser = (authUsers?.users || []).find((u: any) => u.email?.toLowerCase() === normalizedEmail);
        if (bannedUser) {
          await supabase.auth.admin.updateUserById(bannedUser.id, {
            ban_duration: "none",
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "list-banned") {
        const { data: banned } = await supabase
          .from("banned_emails")
          .select("*")
          .order("created_at", { ascending: false });

        return new Response(JSON.stringify(banned || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "preview-notification") {
        const { notification_id } = body;

        if (!notification_id || typeof notification_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notification_id)) {
          return new Response(JSON.stringify({ error: "Invalid notification ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const { data: notif } = await supabase.from("notifications").select("*").eq("id", notification_id).single();
        if (!notif) {
          return new Response(JSON.stringify({ error: "Not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 });
        }

        const { data: allProfiles } = await supabase.from("profiles").select("user_id, tags");
        let count = (allProfiles || []).length;

        if (notif.target_audience === "single_user") {
          // Single user by email - email stored in target_tags[0]
          const targetEmail = (notif.target_tags || [])[0];
          if (!targetEmail) {
            return new Response(JSON.stringify({ count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const matchUser = (authUsers?.users || []).find((u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase());
          count = matchUser ? 1 : 0;
        } else if (notif.target_audience === "tag") {
          const tags: string[] = notif.target_tags || [];
          if (tags.length > 0) {
            count = (allProfiles || []).filter((p: any) => {
              const ut: string[] = p.tags || [];
              return tags.some((t: string) => ut.includes(t));
            }).length;
          }
        } else if (["premium", "free", "premium_override"].includes(notif.target_audience)) {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
          const { data: overrides } = await supabase.from("premium_overrides").select("user_id, starts_at, ends_at");
          const overrideSet = new Set<string>();
          const now = new Date();
          (overrides || []).forEach((o: any) => { if (new Date(o.starts_at) <= now && (!o.ends_at || new Date(o.ends_at) >= now)) overrideSet.add(o.user_id); });
          const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const emailToUid: Record<string, string> = {};
          (authUsers?.users || []).forEach((u: any) => { if (u.email) emailToUid[u.email.toLowerCase()] = u.id; });
          const stripeSet = new Set<string>();
          const customers = await stripe.customers.list({ limit: 100 });
          for (const c of customers.data) {
            if (c.email) { const s = await stripe.subscriptions.list({ customer: c.id, status: "active", limit: 1 }); if (s.data.length > 0) { const uid = emailToUid[c.email.toLowerCase()]; if (uid) stripeSet.add(uid); } }
          }
          const ids = (allProfiles || []).map((p: any) => p.user_id);
          if (notif.target_audience === "premium") count = ids.filter((uid: string) => stripeSet.has(uid) || overrideSet.has(uid)).length;
          else if (notif.target_audience === "premium_override") count = ids.filter((uid: string) => overrideSet.has(uid)).length;
          else count = ids.filter((uid: string) => !stripeSet.has(uid) && !overrideSet.has(uid)).length;
        } else if (notif.target_audience === "blog_active") {
          count = (allProfiles || []).filter((p: any) => p.blog_enabled === true).length;
        } else if (notif.target_audience === "commissioned_master") {
          count = (allProfiles || []).filter((p: any) => p.commissioned_master === "yes" || p.commissioned_master === "yes_fulltime").length;
        }

        return new Response(JSON.stringify({ count }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "notification-metrics") {
        const { notification_id } = body;
        if (!notification_id) {
          return new Response(JSON.stringify({ error: "Missing ID" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }
        const { count: total } = await supabase.from("user_notifications").select("*", { count: "exact", head: true }).eq("notification_id", notification_id);
        const { count: readCount } = await supabase.from("user_notifications").select("*", { count: "exact", head: true }).eq("notification_id", notification_id).not("read_at", "is", null);
        return new Response(JSON.stringify({ total: total || 0, read: readCount || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "send-notification") {
        const { notification_id } = body;

        if (!notification_id || typeof notification_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notification_id)) {
          return new Response(JSON.stringify({ error: "Invalid notification ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Get the notification
        const { data: notif, error: notifErr } = await supabase
          .from("notifications")
          .select("*")
          .eq("id", notification_id)
          .single();
        if (notifErr || !notif) {
          return new Response(JSON.stringify({ error: "Notification not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        // Get all profiles
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("user_id, tags");

        if (!allProfiles || allProfiles.length === 0) {
          return new Response(JSON.stringify({ error: "No users found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        let targetUserIds: string[] = allProfiles.map((p: any) => p.user_id);

        const audience = notif.target_audience;
        
        if (audience === "single_user") {
          // Single user by email
          const targetEmail = (notif.target_tags || [])[0];
          if (!targetEmail) {
            return new Response(JSON.stringify({ error: "No target email specified" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
            });
          }
          const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const matchUser = (authUsers?.users || []).find((u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase());
          if (matchUser) {
            targetUserIds = [matchUser.id];
          } else {
            targetUserIds = [];
          }
        } else if (audience === "tag") {
          const tags: string[] = notif.target_tags || [];
          if (tags.length > 0) {
            targetUserIds = allProfiles
              .filter((p: any) => {
                const userTags: string[] = p.tags || [];
                return tags.some((t: string) => userTags.includes(t));
              })
              .map((p: any) => p.user_id);
          }
        } else if (audience === "premium" || audience === "free" || audience === "premium_override") {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
          const { data: overrides } = await supabase.from("premium_overrides").select("user_id, starts_at, ends_at");
          const overrideUserIds = new Set<string>();
          const now = new Date();
          (overrides || []).forEach((o: any) => {
            if (new Date(o.starts_at) <= now && (!o.ends_at || new Date(o.ends_at) >= now)) overrideUserIds.add(o.user_id);
          });
          const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const emailToUserId: Record<string, string> = {};
          (authUsers?.users || []).forEach((u: any) => { if (u.email) emailToUserId[u.email.toLowerCase()] = u.id; });
          const stripeUserIds = new Set<string>();
          const customers = await stripe.customers.list({ limit: 100 });
          for (const cust of customers.data) {
            if (cust.email) {
              const subs = await stripe.subscriptions.list({ customer: cust.id, status: "active", limit: 1 });
              if (subs.data.length > 0) { const uid = emailToUserId[cust.email.toLowerCase()]; if (uid) stripeUserIds.add(uid); }
            }
          }
          if (audience === "premium") targetUserIds = targetUserIds.filter(uid => stripeUserIds.has(uid) || overrideUserIds.has(uid));
          else if (audience === "premium_override") targetUserIds = targetUserIds.filter(uid => overrideUserIds.has(uid));
          else if (audience === "free") targetUserIds = targetUserIds.filter(uid => !stripeUserIds.has(uid) && !overrideUserIds.has(uid));
        } else if (audience === "blog_active") {
          // Usuários com blog ativo
          targetUserIds = allProfiles
            .filter((p: any) => p.blog_enabled === true)
            .map((p: any) => p.user_id);
        } else if (audience === "commissioned_master") {
          // Mestres comissionados (sim ou sim, vivo de RPG)
          targetUserIds = allProfiles
            .filter((p: any) => p.commissioned_master === "yes" || p.commissioned_master === "yes_fulltime")
            .map((p: any) => p.user_id);
        }

        if (targetUserIds.length === 0) {
          return new Response(JSON.stringify({ error: "No matching users" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const rows = targetUserIds.map(uid => ({ notification_id, user_id: uid }));
        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          await supabase.from("user_notifications").upsert(batch, { onConflict: "notification_id,user_id", ignoreDuplicates: true });
        }

        await supabase
          .from("notifications")
          .update({ status: "published", published_at: new Date().toISOString(), sent_count: targetUserIds.length })
          .eq("id", notification_id);

        // Also send Web Push to users with push_enabled
        try {
          const pushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;
          await fetch(pushUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ notification_id, user_ids: targetUserIds }),
          });
        } catch (pushErr) {
          console.error("Push notification dispatch error:", pushErr);
          // Don't fail the main notification send if push fails
        }

        return new Response(JSON.stringify({ success: true, sent_to: targetUserIds.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ═══ USABILITY DASHBOARD (consolidated) ═══
    // Merges: activation-funnel + ai-details + pwa-stats +
    //         retention-cohorts + activity-buckets into ONE call.
    // Shared table fetches eliminate duplicate queries across sections.
    // ═══════════════════════════════════════════════════════════════════
    if (action === "usability-dashboard") {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

      // ── Shared data fetches (used by funnel + retention) ──
      const [
        { data: allProfiles },
        { data: memberships },
        { data: campaigns },
        { data: sessions },
        { data: notes },
        { data: players },
        { data: playerCampaigns },
        { data: whiteboards },
        { data: npcRelations },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, created_at, onboarding_completed"),
        supabase.from("memberships").select("user_id, tenant_id"),
        supabase.from("campaigns").select("id, tenant_id, created_at"),
        supabase.from("sessions").select("tenant_id, created_at"),
        supabase.from("notes").select("tenant_id, created_at"),
        supabase.from("players").select("tenant_id, created_at"),
        supabase.from("player_campaigns").select("id, campaign_id, joined_at"),
        supabase.from("whiteboards").select("tenant_id, created_at"),
        supabase.from("character_relationships").select("player_campaign_id").eq("entity_type", "npc"),
      ]);

      // ── Build shared maps ──
      const tenantToUser: Record<string, string> = {};
      const userByTenant: Record<string, string> = {};
      (memberships || []).forEach((m: any) => {
        tenantToUser[m.tenant_id] = m.user_id;
        userByTenant[m.tenant_id] = m.user_id;
      });

      const campToTenant: Record<string, string> = {};
      (campaigns || []).forEach((c: any) => { campToTenant[c.id] = c.tenant_id; });

      const pcToCamp: Record<string, string> = {};
      (playerCampaigns || []).forEach((pc: any) => { pcToCamp[pc.id] = pc.campaign_id; });

      const profiles = allProfiles || [];
      const totalUsers = profiles.length;
      const onboardedUsers = profiles.filter((p: any) => p.onboarding_completed).length;

      // ── Helper: count unique users with feature ──
      const usersWithFeature = (items: any[], field = "tenant_id") => {
        const s = new Set<string>();
        (items || []).forEach((item: any) => {
          const uid = tenantToUser[item[field]];
          if (uid) s.add(uid);
        });
        return s.size;
      };

      // ── Characters count (player_campaigns → campaign → tenant → user) ──
      const usersWithCharacters = (() => {
        const s = new Set<string>();
        (playerCampaigns || []).forEach((pc: any) => {
          const tId = campToTenant[pc.campaign_id];
          if (tId) { const uid = tenantToUser[tId]; if (uid) s.add(uid); }
        });
        return s.size;
      })();

      // ── NPCs count ──
      const usersWithNpcs = (() => {
        const s = new Set<string>();
        (npcRelations || []).forEach((n: any) => {
          const campId = pcToCamp[n.player_campaign_id];
          if (!campId) return;
          const tId = campToTenant[campId];
          if (!tId) return;
          const uid = tenantToUser[tId];
          if (uid) s.add(uid);
        });
        return s.size;
      })();

      // ═══ SECTION 1: Activation Funnel ═══
      const funnel = [
        { step: "Cadastro", count: totalUsers, pct: 100 },
        { step: "Onboarding", count: onboardedUsers, pct: totalUsers > 0 ? Math.round((onboardedUsers / totalUsers) * 100) : 0 },
        { step: "1ª Campanha", count: usersWithFeature(campaigns), pct: totalUsers > 0 ? Math.round((usersWithFeature(campaigns) / totalUsers) * 100) : 0 },
        { step: "1º Jogador", count: usersWithFeature(players), pct: totalUsers > 0 ? Math.round((usersWithFeature(players) / totalUsers) * 100) : 0 },
        { step: "1º Personagem", count: usersWithCharacters, pct: totalUsers > 0 ? Math.round((usersWithCharacters / totalUsers) * 100) : 0 },
        { step: "1ª Sessão", count: usersWithFeature(sessions), pct: totalUsers > 0 ? Math.round((usersWithFeature(sessions) / totalUsers) * 100) : 0 },
        { step: "1ª Nota", count: usersWithFeature(notes), pct: totalUsers > 0 ? Math.round((usersWithFeature(notes) / totalUsers) * 100) : 0 },
        { step: "1º Whiteboard", count: usersWithFeature(whiteboards), pct: totalUsers > 0 ? Math.round((usersWithFeature(whiteboards) / totalUsers) * 100) : 0 },
        { step: "1º NPC", count: usersWithNpcs, pct: totalUsers > 0 ? Math.round((usersWithNpcs / totalUsers) * 100) : 0 },
      ];

      // ═══ SECTION 2: AI Details (last 30d) ═══
      const { data: aiLogs } = await supabase
        .from("ai_usage_logs")
        .select("user_id, feature, model, created_at")
        .gte("created_at", d30)
        .order("created_at", { ascending: true });

      const aiByFeature: Record<string, number> = {};
      const aiByDay: Record<string, number> = {};
      const aiByUser: Record<string, { count: number; features: Set<string> }> = {};

      (aiLogs || []).forEach((l: any) => {
        aiByFeature[l.feature] = (aiByFeature[l.feature] || 0) + 1;
        const day = l.created_at.substring(0, 10);
        aiByDay[day] = (aiByDay[day] || 0) + 1;
        if (!aiByUser[l.user_id]) aiByUser[l.user_id] = { count: 0, features: new Set() };
        aiByUser[l.user_id].count++;
        aiByUser[l.user_id].features.add(l.feature);
      });

      const aiTopUsers = Object.entries(aiByUser)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([uid, data]) => ({ user_id: uid, count: data.count, features: Array.from(data.features) }));

      if (aiTopUsers.length > 0) {
        const { data: aiProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", aiTopUsers.map(u => u.user_id));
        const profileMap: Record<string, any> = {};
        (aiProfiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
        aiTopUsers.forEach((u: any) => {
          const p = profileMap[u.user_id];
          u.display_name = p?.display_name || "Sem nome";
          u.avatar_url = p?.avatar_url || null;
        });
      }

      const aiDailyTrend = Object.entries(aiByDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, count]) => ({ day, count }));
      const aiFeatures = Object.entries(aiByFeature)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      // ═══ SECTION 3: PWA Stats ═══
      const { data: pwaEvents } = await supabase
        .from("pwa_events")
        .select("id, user_id, event_type, user_agent, created_at")
        .order("created_at", { ascending: false });

      const evts = pwaEvents || [];
      const pwaInstalls = evts.filter((e: any) => e.event_type === "install");
      const pwaActive = evts.filter((e: any) => e.event_type === "active_session");
      const uniqueInstallers = new Set(pwaInstalls.map((e: any) => e.user_id));
      const uniqueActiveUsers = new Set(pwaActive.map((e: any) => e.user_id));
      const pwaNow = new Date();
      const pwa30 = new Date(pwaNow.getTime() - 30 * 86400000);
      const pwa7 = new Date(pwaNow.getTime() - 7 * 86400000);
      const installs30d = pwaInstalls.filter((e: any) => new Date(e.created_at) >= pwa30).length;
      const installs7d = pwaInstalls.filter((e: any) => new Date(e.created_at) >= pwa7).length;
      const activeUsers30d = new Set(pwaActive.filter((e: any) => new Date(e.created_at) >= pwa30).map((e: any) => e.user_id)).size;
      const activeUsers7d = new Set(pwaActive.filter((e: any) => new Date(e.created_at) >= pwa7).map((e: any) => e.user_id)).size;

      // Daily install trend
      const dailyInstalls: Record<string, number> = {};
      const dailyActive: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(pwaNow.getTime() - i * 86400000).toISOString().slice(0, 10);
        dailyInstalls[d] = 0;
        dailyActive[d] = 0;
      }
      for (const e of pwaInstalls) {
        const d = (e as any).created_at?.slice(0, 10);
        if (d && dailyInstalls[d] !== undefined) dailyInstalls[d]++;
      }
      const dailyActiveUsers: Record<string, Set<string>> = {};
      for (const d of Object.keys(dailyActive)) dailyActiveUsers[d] = new Set();
      for (const e of pwaActive) {
        const d = (e as any).created_at?.slice(0, 10);
        if (d && dailyActiveUsers[d]) dailyActiveUsers[d].add((e as any).user_id);
      }
      for (const d of Object.keys(dailyActive)) dailyActive[d] = dailyActiveUsers[d].size;
      const installTrend = Object.entries(dailyInstalls).map(([day, count]) => ({ day, installs: count, active: dailyActive[day] || 0 }));

      // Platform breakdown
      const platforms: Record<string, number> = { Android: 0, iOS: 0, Desktop: 0, Outro: 0 };
      for (const e of pwaInstalls) {
        const ua = ((e as any).user_agent || "").toLowerCase();
        if (ua.includes("android")) platforms.Android++;
        else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) platforms["iOS"]++;
        else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) platforms.Desktop++;
        else platforms.Outro++;
      }

      // ═══ SECTION 4: Retention Cohorts (reuses shared data) ═══
      const userActivity: Record<string, Set<string>> = {};
      const addActivity = (items: any[], dateField = "created_at") => {
        (items || []).forEach((item: any) => {
          const userId = userByTenant[item.tenant_id];
          if (!userId) return;
          const month = item[dateField]?.substring(0, 7);
          if (!month) return;
          if (!userActivity[userId]) userActivity[userId] = new Set();
          userActivity[userId].add(month);
        });
      };
      addActivity(campaigns || []);
      addActivity(notes || []);
      addActivity(sessions || []);
      addActivity(players || []);
      addActivity(whiteboards || []);
      // player_campaigns reference campaign_id, resolve tenant
      (playerCampaigns || []).forEach((pc: any) => {
        const tId = campToTenant[pc.campaign_id];
        if (!tId) return;
        const userId = userByTenant[tId];
        if (!userId) return;
        const month = pc.joined_at?.substring(0, 7);
        if (!month) return;
        if (!userActivity[userId]) userActivity[userId] = new Set();
        userActivity[userId].add(month);
      });

      // Build cohorts by signup month
      const cohortUsers: Record<string, string[]> = {};
      profiles.forEach((p: any) => {
        const month = p.created_at?.substring(0, 7);
        if (!month) return;
        if (!cohortUsers[month]) cohortUsers[month] = [];
        cohortUsers[month].push(p.user_id);
      });

      const sortedMonths = Object.keys(cohortUsers).sort();
      const cohorts = sortedMonths.map(signupMonth => {
        const users = cohortUsers[signupMonth];
        const size = users.length;
        const retention: Record<number, number> = {};
        const [sYear, sMon] = signupMonth.split("-").map(Number);
        const [cYear, cMon] = currentMonth.split("-").map(Number);
        const maxOffset = (cYear - sYear) * 12 + (cMon - sMon);
        for (let offset = 0; offset <= Math.min(maxOffset, 11); offset++) {
          const targetDate = new Date(sYear, sMon - 1 + offset, 1);
          const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
          if (targetMonth > currentMonth) break;
          const activeCount = users.filter(uid => userActivity[uid]?.has(targetMonth)).length;
          retention[offset] = size > 0 ? Math.round((activeCount / size) * 100) : 0;
        }
        return { month: signupMonth, size, retention };
      });

      const activeEver = Object.keys(userActivity).length;
      const lastMonth = (() => {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })();
      const activeThisMonth = Object.values(userActivity).filter(s => s.has(currentMonth)).length;
      const activeLastMonth = Object.values(userActivity).filter(s => s.has(lastMonth)).length;

      // ═══ SECTION 5: Activity Buckets (replaces admin_user_activity_buckets RPC) ═══
      // We use auth.users last_sign_in_at — query via service role
      const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 10000 });
      const allUsers = authUsers?.users || [];
      const totalAuthUsers = allUsers.length;

      const bucketDefs = [
        { bucket: "today", minDays: 0, maxDays: 1 },
        { bucket: "1d", minDays: 1, maxDays: 2 },
        { bucket: "2d", minDays: 2, maxDays: 7 },
        { bucket: "7d", minDays: 7, maxDays: 15 },
        { bucket: "15d", minDays: 15, maxDays: 21 },
        { bucket: "21d", minDays: 21, maxDays: 30 },
        { bucket: "30d", minDays: 30, maxDays: 60 },
        { bucket: "2m", minDays: 60, maxDays: 90 },
        { bucket: "3m", minDays: 90, maxDays: 180 },
        { bucket: "6m", minDays: 180, maxDays: 365 },
        { bucket: "1y+", minDays: 365, maxDays: Infinity },
      ];

      const buckets = bucketDefs.map((def, idx) => {
        const cnt = allUsers.filter((u: any) => {
          if (!u.last_sign_in_at) return def.bucket === "1y+";
          const daysSince = (now.getTime() - new Date(u.last_sign_in_at).getTime()) / 86400000;
          return daysSince >= def.minDays && daysSince < def.maxDays;
        }).length;
        return { bucket: def.bucket, cnt, sort_order: idx + 1 };
      });

      const segActive = allUsers.filter((u: any) => u.last_sign_in_at && (now.getTime() - new Date(u.last_sign_in_at).getTime()) < 7 * 86400000).length;
      const segAtRisk = allUsers.filter((u: any) => {
        if (!u.last_sign_in_at) return false;
        const d = (now.getTime() - new Date(u.last_sign_in_at).getTime()) / 86400000;
        return d >= 7 && d < 30;
      }).length;
      const segDormant = allUsers.filter((u: any) => {
        if (!u.last_sign_in_at) return false;
        const d = (now.getTime() - new Date(u.last_sign_in_at).getTime()) / 86400000;
        return d >= 30 && d < 90;
      }).length;
      const segLost = allUsers.filter((u: any) => !u.last_sign_in_at || (now.getTime() - new Date(u.last_sign_in_at).getTime()) >= 90 * 86400000).length;

      const dau = allUsers.filter((u: any) => u.last_sign_in_at && (now.getTime() - new Date(u.last_sign_in_at).getTime()) < 86400000).length;
      const wau = segActive;
      const mau = allUsers.filter((u: any) => u.last_sign_in_at && (now.getTime() - new Date(u.last_sign_in_at).getTime()) < 30 * 86400000).length;

      // ═══ Build consolidated response ═══
      return new Response(JSON.stringify({
        funnel,
        ai_details: { features: aiFeatures, daily_trend: aiDailyTrend, top_users: aiTopUsers },
        pwa_stats: {
          total_installs: uniqueInstallers.size,
          total_active_pwa_users: uniqueActiveUsers.size,
          installs_30d: installs30d,
          installs_7d: installs7d,
          active_users_30d: activeUsers30d,
          active_users_7d: activeUsers7d,
          install_trend: installTrend,
          platforms: Object.entries(platforms).filter(([_, v]) => v > 0).map(([name, count]) => ({ name, count })),
        },
        retention: {
          cohorts: cohorts.slice(-12),
          summary: {
            total_users: totalUsers,
            activated_ever: activeEver,
            activation_rate: totalUsers > 0 ? Math.round((activeEver / totalUsers) * 100) : 0,
            active_this_month: activeThisMonth,
            active_last_month: activeLastMonth,
            mom_retention: activeLastMonth > 0 ? Math.round((activeThisMonth / activeLastMonth) * 100) : 0,
          },
        },
        activity_buckets: {
          total_users: totalAuthUsers,
          buckets,
          segments: { active: segActive, at_risk: segAtRisk, dormant: segDormant, lost: segLost },
          dau,
          wau,
          mau,
          critical_inactive: segLost,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ PWA STATS (legacy — kept for backward compatibility) ═══
    if (action === "pwa-stats") {
      const { data: allEvents } = await supabase
        .from("pwa_events")
        .select("id, user_id, event_type, user_agent, created_at")
        .order("created_at", { ascending: false });

      const events = allEvents || [];
      const installs = events.filter((e: any) => e.event_type === "install");
      const activeSessions = events.filter((e: any) => e.event_type === "active_session");

      // Unique users
      const uniqueInstallers = new Set(installs.map((e: any) => e.user_id));
      const uniqueActiveUsers = new Set(activeSessions.map((e: any) => e.user_id));

      // Last 30d / 7d
      const now = new Date();
      const d30 = new Date(now.getTime() - 30 * 86400000);
      const d7 = new Date(now.getTime() - 7 * 86400000);

      const installs30d = installs.filter((e: any) => new Date(e.created_at) >= d30).length;
      const installs7d = installs.filter((e: any) => new Date(e.created_at) >= d7).length;

      const activeUsers30d = new Set(
        activeSessions.filter((e: any) => new Date(e.created_at) >= d30).map((e: any) => e.user_id)
      ).size;
      const activeUsers7d = new Set(
        activeSessions.filter((e: any) => new Date(e.created_at) >= d7).map((e: any) => e.user_id)
      ).size;

      // Daily installs trend (last 30d)
      const dailyInstalls: Record<string, number> = {};
      const dailyActive: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
        dailyInstalls[d] = 0;
        dailyActive[d] = 0;
      }
      for (const e of installs) {
        const d = (e as any).created_at?.slice(0, 10);
        if (d && dailyInstalls[d] !== undefined) dailyInstalls[d]++;
      }
      // For active, count unique users per day
      const dailyActiveUsers: Record<string, Set<string>> = {};
      for (const d of Object.keys(dailyActive)) dailyActiveUsers[d] = new Set();
      for (const e of activeSessions) {
        const d = (e as any).created_at?.slice(0, 10);
        if (d && dailyActiveUsers[d]) dailyActiveUsers[d].add((e as any).user_id);
      }
      for (const d of Object.keys(dailyActive)) dailyActive[d] = dailyActiveUsers[d].size;

      const installTrend = Object.entries(dailyInstalls).map(([day, count]) => ({ day, installs: count, active: dailyActive[day] || 0 }));

      // Platform breakdown from user_agent
      const platforms: Record<string, number> = { Android: 0, iOS: 0, Desktop: 0, Outro: 0 };
      for (const e of installs) {
        const ua = ((e as any).user_agent || "").toLowerCase();
        if (ua.includes("android")) platforms.Android++;
        else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) platforms["iOS"]++;
        else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) platforms.Desktop++;
        else platforms.Outro++;
      }

      return new Response(JSON.stringify({
        total_installs: uniqueInstallers.size,
        total_active_pwa_users: uniqueActiveUsers.size,
        installs_30d: installs30d,
        installs_7d: installs7d,
        active_users_30d: activeUsers30d,
        active_users_7d: activeUsers7d,
        install_trend: installTrend,
        platforms: Object.entries(platforms).filter(([_, v]) => v > 0).map(([name, count]) => ({ name, count })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    console.error("admin-users error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
