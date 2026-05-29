# Inventário de módulos — QG do Mestre (app antigo Vite/React)

> Fonte: `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp` (READ-ONLY). Mapeamento para definir escopo de paridade por módulo na migração para Next.js 16 App Router.
> Data do levantamento: 2026-05-28. Todos os caminhos abaixo são relativos a `src/` do app antigo salvo indicação contrária.

## Stack do app antigo (referência)

- **Build/router**: Vite + `react-router-dom` 6 (SPA, todas as rotas em `App.tsx`, lazy via `lazyRetry`). 47 páginas em `pages/`, ~445 arquivos em `src/`.
- **Data**: `@supabase/supabase-js` (client em `integrations/supabase/client.ts`; types gerados em `integrations/supabase/types.ts`) + `@tanstack/react-query` v5.
- **Auth atual**: `@lovable.dev/cloud-auth-js` (lock-in Lovable — ponto crítico de cutover). `integrations/lovable/index.ts`.
- **UI**: shadcn/ui (50 componentes em `components/ui/`) sobre Radix; Tailwind 3 + `tailwindcss-animate`; `lucide-react`; `sonner` (toasts).
- **Editor rico**: TipTap 3.20 (StarterKit + ~20 extensões + nodes custom).
- **Outras libs notáveis**: `@dnd-kit/*` (drag-drop), `framer-motion` 12 (uso pontual, só 2 arquivos), `recharts` (gráficos admin), `react-hook-form` + `zod`, `dompurify`, `date-fns`, `react-day-picker`, `embla-carousel`, `react-image-crop`, `canvas-confetti`, `react-resizable-panels`, `cmdk` (busca), `input-otp`, `vaul`, `next-themes`.
- **i18n**: `i18next` + `react-i18next` + language detector. Locales em `i18n/locales/{pt-BR,en}.ts` (~885 linhas cada).
- **PWA**: `vite-plugin-pwa` (`registerType: autoUpdate`, workbox + `importScripts: ["/sw-push.js"]` para Web Push). Manifest no `vite.config.ts`.
- **Edge functions** (27, em `supabase/functions/`): `admin-users`, `analyze-feedback`, `analyze-post-links`, `apply-link-corrections`, `auth-email-hook`, `billing`, `fetch-og-image`, `finance-extract-receipt`, `generate-adventure`, `import-wordpress`, `instagram-thumbnail`, `og-profile-image`, `og-proxy`, `optimize-images`, `ping-search-engines`, `process-conditional-notifications`, `process-email-queue`, `process-push-queue`, `process-scheduled-posts`, `redirect-legacy`, `rss`, `scraper`, `send-push`, `seo-specialist`, `session-prep-check`, `sitemap`, `_shared`.
- **Migrations**: 209 arquivos SQL em `supabase/migrations/`.

### Nota transversal sobre o port para Next
A maior parte do app é **client-only por design** (React Query + Supabase client no browser, react-router). No App Router isso vira ou Client Components (`"use client"`) ou refatoração para Server Components + Server Actions. Páginas SEO (blog/dicionário/perfil público/landings) são as que **mais ganham** com SSR/SSG e devem ser priorizadas como Server Components. Páginas autenticadas pesadas (whiteboard, editores) tendem a virar Client Components com `dynamic(ssr:false)`.

---

## 1. Autenticação / Perfil / Onboarding — **complexidade ALTA**

