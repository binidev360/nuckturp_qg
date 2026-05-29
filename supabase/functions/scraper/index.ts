/**
 * scraper — Router unificado para scraping de sites externos.
 * 
 * Sources:
 *   - mesaquest:  Scrape de perfis e mesas do MesaQuest
 *   - worldcraft: Scrape de mundos do WorldCraft via Firecrawl
 * 
 * Consolidação de 2 edge functions em 1 para eliminar cold starts.
 * Endpoints públicos com rate limiting por IP.
 * 
 * instagram-thumbnail NÃO foi incluído pois retorna imagem binária (não JSON).
 */

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, number[]>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Rate limit: 10 req/min per IP (compartilhado entre sources) */
function checkRateLimit(req: Request): boolean {
  // Preferência: x-real-ip (definido pela infra, não pelo cliente)
  // Fallback: primeiro IP de x-forwarded-for (pode ser forjado, mas é o que temos)
  const clientIp =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const now = Date.now();
  if (!rateLimitMap.has(clientIp)) rateLimitMap.set(clientIp, []);
  const timestamps = rateLimitMap.get(clientIp)!.filter(t => now - t < 60_000);
  if (timestamps.length >= 10) return false;
  timestamps.push(now);
  rateLimitMap.set(clientIp, timestamps);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// MESAQUEST — Parsing de perfis e mesas
// ═══════════════════════════════════════════════════════════════════════════

interface MesaQuestTable {
  name: string;
  system: string;
  type: string;
  status: string;
  rating: string;
  slots: string;
  price: string;
  priceMonthly: string;
  date: string;
  time: string;
  frequency: string;
  modality: string;
  tags: string[];
  bannerUrl: string;
  detailsUrl: string;
}

interface MasterStats {
  tablesNarrated: number;
  overallRating: string;
  totalReviews: number;
  specialties: { system: string; count: number }[];
}

function parsePerformance(html: string): MasterStats {
  const stats: MasterStats = { tablesNarrated: 0, overallRating: '', totalReviews: 0, specialties: [] };
  const textContent = html.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n');

  const narratedMatch = textContent.match(/(\d+)\s*Mesas?\s*Narradas?/i);
  if (narratedMatch) stats.tablesNarrated = parseInt(narratedMatch[1]);

  const ratingMatch = textContent.match(/([\d.]+)\s*Avaliação\s*Geral/i);
  if (ratingMatch) stats.overallRating = ratingMatch[1];

  const reviewsMatch = textContent.match(/(\d+)\s*recomendaç/i);
  if (reviewsMatch) stats.totalReviews = parseInt(reviewsMatch[1]);

  const specRegex = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s:&'()-]+?)\n\s*(\d+)\s*mesas?\b/gi;
  let specMatch;
  while ((specMatch = specRegex.exec(textContent)) !== null) {
    const system = specMatch[1].trim();
    if (system.length > 3 && system.length < 80 && !/Mesas Narradas|Avaliação|Performance|Especialidades/i.test(system)) {
      stats.specialties.push({ system, count: parseInt(specMatch[2]) });
    }
  }

  return stats;
}

function parseSingleTable(html: string, url: string): MesaQuestTable | null {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      const t = pageProps?.gameTable || pageProps?.table;
      if (t) {
        const sessionPrice = t.price ? `R$ ${(t.price / 100).toFixed(2).replace('.', ',')}` : (t.priceFormatted || '');
        let monthlyPrice = '';
        if (t.monthlyPrice) {
          monthlyPrice = `R$ ${(t.monthlyPrice / 100).toFixed(2).replace('.', ',')}/mês`;
        } else if (t.priceMonthly) {
          monthlyPrice = `R$ ${(t.priceMonthly / 100).toFixed(2).replace('.', ',')}/mês`;
        }
        if (!monthlyPrice) {
          const textContent = html.replace(/<[^>]+>/g, '\n');
          const monthlyMatch = textContent.match(/R\$\s*([\d.,]+)\s*por\s*m[eê]s/i);
          if (monthlyMatch) monthlyPrice = `R$ ${monthlyMatch[1]}/mês`;
        }
        return {
          name: t.name || t.title || '',
          system: t.system?.name || t.systemName || t.system || '',
          type: t.type === 'one_shot' ? 'One-shot' : t.type === 'campaign' ? 'Campanha' : (t.type || ''),
          status: t.status || '',
          rating: String(t.averageRating || t.rating || ''),
          slots: t.slots ? `${t.filledSlots || 0}/${t.totalSlots || t.slots}` : '',
          price: sessionPrice,
          priceMonthly: monthlyPrice,
          date: t.nextSessionDate || t.startDate || '',
          time: t.schedule || t.timeRange || '',
          frequency: t.frequency || '',
          modality: t.modality || (t.isOnline ? 'Online' : 'Presencial'),
          tags: t.tags || t.genres || [],
          bannerUrl: t.bannerUrl || t.imageUrl || t.coverUrl || '',
          detailsUrl: url,
        };
      }
    } catch { /* fall through */ }
  }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';
  if (!name) return null;

  let bannerUrl = '';
  const bannerMatch = html.match(/src="(https:\/\/mesaquest\.com\.br\/_next\/image\?url=([^"&]+)[^"]*)"/i);
  if (bannerMatch) {
    try { bannerUrl = decodeURIComponent(bannerMatch[2]); } catch { bannerUrl = bannerMatch[1]; }
  }
  if (!bannerUrl) {
    const s3Match = html.match(/src="(https:\/\/s3[^"]*game-tables\/[^"]+)"/i);
    if (s3Match) bannerUrl = s3Match[1];
  }
  if (!bannerUrl) {
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogMatch) bannerUrl = ogMatch[1];
  }

  const textContent = html.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n');
  let type = '';
  if (/one-shot/i.test(textContent)) type = 'One-shot';
  else if (/campanha/i.test(textContent)) type = 'Campanha';
  const priceMatch = textContent.match(/R\$\s*[\d.,]+(?:\s*por\s*sess[aã]o)?/i);
  const monthlyMatch = textContent.match(/R\$\s*([\d.,]+)\s*por\s*m[eê]s/i);

  return {
    name, system: '', type, status: '', rating: '', slots: '',
    price: priceMatch ? priceMatch[0] : '',
    priceMonthly: monthlyMatch ? `R$ ${monthlyMatch[1]}/mês` : '',
    date: '', time: '', frequency: '',
    modality: /presencial/i.test(textContent) ? 'Presencial' : 'Online',
    tags: [], bannerUrl, detailsUrl: url,
  };
}

