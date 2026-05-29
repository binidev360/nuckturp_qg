# Codemap do legado — QG do Mestre (app antigo Vite/React)

> **Propósito:** mapa de navegação de código para acelerar o PORT para Next.js. Para cada feature: "para portar X, leia estes arquivos". Reduz token nas fases de port (não precisa reexplorar).
>
> **Fonte (ESTRITAMENTE READ-ONLY):** `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp`. Todos os caminhos abaixo são relativos a essa raiz (prefixo `src/` salvo indicação). **NUNCA editar nada lá.**
>
> **Verificado em** 2026-05-29 por listagem direta do filesystem (não cópia cega dos inventários). Caminhos conferidos um a um.
>
> **Fontes de apoio (já prontas, no projeto novo):** `docs/inventario/modulos.md` (complexidade + riscos por módulo), `docs/inventario/rotas-slugs.md` (contrato de URLs/redirects/SEO), `docs/inventario/ui-componentes.md` (tokens, shadcn, libs). Este codemap é o índice de "onde mora o código"; aqueles trazem o "porquê/risco".
>
> ⚠️ **PIVOT (`docs/PIVOT-MODELO-PAGO.md`):** Academia foi **REMOVIDA** do app interno. Ver seção final "FORA DO ESCOPO". Não portar `academy/` nem `pages/journey/*`.

---

## Índice

