# QG do Mestre — Nuckturp · Guia de Identidade Visual

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> Referência rápida de cores, tipografia e elementos visuais do projeto.

---

## 1. Paleta de Cores

### Cores principais da marca

| Nome           | HSL                  | HEX (aprox.) | Uso                                                              |
| -------------- | -------------------- | ------------ | ---------------------------------------------------------------- |
| **Cyber Lime** | `82 100% 65%`       | `#C4FF4D`    | Cor primária, CTAs, destaques, links, ícone ativo, `<strong>`    |
| **Vapor Violet** | `268 100% 77%`    | `#BA8CFF`    | Cor secundária, ênfase (`<em>`), variações de destaque, badges   |
| **Noir Void**  | `0 0% 10%`          | `#1A1A1A`    | Fundo principal, base do tema dark                               |

### Cores de suporte (tokens semânticos)

| Token               | HSL                  | Uso                                                    |
| -------------------- | -------------------- | ------------------------------------------------------ |
| `--background`       | `0 0% 10%`          | Fundo geral da aplicação                               |
| `--foreground`       | `80 100% 95%`       | Texto principal (quase branco com leve tom esverdeado)  |
| `--card`             | `0 0% 12%`          | Fundo de cards, painéis e modais                       |
| `--muted`            | `0 0% 18%`          | Fundos sutis, áreas inativas                           |
| `--muted-foreground` | `0 0% 55%`          | Texto secundário, placeholders, legendas               |
| `--border`           | `0 0% 22%`          | Bordas e divisores                                     |
| `--destructive`      | `0 84% 60%`         | Ações destrutivas (remover, deletar)                   |
| `--grid-gray`        | `0 0% 30%`          | Linhas de grid e guias visuais (whiteboard)            |
| `--sidebar-background` | `0 0% 8%`         | Fundo da sidebar (mais escuro que o background)        |

### Regras de uso de cor

- **Nunca** use cores hardcoded em componentes. Sempre use tokens do design system (`bg-primary`, `text-foreground`, etc.)
- Para variações de opacidade, use a sintaxe Tailwind: `text-primary/50`, `bg-cyber-lime/15`
- Todas as cores são **HSL** para compatibilidade com o sistema de temas
- O projeto é **dark-first** — não há tema claro implementado

---

## 2. Tipografia

### Fontes

| Fonte             | Variável Tailwind  | Pesos disponíveis     | Uso                                         |
| ----------------- | ------------------ | --------------------- | ------------------------------------------- |
| **Space Grotesk** | `font-display`     | 400, 500, 600, 700    | Títulos (h1–h6), destaques, branding        |
| **Inter**         | `font-sans`        | 300–900               | Corpo de texto, UI, formulários, botões     |

### Regras de tipografia

- Todos os headings (`h1`–`h6`) usam **Space Grotesk** automaticamente via CSS global
- Corpo de texto usa **Inter** como fonte padrão (`font-sans`)
- Para destaques de branding, use a classe `font-display`
- `<strong>` no editor renderiza com **cor Cyber Lime** e peso 650
- `<em>` no editor renderiza com **cor Vapor Violet** e itálico

---

## 3. Iconografia & Logo

| Elemento                  | Arquivo                                          | Uso                                        |
| ------------------------- | ------------------------------------------------ | ------------------------------------------ |
| Logo (texto branco)       | `src/assets/nuckturp-aventura-logo-white.png`    | Header, landing page, branding             |
| Ícone D20 (branco)        | `src/assets/nuckturp-dado-white.png`             | Favicon, ícone de app, loading             |
| Favicon                   | `public/favicon.png`                             | Aba do navegador                           |

### Dado D20

O ícone de **dado D20** é o símbolo central da identidade visual. Usado como:

- Favicon
- Ícone de loading/splash
- Elemento decorativo na landing page (`FloatingDice`)
- Referência visual em componentes de RPG

---

## 4. Estilo Visual

### Filosofia

**"Gamer Premium"** — dark-first, minimalista mas com personalidade forte.

### Princípios

1. **Fundo escuro dominante** — Noir Void como base, variações em cinzas escuros
2. **Destaques pontuais** — Cyber Lime para ações primárias, Vapor Violet para ênfase
3. **Glassmorphism sutil** — `backdrop-blur` + fundos translúcidos em overlays e painéis flutuantes
4. **Bordas e sombras discretas** — bordas em `border` token, sombras profundas (`shadow-xl shadow-black/40`)
5. **Gradientes de marca** — usados em banners e capas:
   - `cyber-lime`: do Cyber Lime/40 ao Cyber Lime/10
   - `vapor-violet`: do Vapor Violet/40 ao Vapor Violet/10
   - `noir-void`: do Noir Void ao Noir Void/60

### Bordas arredondadas

- Raio padrão: `0.75rem` (12px) — definido em `--radius`
- Botões e inputs seguem o raio padrão
- Cards e painéis usam `rounded-xl` ou `rounded-2xl`

---

## 5. Componentes de Marca

### Botões sobre imagens (banner)

Quando botões aparecem sobre imagens de banner:

- Fundo: `black/80` ou `black/85` com `backdrop-blur-lg`
- Bordas coloridas translúcidas (Cyber Lime, Vapor Violet)
- Texto na cor da ação correspondente
- Sombras fortes para garantir legibilidade

### Banner / Cover

- **Dimensões ideais**: 1500×500px (proporção 3:1)
- **Formatos aceitos**: JPG, PNG, WebP, GIF
- **Tamanho máximo**: 5MB
- Compressão automática para WebP (90% qualidade)
- Posição vertical ajustável (0–100%, salva como inteiro)

### Avatar

- **Dimensões ideais**: 400×400px
- Compressão automática para WebP

---

## 6. Animações

- Transições suaves com `transition-all` ou `transition-colors`
- `animate-fade-in` para entrada de painéis e overlays
- Dados flutuantes na landing page com animação contínua
- Sem animações excessivas — sobriedade gamer

---

## 7. Responsividade

- **Mobile-first** para tablet e celular (uso principal)
- Breakpoints Tailwind padrão: `sm`, `md`, `lg`, `xl`
- Sidebar colapsável no mobile
- Botões e áreas de toque com mínimo 44px de altura

---

## 8. Nomenclatura da Marca

| Contexto          | Nome correto                     |
| ----------------- | -------------------------------- |
| Nome do produto   | **QG do Mestre**                 |
| Marca/sufixo      | **Nuckturp**                     |
| Título completo   | **QG do Mestre — Nuckturp**      |
| SEO / Marketing   | "QG do Mestre — Nuckturp"        |
| URL publicada     | `nuckturp.com.br`                |

---

*Documento gerado em 26/02/2026. Fonte: `src/index.css`, `tailwind.config.ts`, memórias do projeto.*