function parseTables(html: string, url: string): { tables: MesaQuestTable[]; stats: MasterStats } {
  const stats = parsePerformance(html);
  const tables: MesaQuestTable[] = [];

  // Single table detail page
  if (/\/mesas\/[A-Z0-9]{10,}/i.test(url)) {
    const single = parseSingleTable(html, url);
    if (single) tables.push(single);
    return { tables, stats };
  }

  // Try Next.js __NEXT_DATA__ first
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      const gameTables = pageProps?.gameTables || pageProps?.user?.gameTables || [];
      if (Array.isArray(gameTables) && gameTables.length > 0) {
        for (const t of gameTables) {
          const sessionPrice = t.price ? `R$ ${(t.price / 100).toFixed(2).replace('.', ',')}` : (t.priceFormatted || '');
          let monthlyPrice = '';
          if (t.monthlyPrice) {
            monthlyPrice = `R$ ${(t.monthlyPrice / 100).toFixed(2).replace('.', ',')}/mês`;
          } else if (t.priceMonthly) {
            monthlyPrice = `R$ ${(t.priceMonthly / 100).toFixed(2).replace('.', ',')}/mês`;
          }
          tables.push({
            name: t.name || t.title || '',
            system: t.system?.name || t.systemName || t.system || '',
            type: t.type === 'one_shot' ? 'One-shot' : t.type === 'campaign' ? 'Campanha' : (t.type || ''),
            status: t.status || '',
            rating: String(t.averageRating || t.rating || ''),
            slots: t.slots ? `${t.filledSlots || 0}/${t.totalSlots || t.slots}` : '',
            price: sessionPrice,
            priceMonthly: monthlyPrice,
            date: t.nextSessionDate || t.startDate || '',
            time: t.schedule || t.timeRange || '',
            frequency: t.frequency || '',
            modality: t.modality || (t.isOnline ? 'Online' : 'Presencial'),
            tags: t.tags || t.genres || [],
            bannerUrl: t.bannerUrl || t.imageUrl || t.coverUrl || '',
            detailsUrl: t.slug ? `https://mesaquest.com.br/mesas/${t.slug}` : (t.id ? `https://mesaquest.com.br/mesas/${t.id}` : ''),
          });
        }
        return { tables, stats };
      }
    } catch { /* fall through */ }
  }

  // Fallback: HTML parsing
  const detailLinks: string[] = [];
  const linkRegex = /href="(\/mesas\/[A-Z0-9]+)"/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    if (!detailLinks.includes(linkMatch[1])) detailLinks.push(linkMatch[1]);
  }

  const bannerUrls: string[] = [];
  const bannerRegex = /https:\/\/s3[^"&]*?game-tables\/[^"&\s]+/gi;
  let bm;
  const seenBanners = new Set<string>();
  while ((bm = bannerRegex.exec(html)) !== null) {
    const u = bm[0].replace(/\\$/, '');
    if (!seenBanners.has(u)) { seenBanners.add(u); bannerUrls.push(u); }
  }

  const sections = html.split(/Ver Detalhes/i);
  const tableNames: string[] = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const h3Matches = [...sections[i].matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)];
    if (h3Matches.length > 0) {
      const n = h3Matches[h3Matches.length - 1][1].replace(/<[^>]+>/g, '').trim();
      if (n) tableNames.push(n);
    }
  }

  for (let i = 0; i < tableNames.length; i++) {
    const sectionText = sections[i]?.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n') || '';
    const nameIdx = sectionText.lastIndexOf(tableNames[i]);
    const afterName = nameIdx >= 0 ? sectionText.slice(nameIdx + tableNames[i].length) : '';
    const lines = afterName.split('\n').map(l => l.trim()).filter(Boolean);
    const system = lines[0] || '';
    const priceMatch = afterName.match(/R\$\s*[\d.,]+(?:\s*por\s*sess[aã]o)?/i);
    const monthlyMatch = afterName.match(/R\$\s*([\d.,]+)\s*por\s*m[eê]s/i);
    const slotsMatch = afterName.match(/(\d+)\/(\d+)\s*vagas?\s*preenchidas?/i);
    let type = '';
    if (/one-shot/i.test(sectionText)) type = 'One-shot';
    else if (/campanha/i.test(sectionText)) type = 'Campanha';
    const dateMatch = afterName.match(/(\d{2}\/\d{2}\/\d{4})/);
    const timeMatch = afterName.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    let status = '';
    const statusMatch = sectionText.match(/(Começa em [^<\n]+|Quase formando|Em andamento|Finalizada|Lotada)/i);
    if (statusMatch) status = statusMatch[1].trim();
    let frequency = '';
    const freqMatch = afterName.match(/(Semanal|Quinzenal|Mensal)/i);
    if (freqMatch) frequency = freqMatch[1];

    tables.push({
      name: tableNames[i], system, type, status, rating: '',
      slots: slotsMatch ? `${slotsMatch[1]}/${slotsMatch[2]}` : '',
      price: priceMatch ? priceMatch[0] : '',
      priceMonthly: monthlyMatch ? `R$ ${monthlyMatch[1]}/mês` : '',
      date: dateMatch ? dateMatch[1] : '',
      time: timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : '',
      frequency,
      modality: /presencial/i.test(afterName) ? 'Presencial' : 'Online',
      tags: [], bannerUrl: bannerUrls[i] || '',
      detailsUrl: detailLinks[i] ? `https://mesaquest.com.br${detailLinks[i]}` : '',
    });
  }

  return { tables, stats };
}