- **Páginas**: `pages/Auth.tsx`, `pages/ResetPassword.tsx`, `pages/Onboarding.tsx`, `pages/Profile.tsx`, `pages/PublicProfile.tsx` (`/m/:slug`).
- **Componentes**: `components/ProtectedRoute.tsx`, `components/AppLayout.tsx`, `components/ProfileOnboarding.tsx`, `components/ProfileIdentitySetup.tsx`, `components/profile/Profile*Tab.tsx` (Identity, Links, Preferences, Notifications, Settings, Subscription, Shares, Blog), `components/AvatarCropDialog.tsx`/`CoverCropDialog.tsx`.
- **Hooks**: `useAuth.tsx` (AuthProvider — core de tudo), `useProfile.ts`, `useSubscription.ts`.
- **Supabase**: tabelas `memberships`, `profiles`, `user_roles`; edge `auth-email-hook` (hook de e-mail de auth), `og-profile-image` (OG do perfil público).
- **Libs**: `@lovable.dev/cloud-auth-js` (auth), `react-image-crop`.
- **Por que ALTA / riscos**: ⚠️ É o módulo de maior risco de cutover. O guardrail exige preservar **UUIDs de `auth.users` + `auth.identities` + `email_confirmed_at`**. Migrar de `@lovable.dev/cloud-auth-js` para Supabase Auth próprio (com `@supabase/ssr` no App Router: middleware + server/client) é spike crítico (Fase 00). `AuthProvider` é raiz do app — toda página protegida depende dele. `PublicProfile` (`/m/:slug`) é SEO → deve virar Server Component com `generateMetadata`.

## 2. Campanhas / Aventuras / Sessões — **complexidade MÉDIA**

- **Páginas**: `pages/Campaigns.tsx`, `pages/CampaignDetail.tsx` (`/campaigns/:id`).
- **Componentes**: `components/campaign/*` (`SessionDialog`, `SessionPage`, `SessionPresenceSection`, `SessionFeedbackSection`, `CampaignPlayersSection`, `DuplicateSessionPopover`, `Duration*Editor`, `CampaignPdfActions`), `components/CampaignShareDialog.tsx`, `components/SessionChecklist.tsx`.
- **Hooks**: `useCampaigns.ts`, `useSessions.ts`, `useSessionPlayers.ts`.
- **Supabase**: `campaigns`, `campaign_shares`, `sessions`, `session_players`.
- **Libs**: export PDF (`lib/exportPdf.ts`).
- **Riscos**: CRUD relacional padrão; port direto como Client Components. Compartilhamento (`campaign_shares`) precisa atenção em RLS multi-tenant.

## 3. Jogadores (CRM) / Personagens — **complexidade MÉDIA**

- **Páginas**: `pages/Players.tsx`, `pages/PlayerDetail.tsx` (`/players/:id`), `pages/CharacterDetail.tsx` (`/campaigns/:campaignId/characters/:characterId`).
- **Componentes**: `components/character/Character*Tab.tsx` (Backstory, Inventory, Notes, Player, Presence, Relationships, Header), `components/character/CharacterCropDialog.tsx`, `components/PlayerDetailDrawer.tsx`, `components/player/ConsentResponse{Dialog,Drawer}.tsx`.
- **Hooks**: `usePlayers.ts`, `useCharacter.ts`, `useCharacterRelationships.ts`.
- **Supabase**: `players`, `player_campaigns`, `character_session_notes`, `character_inventory`, `character_relationships`, `session_players`.
- **Riscos**: relacionamento jogador↔campanha↔personagem é o nó relacional mais denso. Consentimento (LGPD) tem fluxo público próprio (ver módulo 13).

## 4. Diário do Mestre (editor TipTap) / Notas — **complexidade ALTA**