1. [Estrutura de alto nível de `src/`](#0-estrutura-de-alto-nível-de-src)
2. [Infra transversal (roteamento, auth provider, supabase client, layout)](#infra-transversal)
3. [Campanhas / Aventuras / Sessões](#1-campanhas--aventuras--sessões)
4. [Jogadores (CRM) / Personagens](#2-jogadores-crm--personagens)
5. [Diário do Mestre (editor TipTap) / Notas + nodes custom](#3-diário-do-mestre-tiptap--notas)
6. [Quadro de Ideias (whiteboard infinito)](#4-quadro-de-ideias-whiteboard)
7. [Blog / Dicionário (SEO)](#5-blog--dicionário-seo)
8. [Ferramentas de mesa (dados, IA, feedback, finanças)](#6-ferramentas-de-mesa)
9. [Consentimento LGPD (Linhas & Véus)](#7-consentimento-lgpd)
10. [Notificações / Push / PWA](#8-notificações--push--pwa)
11. [Busca global / Favoritos / Agenda / Dashboard](#9-busca--favoritos--agenda--dashboard)
12. [Painel administrativo](#10-painel-administrativo)
13. [Perfil / Onboarding / Auth](#11-perfil--onboarding--auth)
14. [Financeiro (ferramenta do mestre)](#12-financeiro) (sub-item de Ferramentas; agrupado aqui por pedido)
15. [Landing / Marketing (SEO)](#13-landing--marketing-seo)
16. [Edge functions (referência por feature)](#edge-functions-por-feature)
17. [FORA DO ESCOPO (removido no pivot): Academia / journey](#fora-do-escopo-pivot)

---

## 0. Estrutura de alto nível de `src/`

```
src/
├── App.tsx               ← TODAS as rotas (react-router v6, ~63 rotas, lazy via lazyRetry)
├── main.tsx              ← bootstrap (providers raiz)
├── index.css             ← design system completo (tokens + keyframes + estilos TipTap/blog/whiteboard)
├── assets/               ← logo, símbolo D20, imagens de landing/marketing
├── components/
│   ├── ui/               ← 48 primitivas shadcn stock + SkeletonCards + use-toast
│   ├── <raiz>            ← ~73 componentes (layout, blog, editor, diálogos, infra)
│   ├── admin/            ← painel admin (~46 + platform/)
│   ├── academy/          ← ⛔ FORA DO ESCOPO (pivot)
│   ├── blog/             ← editor de post (partes)
│   ├── campaign/         ← sessões/campanha
│   ├── character/        ← abas de ficha de personagem
│   ├── dashboard/        ← widgets do dashboard
│   ├── editor/           ← nodes custom do TipTap
│   ├── feature-hints/    ← tour/hints de onboarding (provider global)
│   ├── feedback/         ← avaliação de mestre (NPS)
│   ├── finance/          ← calculadora/ledger financeiro
│   ├── landing/          ← seções da landing
│   ├── player/           ← consentimento de jogador
│   ├── profile/          ← abas de perfil
│   └── whiteboard/       ← quadro de ideias (canvas + extensões TipTap)
├── hooks/                ← ~66 hooks (useX) + hooks/whiteboard/
├── i18n/                 ← i18next (locales pt-BR / en)
├── integrations/
│   ├── lovable/index.ts  ← ⚠️ auth lock-in (@lovable.dev/cloud-auth-js) — trocar no cutover
│   └── supabase/         ← client.ts, types.ts (gerados), portable.ts
├── lib/                  ← utils, exportPdf, seoSchemas, finance/, paragraphIndexer, haptics…
├── test/                 ← setup de testes
└── types/                ← finance.ts (tipos de domínio)
```

Edge functions (server-side) vivem fora de `src/`: `supabase/functions/` (27). Migrations: `supabase/migrations/` (~209 SQL).

---

<a id="infra-transversal"></a>

## Infra transversal (lê-se primeiro, sustenta todas as features)

- **Roteamento / contrato de URLs:** `src/App.tsx` (todas as rotas + ordem; cruzar com `docs/inventario/rotas-slugs.md`).
- **Auth provider (raiz de tudo):** `src/hooks/useAuth.tsx` (`AuthProvider`), `src/integrations/lovable/index.ts` (⚠️ lock-in a substituir).
- **Supabase:** `src/integrations/supabase/client.ts` (client browser), `types.ts` (tipos gerados), `portable.ts`.
- **Gate de rota / layout:** `src/components/ProtectedRoute.tsx`, `AppLayout.tsx`, `AppSidebar.tsx`, `MobileNav.tsx`.
- **Slug/util canônico:** `src/lib/utils.ts` (`generateSlug`, `cn`).
- **Erro/lazy:** `src/components/LazyErrorBoundary.tsx`, `src/lib/lazyRetry.ts`.
- **CDN de imagem:** `src/lib/cdnUrl.ts` (mapeia `cdn.nuckturp.com.br`→storage).
- **Para portar a infra:** comece por `src/App.tsx` + `src/hooks/useAuth.tsx` + `src/integrations/supabase/client.ts`.

---

## 1. Campanhas / Aventuras / Sessões

- **Páginas:** `src/pages/Campaigns.tsx` (`/campaigns`), `src/pages/CampaignDetail.tsx` (`/campaigns/:id`).
- **Componentes (`src/components/campaign/`):** `SessionPage.tsx`, `SessionDialog.tsx`, `SessionPresenceSection.tsx`, `SessionFeedbackSection.tsx`, `CampaignPlayersSection.tsx`, `CampaignPdfActions.tsx`, `DuplicateSessionPopover.tsx`, `DurationInlineEditor.tsx`, `DurationDialogInput.tsx`, `CampaignConstants.ts`. Raiz: `src/components/CampaignShareDialog.tsx`, `SessionChecklist.tsx`, `SessionDatePicker.tsx`.
- **Hooks:** `src/hooks/useCampaigns.ts`, `useSessions.ts`, `useSessionPlayers.ts`.
- **Lib:** `src/lib/exportPdf.ts`.
- **Supabase:** `campaigns`, `campaign_shares`, `sessions`, `session_players`.
- **Para portar:** comece por `src/pages/CampaignDetail.tsx` + `src/hooks/useCampaigns.ts` + `src/hooks/useSessions.ts`.

## 2. Jogadores (CRM) / Personagens

- **Páginas:** `src/pages/Players.tsx` (`/players`), `src/pages/PlayerDetail.tsx` (`/players/:id`), `src/pages/CharacterDetail.tsx` (`/campaigns/:campaignId/characters/:characterId`).
- **Componentes (`src/components/character/`):** `CharacterHeader.tsx`, `CharacterBackstoryTab.tsx`, `CharacterInventoryTab.tsx`, `CharacterNotesTab.tsx`, `CharacterPlayerTab.tsx`, `CharacterPresenceTab.tsx`, `CharacterRelationshipsTab.tsx`, `CharacterCropDialog.tsx`. Raiz: `src/components/PlayerDetailDrawer.tsx`.
- **Hooks:** `src/hooks/usePlayers.ts`, `useCharacter.ts`, `useCharacterRelationships.ts`, `useSessionPlayers.ts`.
- **Supabase:** `players`, `player_campaigns`, `character_session_notes`, `character_inventory`, `character_relationships`, `session_players`.
- **Para portar:** comece por `src/pages/PlayerDetail.tsx` + `src/hooks/usePlayers.ts`; ficha em `src/pages/CharacterDetail.tsx` + `src/hooks/useCharacter.ts`.

## 3. Diário do Mestre (TipTap) / Notas

- **Páginas:** `src/pages/Diary.tsx` (`/diary`), `src/pages/PublicNote.tsx` (`/n/:token` — público, HTML salvo + DOMPurify).
- **Editor (core):** `src/components/NotionEditor.tsx`, `src/components/NotionPage.tsx`.
- **Nodes custom TipTap (`src/components/editor/`):** `CalloutNode.tsx`, `ColumnExtension.tsx`, `EmbedCardNode.tsx`, `IframeNode.tsx`, `MentionNode.tsx`, `ResizableYoutubeNode.tsx`, `SpoilerNode.tsx`, `TitledDividerNode.tsx`.
- **Organização/compartilhamento:** `src/components/FolderTree.tsx`, `FolderBreadcrumbs.tsx`, `NoteShareDialog.tsx` (gera token `/n/:token`), `TemplatePicker.tsx`.
- **Hooks:** `src/hooks/useNotes.ts`, `useFolders.ts`, `useNoteShares.ts`, `useShareInvites.ts`, `useNotePresence.ts` (Realtime), `useTemplates.ts`.
- **Lib:** `src/lib/noteTemplates.ts`, `src/lib/exportPdf.ts`, `src/lib/useDOMPurify.ts`, `src/lib/embedUtils.ts`.
- **Supabase:** `notes`, `folders`, `note_shares`, `content_templates`.
- **Para portar:** comece por `src/components/NotionEditor.tsx` (client-only → `dynamic(ssr:false)`) + os 8 nodes de `src/components/editor/` + `src/hooks/useNotes.ts`. `PublicNote.tsx` pode virar Server Component (SEO).

## 4. Quadro de Ideias (whiteboard)

- **Página:** `src/pages/Whiteboard.tsx` (`/whiteboard` — sem `AppLayout`, só `ProtectedRoute`).
- **Componentes (`src/components/whiteboard/`):** `WhiteboardEditor.tsx` (core), `WhiteboardCanvasLayer.tsx`, `WhiteboardItem.tsx`, `WhiteboardToolbar.tsx`, `WhiteboardFAB.tsx`, `WhiteboardMinimap.tsx`, `WhiteboardConnectorMenu.tsx`, `WhiteboardLayersPanel.tsx`, `WhiteboardPresentation.tsx`, `WhiteboardSearchOverlay.tsx`, `WhiteboardStatusBar.tsx`, `WhiteboardDialogs.tsx`, `WhiteboardTemplateDialog.tsx`, `WhiteboardExportDialog.tsx`, `WhiteboardList.tsx`. Extensões TipTap próprias: `FontFamilyExtension.ts`, `FontSizeExtension.ts`. Apoio: `constants.ts`, `utils.ts` (+ `__tests__/utils.test.ts`). Raiz: `src/components/WhiteboardRichText.tsx`, `WhiteboardGestureTutorial.tsx`.
- **Hooks:** `src/hooks/useWhiteboard.ts`, `useWhiteboards.ts`; em `src/hooks/whiteboard/`: `useWhiteboardHistory.ts` (undo/redo), `useWhiteboardKeyboard.ts`, `useThrottledUpdate.ts`, `useRecentColors.ts`.
- **Lib:** `src/lib/exportWhiteboardPdf.ts`, `exportWhiteboardPng.ts`, `haptics.ts`.
- **Supabase:** `whiteboards`, `whiteboard_items`.
- **Canvas:** implementação **própria** (DOM transform/pan-zoom + SVG p/ conectores). NÃO usa reactflow/konva/tldraw.
- **Para portar:** comece por `src/components/whiteboard/WhiteboardEditor.tsx` + `src/hooks/useWhiteboard.ts` + `src/hooks/whiteboard/*`. Mover quase verbatim como Client Component (`dynamic(ssr:false)`); levar `__tests__/utils.test.ts` junto.

## 5. Blog / Dicionário (SEO)

> Maior beneficiário de SSR/SSG; driver "SEO real". Slugs preservados verbatim (ver `rotas-slugs.md`).

- **Páginas públicas:** `src/pages/PublicBlog.tsx` (`/novidades`), `src/pages/PublicBlogPost.tsx` (`/novidades/:slug` e `/m/:slug/blog/:postSlug`), `src/pages/AuthorPublicBlog.tsx` (`/m/:slug/blog`), `src/pages/PublicDictionary.tsx` (`/novidades/dicionario`), `src/pages/DictionaryEntryPage.tsx` (`/novidades/dicionario/:slug`).
- **Páginas de autoria:** `src/pages/AuthorBlog.tsx` (`/author-blog`), `src/pages/PostEditor.tsx` (`/post/new`, `/post/:id/edit`).
- **Componentes (raiz `src/components/`):** `PublicBlogLayout.tsx`, `BlogCategoryNav.tsx`, `BlogFeaturedAuthors.tsx`, `BlogFeaturedHero.tsx`, `BlogPagination.tsx`, `BlogPostNotFound.tsx`, `BlogPostReactions.tsx`, `BlogReadingBar.tsx`, `BlogRelatedPosts.tsx`, `BlogSidebar.tsx`, `BlogSpotlight.tsx`, `BlogStartHere.tsx`, `BlogTableOfContents.tsx`, `SidebarCategories.tsx`, `TrendingPosts.tsx`, `PostAuthorCard.tsx`, `PostPreviewModal.tsx`, `AuthorBlogCustomization.tsx`, `AuthorBlogSidebar.tsx`, `AuthorBlogMesaQuest.tsx`, `AuthorMetricsCharts.tsx`, `FollowAuthorButton.tsx`, `YouTubeLiteEmbed.tsx`.
- **Editor de post (`src/components/blog/`):** `PostEditorActionBar.tsx`, `PostEditorDialogs.tsx`, `PostEditorMetadata.tsx`, `PostEditorMobileBar.tsx`, `SeoSpecialistDialog.tsx`.
- **Hooks:** `src/hooks/usePosts.ts`, `usePostEditorForm.ts`, `usePostFeatures.ts`, `useAuthorBlog.ts`, `useAuthors.ts`, `useDictionary.ts`, `useFollowAuthor.ts`, `useBlogSEO.ts`, `useCanonical.ts`, `useNoIndex.ts`, `usePageMeta.ts`, `useReadingProgress.ts`, `useFeaturedLinks.ts`.
- **Lib:** `src/lib/seoSchemas.ts`, `seoScore.ts`, `ogHelpers.ts`, `paragraphIndexer.ts`, `blogFonts.ts`, `useDOMPurify.ts`.
- **Supabase:** `posts`, `post_categories`, `post_features`, `blog_authors`, `dictionary_entries`, `author_follows`.
- **Edges:** `rss`, `sitemap`, `analyze-post-links`, `apply-link-corrections`, `seo-specialist`, `ping-search-engines`, `fetch-og-image`, `import-wordpress`, `scraper`, `process-scheduled-posts`.
- **Para portar:** comece pelas páginas públicas `src/pages/PublicBlogPost.tsx` + `PublicBlog.tsx` (virar Server Components com `generateMetadata`, migrando o SEO de `usePageMeta`/`useCanonical`) + `src/hooks/usePosts.ts`. Editor: `src/pages/PostEditor.tsx` + `src/hooks/usePostEditorForm.ts` (client-only, TipTap).

## 6. Ferramentas de mesa

Página índice: `src/pages/Tools.tsx` (`/tools`).

- **6a. Rolador de dados** — `src/pages/DiceRoller.tsx` (`/tools/dice-roller`). Componentes: `src/components/InlineDiceRoller.tsx`, `DiceIcons.tsx` (símbolo D20 SVG paramétrico + presets de cor). Lib: `src/lib/rpgConstants.ts`. Sem Supabase. **Para portar:** `src/pages/DiceRoller.tsx` + `src/components/DiceIcons.tsx` (atenção: cores HSL hardcoded → guardrail de tokens).
- **6b. Gerador de aventuras (IA)** — `src/pages/AdventureGenerator.tsx` (`/tools/adventure-generator`). Componentes: `src/components/AiLimitDialog.tsx`, `AiSuggestionDialog.tsx`. Edge: `generate-adventure`. Quota: `src/hooks/useSubscription.ts`. **Para portar:** `src/pages/AdventureGenerator.tsx` + edge `generate-adventure` (⚠️ pivot: IA passa a ser metered/limitada).
- **6c. Preparador de sessões (IA)** — `src/pages/SessionPrepCheck.tsx` (`/tools/session-prep`). Componente: `src/components/SessionPrepCheckDialog.tsx`. Edge: `session-prep-check`. **Para portar:** `src/pages/SessionPrepCheck.tsx`.
- **6d. Avaliação / NPS / Feedback** — `src/pages/FeedbackPage.tsx` (`/tools/feedback`, gestão), `src/pages/SessionFeedback.tsx` (`/f/:token`, público anônimo). Componentes (`src/components/feedback/`): `FeedbackConfigEditor.tsx`, `FeedbackDashboard.tsx`, `SelfEvalBlock.tsx`, `useAnalyzeMutation.ts`. Edge: `analyze-feedback`. Lib: `src/lib/feedback-utils.ts`. **Para portar:** `src/pages/FeedbackPage.tsx` + `src/components/feedback/*`; rota pública `src/pages/SessionFeedback.tsx` (SSR, RPC `get_feedback_config_by_token`).

## 7. Consentimento LGPD

- **Páginas:** `src/pages/ConsentManagement.tsx` (`/tools/consent` — gestão pelo mestre), `src/pages/ConsentForm.tsx` (`/c/:token` — formulário público anônimo, `noindex`).
- **Componentes (`src/components/player/`):** `ConsentResponseDialog.tsx`, `ConsentResponseDrawer.tsx`.
- **Para portar:** comece por `src/pages/ConsentManagement.tsx` (gera `/c/:token`) + `src/pages/ConsentForm.tsx` (público, resolve por `p_token`). ⚠️ `/c` não está na allowlist do Worker — ver `rotas-slugs.md §5.3`.

## 8. Notificações / Push / PWA

- **Componentes (raiz):** `src/components/PushNotificationPrompt.tsx`, `NotificationBell.tsx` (anim `bell-ring`), `PwaUpdateReloader.tsx`, `PullToRefreshIndicator.tsx`.
- **Hooks:** `src/hooks/usePushNotifications.ts`, `useNotifications.ts`, `useAdminNotifications.ts`, `useConditionalNotifications.ts`, `usePushClickTracker.ts`, `useRetentionReminders.ts`, `usePullToRefresh.ts`, `usePwaTracker.ts`.
- **Lib/infra:** `src/lib/notificationAudio.ts`, `haptics.ts`; Service Worker `public/sw-push.js` (injetado via `vite-plugin-pwa` → migrar para estratégia Next, ex.: Serwist).
- **Supabase:** `push_subscriptions`, `user_notifications`, `notifications`, `pwa_events`.
- **Edges:** `send-push`, `process-push-queue`, `process-conditional-notifications`, `process-email-queue`.
- **Para portar:** comece por `src/hooks/usePushNotifications.ts` + `public/sw-push.js` + edge `send-push`. ⚠️ cuidado com subscriptions/manifest existentes no cutover (não quebrar PWA instalado).

## 9. Busca / Favoritos / Agenda / Dashboard

- **Busca global:** `src/components/GlobalSearch.tsx` (`cmdk`), acionada de `AppSidebar.tsx`/`MobileNav.tsx`. Atalhos: `src/hooks/useKeyboardShortcuts.ts`, `src/components/KeyboardShortcutsDialog.tsx`. Consulta campaigns/notes/sessions/whiteboards/players.
- **Favoritos:** `src/components/FavoriteButton.tsx`, `src/hooks/useFavorites.ts`. Tabela `favorites`.
- **Agenda:** `src/pages/Agenda.tsx` (`/agenda`), `src/components/dashboard/DashboardAgenda.tsx`. Usa `sessions` + `react-day-picker`.
- **Dashboard** (`/dashboard` → `src/pages/Index.tsx`): `src/components/dashboard/` (`DashboardHero.tsx`, `DashboardCampaigns.tsx`, `DashboardAgenda.tsx`, `DashboardNotes.tsx`, `DashboardContinueReading.tsx`, `DashboardOverdue.tsx`, `DashboardQuickAccess.tsx`); raiz: `GameStatsCard.tsx`, `MasterBadges.tsx`.
- **Layout/nav/hints:** `src/components/AppLayout.tsx`, `AppSidebar.tsx`, `MobileNav.tsx`; `src/components/feature-hints/` (`FeatureHintProvider.tsx`, `FeatureHintPortal.tsx`, `TourHintPortal.tsx`, `useFeatureHint.ts`, `useFeatureTour.ts`); `src/hooks/useMenuItems.ts`.
- **Para portar:** busca → `src/components/GlobalSearch.tsx`; dashboard → `src/pages/Index.tsx` + `src/components/dashboard/*` (bom candidato a Server Component parcial).

## 10. Painel administrativo

- **Páginas:** `src/pages/Admin.tsx` (`/admin`), `src/pages/AdminBlog.tsx` (`/admin/blog`), `src/pages/AdminTemplates.tsx` (`/admin/templates`), `src/pages/AdminDictionary.tsx` (`/admin/dictionary`).
- **Componentes (`src/components/admin/`, ~46):** Analytics (`AdminAnalyticsTab.tsx`), Usabilidade (`AdminUsabilityTab.tsx` + `Usability{Funnel,Engagement,Retention,Pwa,Ai}Section.tsx`), Usuários (`AdminUsersTab.tsx`, `AdminUserCard.tsx`, `AdminUserDrawer.tsx`, `AdminUserDialogs.tsx`, `AdminUserFilters.tsx`, `AdminUserInsightsSubTab.tsx`), Notificações (`AdminNotificationsTab.tsx`, `AdminNotificationsLogTab.tsx`, `AdminNotificationsKpiTab.tsx`, `AdminConditionalNotificationsTab.tsx`, `AdminEmailManagementTab.tsx`), Financeiro (`AdminFinancialTab.tsx`), Assinaturas (`AdminSubscriptionsTab.tsx`), Storage (`AdminStorageSubTab.tsx`, `AdminStorageOrphanAudit.tsx`, `AdminMediaReconciler.tsx`), Blog KPIs (`AdminBlog*Tab.tsx` — vários: Authors, Categories, Community, Dictionary, FeaturedLinks, Health, Kpis, Links, Menu, Seo, SeoKpi, Tags, WpImport, ImageOptimizer, ActivityLog), Feedback (`AdminFeedbackSubTab.tsx`), Plataforma (`platform/`: `PlatformInfraTab.tsx`, `PlatformOverviewTab.tsx`, `PlatformRecursosTab.tsx`, `AdminCdnMonitorCard.tsx`), `CronHealthSection.tsx`, `AdminKpiCard.tsx`, `AdminActionsWidget.tsx`, `AdminSkeletons.tsx`, `InfoTip.tsx`, `adminConstants.ts`.
- **Hooks:** `src/hooks/useAdmin.ts`, `useAdminQueries.ts`, `useAdminPrefetch.ts`, `useAdminNotifications.ts`, `useNPSAdminData.ts`, `useCdnCacheStats.ts`, `useStorageUsage.ts`, `useSiteSettings.ts`, `useUploadGuard.ts`, `useShareEvents.ts`. Lib: `src/lib/adminRanking.ts`.
- **Edges:** `admin-users`, `billing`, `optimize-images`, `instagram-thumbnail`, crons (push/email/posts).
- **Para portar:** comece por `src/pages/Admin.tsx` + `src/hooks/useAdmin.ts` + `useAdminQueries.ts`. Controle por role (`user_roles`) → RLS rígida. Gráficos `recharts` são client-only. Volume enorme → portar tab por tab.

## 11. Perfil / Onboarding / Auth

> Módulo de **maior risco de cutover** (preservar UUIDs `auth.users`/`auth.identities`/`email_confirmed_at`). Ver `docs/fase-00-spike-01-auth.md` (no projeto novo).

- **Páginas:** `src/pages/Auth.tsx` (`/auth`), `src/pages/ResetPassword.tsx` (`/redefinir-senha`), `src/pages/Onboarding.tsx` (`/onboarding`), `src/pages/Profile.tsx` (`/profile` — define `slug` de `/m/:slug`), `src/pages/PublicProfile.tsx` (`/m/:slug` — SEO).
- **Componentes:** `src/components/ProtectedRoute.tsx`, `AppLayout.tsx`, `ProfileOnboarding.tsx`, `ProfileIdentitySetup.tsx`, `AvatarCropDialog.tsx`, `CoverCropDialog.tsx`; abas (`src/components/profile/`): `ProfileIdentityTab.tsx`, `ProfileLinksTab.tsx`, `ProfilePreferencesTab.tsx`, `ProfileNotificationsTab.tsx`, `ProfileSettingsTab.tsx`, `ProfileSubscriptionTab.tsx`, `ProfileSharesTab.tsx`, `ProfileBlogTab.tsx`, `ProfileCompleteness.tsx`.
- **Hooks:** `src/hooks/useAuth.tsx` (AuthProvider — core de tudo), `useProfile.ts`, `useSubscription.ts`.
- **Integração auth:** `src/integrations/lovable/index.ts` (⚠️ `@lovable.dev/cloud-auth-js` — substituir por Supabase Auth + `@supabase/ssr`).
- **Supabase:** `memberships`, `profiles`, `user_roles`. Edges: `auth-email-hook`, `og-profile-image`.
- **Para portar:** comece por `src/hooks/useAuth.tsx` (spike crítico Fase 00) → `src/pages/Profile.tsx` → `src/pages/PublicProfile.tsx` (Server Component + `generateMetadata` + OG image). ⚠️ pivot: todos os migrados viram "Mestre VIP" via `premium_overrides` no import.

## 12. Financeiro

> Sub-ferramenta de mesa (rota `/tools/finance`), destacada aqui por pedido — tem testes a portar junto.

- **Página:** `src/pages/FinanceManager.tsx` (`/tools/finance`).
- **Componentes (`src/components/finance/`):** `MonthlyLedger.tsx`, `PricingCalculator.tsx`, `EvolutionForecast.tsx`, `FinanceOnboarding.tsx`, `parts.tsx`, `onboardingStorage.ts`.
- **Hooks:** `src/hooks/useFinance.ts`.
- **Lib (com testes):** `src/lib/finance/formulas.ts`, `money.ts` (+ `src/lib/finance/__tests__/formulas.test.ts`, `money.test.ts`). Tipos: `src/types/finance.ts`.
- **Edge:** `finance-extract-receipt` (OCR via IA).
- **Para portar:** comece por `src/lib/finance/formulas.ts` + `money.ts` **com os testes** + `src/hooks/useFinance.ts`; UI em `src/pages/FinanceManager.tsx`.

## 13. Landing / Marketing (SEO)

> SEO crítico — slugs exatos preservados (guardrail). ⚠️ pivot: a home (`/`) vira **página de vendas** (construir na Fase 3 com `/copy-basic`).

- **Páginas:** `src/pages/Landing.tsx` (`/`), `src/pages/Plans.tsx` (`/plans`), `src/pages/CheckoutSuccess.tsx` (`/checkout`), `src/pages/BookLandingPage.tsx` (`/o-livro-completo-do-mestre-de-rpg`), `src/pages/ChecklistLandingPage.tsx` (`/checklist-do-mestre-metodico`), `src/pages/WorldbuildingLandingPage.tsx` (`/curso-de-worldbuilding`), `src/pages/WorldbuildingLandingPageForMasters.tsx` (`/curso-de-worldbuilding-para-mestres`).
- **Componentes (`src/components/landing/`):** `LandingHeroSection.tsx`, `LandingFeaturesSection.tsx`, `LandingBlogSection.tsx`, `LandingCtaSection.tsx`. Raiz: `src/components/InstagramBentoGrid.tsx`, `AcademiaBanner.tsx` (⚠️ remover no pivot), `NarrativeDivider.tsx`.
- **Lib:** `src/lib/plans.ts`. Motion: 100% CSS (`.reveal`/`animate-fade-up` em `index.css`), NÃO framer-motion.
- **Supabase:** edge `billing` (checkout/assinatura — passa a gatear o app inteiro no pivot), `instagram-thumbnail`.
- **Para portar:** comece por `src/pages/Landing.tsx` + `src/components/landing/*` (SSG/Server Components + `generateMetadata`); checkout via edge `billing`.

---

<a id="edge-functions-por-feature"></a>

## Edge functions por feature (referência rápida)

Vivem em `supabase/functions/` (fora de `src/`). Decidir no port: manter como Supabase Edge Functions vs. Route Handlers/Server Actions. Crons (push/email/posts) precisam de scheduler.

| Feature          | Edge functions                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth/Perfil      | `auth-email-hook`, `og-profile-image`, `admin-users`                                                                                                                                                                 |
| Blog/SEO         | `rss`, `sitemap`, `analyze-post-links`, `apply-link-corrections`, `seo-specialist`, `ping-search-engines`, `fetch-og-image`, `import-wordpress`, `scraper`, `process-scheduled-posts`, `redirect-legacy`, `og-proxy` |
| IA (ferramentas) | `generate-adventure`, `session-prep-check`, `analyze-feedback`, `finance-extract-receipt` (⚠️ pivot: tornar metered)                                                                                                 |
| Push/Email       | `send-push`, `process-push-queue`, `process-conditional-notifications`, `process-email-queue`                                                                                                                        |
| Billing/Admin    | `billing`, `optimize-images`, `instagram-thumbnail`                                                                                                                                                                  |
| Compartilhado    | `_shared`                                                                                                                                                                                                            |

> `og-proxy` + `redirect-legacy` + o `cloudflare-worker.js` (raiz do projeto antigo) são lógica de SEO/prerender que **deixa de existir** no Next (SSR nativo) — portar metadata para `generateMetadata` e redirects para `next.config`/`middleware`. Detalhes em `docs/inventario/rotas-slugs.md §3 e §5`.

---

<a id="fora-do-escopo-pivot"></a>

## FORA DO ESCOPO (removido no pivot)

> Por `docs/PIVOT-MODELO-PAGO.md`: **Academia de Mestres removida do app interno.** NÃO portar. Listado só para saber o que ignorar. Rotas `/journey/*`: decidir redirect/410 (ver pivot C6).

### Páginas (`src/pages/journey/`) — NÃO portar

- `src/pages/Journey.tsx` (`/journey` — gate)
- `src/pages/journey/JourneyHome.tsx`
- `src/pages/journey/Library.tsx` (`/journey/biblioteca`)
- `src/pages/journey/BookDetail.tsx` (`/journey/biblioteca/:bookSlug`)
- `src/pages/journey/BookReader.tsx` (`/journey/biblioteca/:bookSlug/:sessionSlug`)
- `src/pages/journey/CourseDetail.tsx` (`/journey/biblioteca/cursos/:courseSlug`)
- `src/pages/journey/CourseViewer.tsx` (`/journey/biblioteca/cursos/:courseSlug/:lessonId`)
- Admin (`src/pages/journey/admin/`): `JourneyAdmin.tsx` (`/journey/admin`), `AdminCards.tsx`, `AdminSettings.tsx`, `AdminBooks.tsx`, `AdminBookEditor.tsx`, `AdminCourses.tsx`, `AdminCourseEditor.tsx`.

### Componentes (`src/components/academy/`) — NÃO portar

`AcademyCard.tsx`, `AcademySubNav.tsx`, `AccessGate.tsx`, `BookReaderToolbar.tsx`, `BookSessionIndex.tsx`, `HighlightLayer.tsx`, `AnnotationPopover.tsx`, `AnnotationsAdminTab.tsx`, `ReflectionBlock.tsx`, `VideoLessonPlayer.tsx`, `CompletionCelebrationModal.tsx`, `ContentProgressHeatmap.tsx`, `ContentNPSForm.tsx`, `NPSScoreBadge.tsx`, `NPSAdminTab.tsx`, `NPSDetailModal.tsx`, `AcademyImageUpload.tsx`, `AcademyImageCropDialog.tsx`, `AcademyNoteView.tsx`.

### Hooks de academia — NÃO portar

`src/hooks/useAcademyBooks.ts`, `useAcademyCourses.ts`, `useAcademyCards.ts`, `useAcademyAnnotations.ts`, `useAcademySettings.ts`, `useAnnotationsAdmin.ts`, `useCourseProgress.ts`, `useContentCompletion.ts`, `useContinueTargets.ts`, `useContentNPS.ts`, `useNPSAdminData.ts`, `useRetentionReminders.ts`, `useReadingProgress.ts`, `useAccessHourTracker.ts`.

> ⚠️ **Atenção a usos cruzados:** alguns destes hooks/utilitários são compartilhados (`useReadingProgress`, `useRetentionReminders`, `useNPSAdminData`, `paragraphIndexer.ts`) e aparecem também em Blog/Admin/Notas. Não excluir cega­mente — verificar referência antes de descartar. Componente `src/components/AcademiaBanner.tsx` (na landing) também sai. Tabelas `academy_*` no banco: decisão de drop vs. manter está aberta (pivot C6).