async function handleMesaQuest(body: Record<string, unknown>) {
  const { mesaquestUrl } = body;

  if (!mesaquestUrl || typeof mesaquestUrl !== 'string') {
    return { _status: 400, success: false, error: 'URL do MesaQuest é obrigatória' };
  }

  let url: URL;
  try { url = new URL(mesaquestUrl as string); } catch {
    return { _status: 400, success: false, error: 'URL inválida' };
  }

  if (!url.hostname.endsWith('mesaquest.com.br')) {
    return { _status: 400, success: false, error: 'URL deve ser do domínio mesaquest.com.br' };
  }

  console.log('Scraping MesaQuest URL:', mesaquestUrl);

  const response = await fetch(mesaquestUrl as string, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NuckturpBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch MesaQuest page:', response.status);
    return { _status: 502, success: false, error: 'Não foi possível acessar a página' };
  }

  const html = await response.text();
  const { tables, stats } = parseTables(html, mesaquestUrl as string);

  console.log(`Parsed ${tables.length} tables, rating: ${stats.overallRating}, reviews: ${stats.totalReviews}`);
  return { success: true, tables, stats };
}

// ═══════════════════════════════════════════════════════════════════════════
// WORLDCRAFT — Parsing de mundos via Firecrawl
// ═══════════════════════════════════════════════════════════════════════════