- **Páginas**: `pages/Diary.tsx` (`/diary`), `pages/PublicNote.tsx` (`/n/:token` — nota compartilhada pública).
- **Componentes**: `components/NotionEditor.tsx` (editor TipTap principal), `components/NotionPage.tsx`, nodes custom em `components/editor/` (`CalloutNode`, `ColumnExtension`, `EmbedCardNode`, `IframeNode`, `MentionNode`, `ResizableYoutubeNode`, `SpoilerNode`, `TitledDividerNode`), `components/FolderTree.tsx`/`FolderBreadcrumbs.tsx`, `components/NoteShareDialog.tsx`.
- **Hooks**: `useNotes.ts`, `useFolders.ts`, `useNoteShares.ts`, `useShareInvites.ts`, `useNotePresence.ts`, `useTemplates.ts`; libs de template em `lib/noteTemplates.ts`.
- **Supabase**: `notes`, `folders`, `note_shares`, `content_templates`; export `lib/exportPdf.ts`.
- **Libs**: TipTap completo (StarterKit + Placeholder, TaskList/Item, Underline, Highlight, TextAlign, Link, Color, TextStyle, Sub/Superscript, e **lazy-loaded**: Table/Row/Cell/Header, Mention, Youtube), `dompurify`.
- **Por que ALTA / riscos**: ⚠️ Editor TipTap é **client-only** → `dynamic(ssr:false)`. Nodes custom + extensões lazy-loaded precisam reempacotamento no esquema de chunks do Next. Presença em tempo real (`useNotePresence`) usa Supabase Realtime. `PublicNote` (`/n/:token`) é público e renderiza HTML salvo → cuidado com sanitização (já usa DOMPurify) e pode virar Server Component para SEO/perf.

## 5. Quadro de Ideias (whiteboard infinito) — **complexidade ALTA**

- **Página**: `pages/Whiteboard.tsx` (`/whiteboard` — fora do `AppLayout`, só `ProtectedRoute`).
- **Componentes** (`components/whiteboard/`): `WhiteboardEditor.tsx` (core), `WhiteboardCanvasLayer.tsx`, `WhiteboardItem.tsx`, `WhiteboardToolbar.tsx`, `WhiteboardFAB.tsx`, `WhiteboardMinimap.tsx`, `WhiteboardConnectorMenu.tsx`, `WhiteboardLayersPanel.tsx`, `WhiteboardPresentation.tsx`, `WhiteboardSearchOverlay.tsx`, `WhiteboardStatusBar.tsx`, `WhiteboardDialogs.tsx`, `WhiteboardTemplateDialog.tsx`, `WhiteboardExportDialog.tsx`, `WhiteboardList.tsx`; extensões TipTap próprias (`FontFamilyExtension.ts`, `FontSizeExtension.ts`); `constants.ts`, `utils.ts`.
- **Hooks**: `useWhiteboard.ts`, `useWhiteboards.ts`, e em `hooks/whiteboard/`: `useWhiteboardHistory.ts` (undo/redo), `useWhiteboardKeyboard.ts`, `useThrottledUpdate.ts`, `useRecentColors.ts`.
- **Supabase**: `whiteboards`, `whiteboard_items`.
- **Tecnologia de canvas**: implementação **própria** (DOM com `transform`/pan-zoom + camada SVG para conectores). **NÃO** usa reactflow/konva/fabric/tldraw. Export para PDF/PNG (`lib/exportWhiteboardPdf.ts`, `exportWhiteboardPng.ts`).
- **Por que ALTA / riscos**: ⚠️ Maior superfície de código client-only do app. Pan/zoom, gestos touch (`haptics.ts`), histórico undo/redo, throttling de persistência, minimapa, modo apresentação. Obrigatoriamente `dynamic(ssr:false)`. Itens podem referenciar campanhas/notas/sessões (cross-feature). Port é praticamente "mover verbatim como Client Component" — baixo ganho de SSR, alto risco de regressão visual/interativa.

## 6. Blog / Dicionário (SEO) — **complexidade ALTA**

