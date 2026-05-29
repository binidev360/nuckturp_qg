/**
 * process-scheduled-posts
 * ───────────────────────
 * Edge Function executada via pg_cron 2x ao dia (07h e 19h BRT).
 * 
 * Responsabilidades:
 * 1. Busca posts com status='published', published_at <= now() e first_published_at IS NULL
 * 2. Marca first_published_at = now() (trava de unicidade)
 * 3. Dispara notificações para admins e seguidores do autor
 * 4. Envia push notifications para seguidores com push habilitado
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Buscar posts agendados que atingiram o horário de publicação
    //    status = 'published', published_at <= now(), first_published_at IS NULL
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from("posts")
      .select(`
        id, title, slug, author_id, blog_author_id, 
        og_image_url, cover_url, published_at
      `)
      .eq("status", "published")
      .is("first_published_at", null)
      .not("blog_author_id", "is", null)
      .lte("published_at", new Date().toISOString());

    if (fetchError) {
      console.error("Erro ao buscar posts agendados:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log("Nenhum post agendado para processar.");
      return new Response(
        JSON.stringify({ processed: 0, message: "Nenhum post agendado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processando ${scheduledPosts.length} post(s) agendado(s)...`);

    let processed = 0;

    for (const post of scheduledPosts) {
      try {
        // 2. Marcar first_published_at (trava de unicidade)
        const { error: updateError } = await supabase
          .from("posts")
          .update({ first_published_at: new Date().toISOString() })
          .eq("id", post.id)
          .is("first_published_at", null); // Double-check para evitar race condition

        if (updateError) {
          console.error(`Erro ao atualizar post ${post.id}:`, updateError);
          continue;
        }

        // 3. Buscar info do autor
        const { data: authorInfo } = await supabase
          .from("blog_authors")
          .select("id, name, slug, profile_id, profiles!blog_authors_profile_id_fkey(nickname, display_name, slug)")
          .eq("id", post.blog_author_id)
          .single();

        if (!authorInfo) {
          console.warn(`Autor não encontrado para post ${post.id}`);
          processed++;
          continue;
        }

        const profile = (authorInfo as any).profiles;
        const authorName =
          profile?.nickname || profile?.display_name || authorInfo.name || "Autor";
        const authorSlug = profile?.slug || authorInfo.slug;
        const postUrl = `/m/${authorSlug}/blog/${post.slug}`;

        // 4. Notificação para admins
        const { data: adminNotif } = await supabase
          .from("notifications")
          .insert({
            title: "Post agendado publicado",
            body: `${authorName} agendou "${post.title.substring(0, 80)}". Post está online agora.`,
            type: "alert",
            target_audience: "admins",
            created_by: post.author_id,
            status: "sent",
            published_at: new Date().toISOString(),
            link_url: "/admin/blog?tab=community",
            link_label: "Ver Comunidade",
          })
          .select("id")
          .single();

        if (adminNotif) {
          // Entregar para admins
          const { data: admins } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (admins && admins.length > 0) {
            await supabase
              .from("user_notifications")
              .insert(
                admins.map((a) => ({
                  notification_id: adminNotif.id,
                  user_id: a.user_id,
                }))
              );
          }
        }

        // 5. Notificação para seguidores do autor
        const { data: followers } = await supabase
          .from("author_follows")
          .select("user_id")
          .eq("blog_author_id", post.blog_author_id)
          .neq("user_id", post.author_id);

        if (followers && followers.length > 0) {
          const { data: followerNotif } = await supabase
            .from("notifications")
            .insert({
              title: `Novo artigo de ${authorName}`,
              body: post.title,
              type: "blog_follow",
              status: "published",
              published_at: new Date().toISOString(),
              created_by: post.author_id,
              image_url: post.og_image_url || post.cover_url,
              link_url: postUrl,
              link_label: "Ler artigo",
              target_audience: "followers",
            })
            .select("id")
            .single();

          if (followerNotif) {
            await supabase
              .from("user_notifications")
              .insert(
                followers.map((f) => ({
                  notification_id: followerNotif.id,
                  user_id: f.user_id,
                }))
              );

            // Atualizar sent_count
            await supabase
              .from("notifications")
              .update({ sent_count: followers.length })
              .eq("id", followerNotif.id);

            // 6. Push notifications para seguidores com push habilitado
            const followerIds = followers.map((f) => f.user_id);
            const { data: pushUsers } = await supabase
              .from("profiles")
              .select("user_id")
              .in("user_id", followerIds)
              .eq("push_enabled", true);

            if (pushUsers && pushUsers.length > 0) {
              try {
                await supabase.functions.invoke("send-push", {
                  body: {
                    user_ids: pushUsers.map((u) => u.user_id),
                    title: `📝 ${authorName} publicou!`,
                    body: post.title,
                    url: postUrl,
                    image: post.og_image_url || post.cover_url,
                  },
                });
              } catch (pushErr) {
                console.warn(`Push falhou para post ${post.id}:`, pushErr);
              }
            }
          }
        }

        processed++;
        console.log(`✅ Post "${post.title}" processado com sucesso.`);
      } catch (postErr) {
        console.error(`Erro processando post ${post.id}:`, postErr);
      }
    }

    // 7. Auto-ping motores de busca se houve posts processados
    if (processed > 0) {
      try {
        const publishedUrls = scheduledPosts
          .filter(p => p.slug)
          .map(p => `/novidades/${p.slug}`);

        await supabase.functions.invoke("ping-search-engines", {
          body: { urls: publishedUrls, sitemap: true },
        });
        console.log(`🔔 Ping enviado para ${publishedUrls.length} URL(s).`);
      } catch (pingErr) {
        console.warn("Ping para motores de busca falhou:", pingErr);
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        total: scheduledPosts.length,
        message: `${processed}/${scheduledPosts.length} posts processados.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro geral:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar posts agendados." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