interface WorldCraftWorld {
  name: string;
  coverUrl: string;
  genre: string;
  shareUrl: string;
  entityCounts: { type: string; count: number }[];
  tags: string[];
  entities: { name: string; coverUrl: string; description: string; tags: string[]; detailUrl: string }[];
}

function parseWorldCraftHtml(html: string, shareUrl: string): WorldCraftWorld {
  const world: WorldCraftWorld = {
    name: '', coverUrl: '', genre: '', shareUrl, entityCounts: [], tags: [], entities: [],
  };

  // Nome do mundo
  const altMatch = html.match(/<img[^>]*alt="([^"]{2,80})"[^>]*class="[^"]*object-cover/i);
  if (altMatch) world.name = altMatch[1].trim();
  if (!world.name) {
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    if (ogTitle) world.name = ogTitle[1].trim();
  }
  if (!world.name) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) world.name = h1[1].replace(/<[^>]+>/g, '').trim();
  }

  // Cover image
  const coverMatch = html.match(/src="(https:\/\/[^"]+\/world-covers\/[^"]+)"/i);
  if (coverMatch) world.coverUrl = coverMatch[1];
  if (!world.coverUrl) {
    const entityCoverMatch = html.match(/src="(https:\/\/[^"]+\/entity-covers\/[^"]+)"/i);
    if (entityCoverMatch) world.coverUrl = entityCoverMatch[1];
  }
  if (!world.coverUrl) {
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogImage) world.coverUrl = ogImage[1];
  }

  const textContent = html.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n');

  // Entity counts
  const entityTypes = ['Personagem', 'Conceito', 'Localidade', 'Item', 'Facção', 'Monstro', 'Organização', 'Evento', 'Missão', 'Criatura', 'Magia', 'Sessão', 'NPC', 'Artefato', 'Classe', 'Raça', 'Habilidade', 'Mapa', 'Religião', 'Idioma'];
  const seenTypes = new Set<string>();
  for (const type of entityTypes) {
    const regex = new RegExp(`(\\d+)\\s*\\n\\s*${type}`, 'gi');
    const match = regex.exec(textContent);
    if (match && !seenTypes.has(type.toLowerCase())) {
      seenTypes.add(type.toLowerCase());
      world.entityCounts.push({ type, count: parseInt(match[1]) });
    }
  }

  // Tags
  const tagsSection = textContent.match(/Tags:\s*\n([\s\S]*?)(?:\n##|\n\d+\s*\n|$)/i);
  if (tagsSection) {
    const rawTags = tagsSection[1].split('\n').map(t => t.trim()).filter(t => t && t.length > 1 && t.length < 50);
    const skipWords = new Set(['Todos', 'Compartilhar', 'Buscar', ...entityTypes]);
    world.tags = rawTags.filter(t => !skipWords.has(t));
  }

  // Entities with cover images
  const entityCoverRegex = /src="(https:\/\/[^"]+\/entity-covers\/[^"]+)"/gi;
  const entityCovers: string[] = [];
  let ecm;
  while ((ecm = entityCoverRegex.exec(html)) !== null) {
    const url = ecm[1];
    if (!entityCovers.includes(url)) entityCovers.push(url);
  }

  const entityAltRegex = /<img[^>]*src="https:\/\/[^"]+\/entity-covers\/[^"]*"[^>]*alt="([^"]{2,60})"[^>]*>/gi;
  const entityNames: string[] = [];
  let eam;
  while ((eam = entityAltRegex.exec(html)) !== null) {
    const name = eam[1].trim();
    if (!entityNames.includes(name)) entityNames.push(name);
  }

  const entityAltRegex2 = /<img[^>]*alt="([^"]{2,60})"[^>]*src="https:\/\/[^"]+\/entity-covers\/[^"]*"[^>]*>/gi;
  while ((eam = entityAltRegex2.exec(html)) !== null) {
    const name = eam[1].trim();
    if (!entityNames.includes(name)) entityNames.push(name);
  }

  const maxEntities = Math.min(entityCovers.length, Math.max(entityNames.length, entityCovers.length), 6);
  for (let i = 0; i < maxEntities; i++) {
    world.entities.push({
      name: entityNames[i] || '', coverUrl: entityCovers[i] || '',
      description: '', tags: [], detailUrl: shareUrl,
    });
  }

  return world;
}