- **Páginas públicas (SEO)**: `pages/PublicBlog.tsx` (`/novidades`), `pages/PublicBlogPost.tsx` (`/novidades/:slug` e `/m/:slug/blog/:postSlug`), `pages/AuthorPublicBlog.tsx` (`/m/:slug/blog`), `pages/PublicDictionary.tsx` (`/novidades/dicionario`), `pages/DictionaryEntryPage.tsx` (`/novidades/dicionario/:slug`).
- **Páginas de autoria**: `pages/AuthorBlog.tsx`, `pages/PostEditor.tsx` (`/post/new`, `/post/:id/edit`).
- **Componentes**: muitos `components/Blog*.tsx` (CategoryNav, FeaturedAuthors, FeaturedHero, Pagination, PostNotFound, PostReactions, ReadingBar, RelatedPosts, Sidebar, Spotlight, StartHere, TableOfContents), `components/PublicBlogLayout.tsx`, `components/AuthorBlog*.tsx`, `components/PostAuthorCard.tsx`, `components/PostPreviewModal.tsx`, `components/blog/PostEditor*.tsx` (ActionBar, Dialogs, Metadata, MobileBar, SeoSpecialistDialog).
- **Hooks**: `usePosts.ts`, `usePostEditorForm.ts`, `usePostFeatures.ts`, `useAuthorBlog.ts`, `useAuthors.ts`, `useDictionary.ts`, `useFollowAuthor.ts`, `useBlogSEO.ts`, `useCanonical.ts`, `useNoIndex.ts`, `usePageMeta.ts`, `useReadingProgress.ts`, `useFeaturedLinks.ts`.
- **Supabase**: `posts`, `post_categories`, `post_features`, `blog_authors`, `dictionary_entries`, `author_follows`; edges `rss`, `sitemap` (rotas `/rss.xml`, `/sitemap.xml` redirecionam para functions), `analyze-post-links`, `apply-link-corrections`, `seo-specialist`, `ping-search-engines`, `fetch-og-image`, `import-wordpress`, `scraper`, `process-scheduled-posts`.
- **Libs**: TipTap (editor de post), `dompurify`, `@tailwindcss/typography`, `lib/seoSchemas.ts`/`seoScore.ts`/`ogHelpers.ts`/`paragraphIndexer.ts`/`blogFonts.ts`.
- **Por que ALTA / riscos**: ⚠️ É o **maior beneficiário do SSR/SSG** e o driver "SEO real" da migração. Preservação de slugs/paths é guardrail (`/novidades/:slug`, `/m/:slug/blog/:postSlug`). Hoje SEO é client-side (`usePageMeta`, `useCanonical`) → migrar para `generateMetadata` + Server Components + sitemap/rss nativos (ou manter edges). Editor de post é client-only (TipTap). WordPress import e scheduling são server-side (edges). Rotas legacy (`redirect-legacy`) precisam de `redirects` no `next.config`.

## 7. Ferramentas de mesa — **complexidade MÉDIA** (varia por sub-ferramenta)

Página índice: `pages/Tools.tsx` (`/tools`).

- **7a. Rolador de dados** — `pages/DiceRoller.tsx` (`/tools/dice-roller`), `components/InlineDiceRoller.tsx`, `components/DiceIcons.tsx`. Lógica local (sem Supabase). `lib/rpgConstants.ts`. **Baixa/Média** — client-only, port direto.
- **7b. Gerador de aventuras (IA, d20)** — `pages/AdventureGenerator.tsx` (`/tools/adventure-generator`). Edge `generate-adventure` (LLM). `components/AiLimitDialog.tsx`, `components/AiSuggestionDialog.tsx`. **Média** — depende de quota/rate-limit de IA (verificar `useSubscription`).
- **7c. Preparador de sessões (IA)** — `pages/SessionPrepCheck.tsx` (`/tools/session-prep`). Edge `session-prep-check`. **Média**.
- **7d. Avaliação / NPS / Feedback de sessão** — `pages/FeedbackPage.tsx` (`/tools/feedback`), `pages/SessionFeedback.tsx` (`/f/:token` — público). `components/feedback/*` (`FeedbackConfigEditor`, `FeedbackDashboard`, `SelfEvalBlock`, `useAnalyzeMutation`). Edge `analyze-feedback`. `lib/feedback-utils.ts`. **Média** — `/f/:token` é fluxo público anônimo.
- **7e. Finanças** — `pages/FinanceManager.tsx` (`/tools/finance`). `components/finance/*` (`EvolutionForecast`, `FinanceOnboarding`, `MonthlyLedger`, `PricingCalculator`, `parts.tsx`), `lib/finance/{formulas,money}.ts` (com testes), `types/finance.ts`, `hooks/useFinance.ts`. Edge `finance-extract-receipt` (OCR via IA). **Média** — cálculos financeiros com testes (portar testes junto); upload/OCR de comprovante.

## 8. Academia de Mestres (`/journey`) — **complexidade ALTA**

- **Páginas** (`pages/journey/` + gate `pages/Journey.tsx`): `JourneyHome.tsx`, `Library.tsx` (`/journey/biblioteca`), `BookDetail.tsx`, `BookReader.tsx` (leitor com highlights/anotações), `CourseDetail.tsx`, `CourseViewer.tsx`; admin (`pages/journey/admin/`): `JourneyAdmin`, `AdminCards`, `AdminSettings`, `AdminBooks`, `AdminBookEditor`, `AdminCourses`, `AdminCourseEditor`.
- **Componentes** (`components/academy/`): `AcademyCard`, `AcademySubNav`, `AccessGate`, `BookReaderToolbar`, `BookSessionIndex`, `HighlightLayer`, `AnnotationPopover`, `ReflectionBlock`, `VideoLessonPlayer`, `CompletionCelebrationModal`, `ContentProgressHeatmap`, `ContentNPSForm`, `NPS*` (ScoreBadge, AdminTab, DetailModal), `AnnotationsAdminTab`, `AcademyImageUpload`/`CropDialog`/`NoteView`.
- **Hooks**: `useAcademyBooks`, `useAcademyCourses`, `useAcademyCards`, `useAcademyAnnotations`, `useAcademySettings`, `useAnnotationsAdmin`, `useReadingProgress`, `useCourseProgress`, `useContentCompletion`, `useContinueTargets`, `useContentNPS`, `useNPSAdminData`, `useRetentionReminders`.
- **Supabase**: `academy_books`, `academy_book_sessions`, `academy_book_pages`, `academy_courses`, `academy_course_modules`, `academy_lessons`, `academy_cards`, `academy_settings`, `academy_annotations` (+ views `academy_annotations_admin_view`/`_consolidated`), `academy_reading_progress`, `academy_course_progress`, `academy_completion_events`, `academy_content_nps`, view `view_academy_retention_risk`; reutiliza `folders`/`notes` para anotações.
- **Libs**: TipTap (leitor/anotações + `HighlightLayer`), `@dnd-kit/*` (ordenação no `AdminBookEditor`), `canvas-confetti` (celebração de conclusão), `recharts` (heatmap/NPS).
- **Por que ALTA / riscos**: ⚠️ Subsistema grande e relativamente novo (foi construído em "ondas"). Leitor de livro com seleção de texto → highlights/anotações ancoradas a parágrafos (`lib/paragraphIndexer.ts`) é client-only e frágil de portar. Player de vídeo, progresso de leitura/curso, NPS de conteúdo, lembretes de retenção. Admin com editor TipTap + dnd-kit. Gate por `isAdmin` e `AccessGate` (controle de acesso por plano/role).

## 9. Notificações push (Web Push / PWA) — **complexidade ALTA**

- **Componentes**: `components/PushNotificationPrompt.tsx`, `components/NotificationBell.tsx`, `components/PwaUpdateReloader.tsx`, `components/PullToRefreshIndicator.tsx`.
- **Hooks**: `usePushNotifications.ts`, `useNotifications.ts`, `useAdminNotifications.ts`, `useConditionalNotifications.ts`, `usePushClickTracker.ts`, `useRetentionReminders.ts`, `usePullToRefresh.ts`, `usePwaTracker.ts`.
- **Supabase**: `push_subscriptions`, `user_notifications`, `notifications`, `pwa_events`, `profiles`; edges `send-push`, `process-push-queue`, `process-conditional-notifications`, `process-email-queue`.
- **Libs/infra**: Service Worker custom `public/sw-push.js` injetado via `vite-plugin-pwa` (`importScripts`), VAPID Web Push, `lib/notificationAudio.ts`, `lib/haptics.ts`.
- **Por que ALTA / riscos**: ⚠️ PWA + Service Worker mudam de pipeline (Vite plugin → estratégia Next, ex.: `next-pwa`/Serwist ou SW manual). `sw-push.js` precisa ser reintegrado. Push depende de subscription persistida + edges agendadas (cron). Cutover de subscriptions e manifest precisa cuidado para não quebrar instalações PWA existentes.