function parseWorldCraftMarkdown(markdown: string, shareUrl: string): WorldCraftWorld {
  const world: WorldCraftWorld = {
    name: '', coverUrl: '', genre: '', shareUrl, entityCounts: [], tags: [], entities: [],
  };

  const coverMatch = markdown.match(/!\[[^\]]*\]\((https:\/\/[^)]+\/world-covers\/[^)]+)\)/);
  if (coverMatch) world.coverUrl = coverMatch[1];

  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) world.name = h1Match[1].trim();

  const entityTypes = ['Personagem', 'Conceito', 'Localidade', 'Item', 'Facção', 'Monstro', 'Organização', 'Evento', 'Missão', 'Criatura', 'Magia', 'Sessão', 'NPC'];
  const seenTypes = new Set<string>();
  for (const type of entityTypes) {
    const regex = new RegExp(`(\\d+)\\s*\\n\\s*${type}`, 'gi');
    const match = regex.exec(markdown);
    if (match && !seenTypes.has(type.toLowerCase())) {
      seenTypes.add(type.toLowerCase());
      world.entityCounts.push({ type, count: parseInt(match[1]) });
    }
  }

  const tagsIdx = markdown.indexOf('Tags:');
  if (tagsIdx >= 0) {
    const afterTags = markdown.slice(tagsIdx + 5);
    const sectionEnd = afterTags.search(/\n##/);
    const tagsText = sectionEnd >= 0 ? afterTags.slice(0, sectionEnd) : afterTags.slice(0, 500);
    world.tags = tagsText.split('\n').map(t => t.trim()).filter(t => t && t.length > 1 && t.length < 50 && !entityTypes.includes(t) && !['Todos', 'Compartilhar'].includes(t));
  }

  const entityRegex = /\[!\[([^\]]{2,60})\]\((https:\/\/[^)]+\/entity-covers\/[^)]+)\)[^]]*?\]\((https:\/\/[^)]+)\)/g;
  let em;
  let entityCount = 0;
  while ((em = entityRegex.exec(markdown)) !== null && entityCount < 6) {
    world.entities.push({
      name: em[1].trim(), coverUrl: em[2], description: '', tags: [], detailUrl: em[3],
    });
    entityCount++;
  }

  return world;
}

async function handleWorldCraft(body: Record<string, unknown>) {
  const { worldcraftUrls } = body;

  if (!Array.isArray(worldcraftUrls) || worldcraftUrls.length === 0) {
    return { _status: 400, success: false, error: 'worldcraftUrls é obrigatório' };
  }

  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return { _status: 500, success: false, error: 'Scraping service not configured' };
  }

  const urls = (worldcraftUrls as unknown[]).slice(0, 5).filter((u: unknown) => {
    if (typeof u !== 'string') return false;
    try { return new URL(u).hostname.endsWith('worldcraft.com.br'); } catch { return false; }
  });

  const worlds: WorldCraftWorld[] = [];

  for (const rawUrl of urls) {
    console.log('Scraping WorldCraft URL via Firecrawl:', rawUrl);
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: rawUrl,
          formats: ['markdown', 'html'],
          waitFor: 3000,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error('Firecrawl error for', rawUrl, data.error || response.status);
        continue;
      }

      let world: WorldCraftWorld;
      if (data.data?.html) {
        world = parseWorldCraftHtml(data.data.html, rawUrl as string);
      } else if (data.data?.markdown) {
        world = parseWorldCraftMarkdown(data.data.markdown, rawUrl as string);
      } else {
        console.error('No content returned for', rawUrl);
        continue;
      }

      if (world.name) {
        worlds.push(world);
        console.log(`Parsed world: ${world.name}, ${world.entityCounts.length} entity types, ${world.entities.length} entities, ${world.tags.length} tags`);
      }
    } catch (err) {
      console.error('Error fetching WorldCraft URL:', rawUrl, err);
    }
  }

  console.log(`Parsed ${worlds.length} WorldCraft worlds total`);
  return { success: true, worlds };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit compartilhado
    if (!checkRateLimit(req)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const source = (body as Record<string, unknown>).source as string;

    if (!source || !['mesaquest', 'worldcraft'].includes(source)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid source. Use: mesaquest, worldcraft' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: Record<string, unknown>;

    switch (source) {
      case 'mesaquest':
        result = await handleMesaQuest(body as Record<string, unknown>);
        break;
      case 'worldcraft':
        result = await handleWorldCraft(body as Record<string, unknown>);
        break;
      default:
        result = { success: false, error: 'Unknown source' };
    }

    const status = (result._status as number) || 200;
    const { _status: _, ...responseData } = result;

    return new Response(JSON.stringify(responseData), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('scraper error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno ao processar a página' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