## 10. Busca global / Favoritos / Agenda / Dashboard — **complexidade MÉDIA**

- **Busca global**: `components/GlobalSearch.tsx` (`cmdk` command palette). Consulta `campaigns`, `notes`, `sessions`, `whiteboards`, `players`, `player_campaigns`. Acionada de `AppSidebar.tsx`/`MobileNav.tsx`. **Média** — client-only; manter atalho de teclado (`useKeyboardShortcuts.ts`).
- **Favoritos**: `components/FavoriteButton.tsx`, `hooks/useFavorites.ts`. Tabela `favorites` (item_type: note|campaign|session|post). **Baixa**.
- **Agenda**: `pages/Agenda.tsx` (`/agenda`), `components/dashboard/DashboardAgenda.tsx`. Usa `sessions`/`react-day-picker`. **Média**.
- **Dashboard** (`/dashboard` → `pages/Index.tsx`): `components/dashboard/*` (Hero, Campaigns, Agenda, Notes, ContinueReading, Overdue, QuickAccess), `components/GameStatsCard.tsx`, `components/MasterBadges.tsx`. Agrega vários domínios. **Média** — bom candidato a Server Component parcial.
- **Layout/Navegação**: `components/AppLayout.tsx`, `components/AppSidebar.tsx`, `components/MobileNav.tsx`, `components/feature-hints/*` (tour/hints de onboarding — `FeatureHintProvider` global), `hooks/useMenuItems.ts`, `useFeatureHint.ts`.

## 11. Painel administrativo (KPIs / Infra / Usuários / Financeiro) — **complexidade ALTA**

- **Páginas**: `pages/Admin.tsx` (`/admin`), `pages/AdminBlog.tsx` (`/admin/blog`), `pages/AdminTemplates.tsx`, `pages/AdminDictionary.tsx`.
- **Componentes** (`components/admin/`, ~45 arquivos): tabs de Analytics, Usabilidade (Funnel/Engagement/Retention/Pwa/AiSection), Usuários (`AdminUsersTab`, `AdminUserCard/Drawer/Dialogs/Filters`, `AdminUserInsightsSubTab`), Notificações (Tab/Log/Kpi/ConditionalNotifications/EmailManagement), Financeiro (`AdminFinancialTab`), Assinaturas (`AdminSubscriptionsTab`), Storage (`AdminStorageSubTab`, `AdminStorageOrphanAudit`, `AdminMediaReconciler`), Plataforma/Infra (`components/admin/platform/`: `PlatformInfraTab`, `PlatformOverviewTab`, `PlatformRecursosTab`, `AdminCdnMonitorCard`), `CronHealthSection`, KPIs do blog (vários `AdminBlog*Tab`).
- **Hooks**: `useAdmin.ts`, `useAdminQueries.ts`, `useAdminPrefetch.ts`, `useAdminNotifications.ts`, `useNPSAdminData.ts`, `useAnnotationsAdmin.ts`, `useCdnCacheStats.ts`, `useStorageUsage.ts`, `useSiteSettings.ts`, `useUploadGuard.ts`; `lib/adminRanking.ts`, `components/admin/adminConstants.ts`.
- **Supabase**: muitas tabelas/views agregadas (`site_settings`, `menu_items`, KPIs, `pwa_events`, `share_events`, views de analytics); edges `admin-users`, `billing`, `optimize-images`, `instagram-thumbnail`, e as de cron (push/email/posts).
- **Libs**: `recharts` (todos os gráficos), `@dnd-kit` (ordenação de menu/templates).
- **Por que ALTA / riscos**: ⚠️ Volume enorme de UI (45+ componentes) e dependência de muitas views/RPC de analytics. Controle de acesso por role (`user_roles`/`useAdmin`) — RLS rígida. Monitor de infra/CDN/cron lê estado operacional. Gráficos `recharts` são client-only.

## 12. Landing pages / Marketing (SEO) — **complexidade MÉDIA**

- **Páginas**: `pages/Landing.tsx` (`/`), `pages/Plans.tsx` (`/plans`), `pages/CheckoutSuccess.tsx` (`/checkout`), e landings de produto: `pages/BookLandingPage.tsx` (`/o-livro-completo-do-mestre-de-rpg`), `pages/ChecklistLandingPage.tsx`, `pages/WorldbuildingLandingPage.tsx`, `pages/WorldbuildingLandingPageForMasters.tsx`.
- **Componentes**: `components/landing/*` (Hero, Features, Cta, Blog sections), `components/AcademiaBanner.tsx`, `components/InstagramBentoGrid.tsx`, `lib/plans.ts`.
- **Supabase**: `billing` edge (checkout/assinatura), `instagram-thumbnail` edge.
- **Riscos**: SEO crítico (slugs exatos preservados — guardrail). Forte candidato a SSG/Server Components com `generateMetadata`. `framer-motion` aparece aqui (1 dos 2 usos). Checkout integra billing externo.

## 13. Consentimento (LGPD) — **complexidade MÉDIA**

- **Páginas**: `pages/ConsentManagement.tsx` (`/tools/consent` — gestão pelo mestre), `pages/ConsentForm.tsx` (`/c/:token` — formulário público assinado pelo jogador).
- **Componentes**: `components/player/ConsentResponse{Dialog,Drawer}.tsx`.
- **Riscos**: fluxo público por token (anônimo). Sensível juridicamente; preservar comportamento verbatim. Bom candidato a Server Component na rota pública.

---

## Resumo de complexidade de port

| Complexidade | Módulos |
|---|---|
| **ALTA** | 1 Auth/Perfil, 4 Diário/Notas (TipTap), 5 Whiteboard, 6 Blog/Dicionário (SEO), 8 Academia, 9 Push/PWA, 11 Admin |
| **MÉDIA** | 2 Campanhas/Sessões, 3 Jogadores/CRM, 7 Ferramentas (dados/IA/feedback/finanças), 10 Busca/Favoritos/Agenda/Dashboard, 12 Landings, 13 Consentimento |
| **BAIXA** | sub-itens: rolador de dados (7a), favoritos (10) |

### Riscos transversais para a Fase 00 (spikes GO/NO-GO)
1. **Auth/cutover** (módulo 1): trocar `@lovable.dev/cloud-auth-js` por Supabase Auth próprio com `@supabase/ssr` preservando UUIDs/identities. — já há `docs/fase-00-spike-01-auth.md`.
2. **Componentes client-only pesados** (4, 5, 8, 11): TipTap + nodes custom, canvas custom do whiteboard, `recharts`, `dnd-kit` → todos `dynamic(ssr:false)` ou `"use client"`.
3. **PWA/Service Worker** (módulo 9): migrar pipeline `vite-plugin-pwa` + `sw-push.js` para estratégia Next sem quebrar instalações/subscriptions existentes.
4. **SEO/rotas** (6, 12, 13): preservar todos os slugs/paths; migrar SEO client-side (`usePageMeta`/`useCanonical`) para `generateMetadata`; reimplementar `sitemap`/`rss`/`redirect-legacy`.
5. **Edge functions** (27): decidir manter como Supabase Edge Functions vs. mover para Route Handlers/Server Actions no Next; crons agendadas (push/email/posts) precisam de scheduler.
