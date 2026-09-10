# Reconstrução do site da LH Prime Pinturas

## Contexto

O usuário pediu para analisar o site `prime-paint-canvas.lovable.app` (landing page de uma empresa de pintura — LH Prime Pinturas, de Bom Jesus do Itabapoana/RJ) e reconstruir uma **versão melhorada dentro deste workspace** (que hoje é um template limpo com uma página placeholder).

Problemas identificados no site original:
- Textos de "imagem de referência / será substituída" expostos ao público e selo do gerador visível
- Botão secundário e textos com **baixo contraste** sobre o fundo roxo-escuro
- Fotos de stock genéricas desconectadas da realidade local
- 8 cards de serviço idênticos, sem hierarquia
- Poluição visual de botões flutuantes empilhados

**Decisões do usuário:**
1. Reconstruir o site aqui no workspace.
2. Prioridade: **design premium e coeso** (cores, tipografia, contraste).
3. Paleta: **manter roxo + verde**, porém refinada e com contraste corrigido.
4. Fotos: **não usar imagens falsas/stock** — deixar espaços elegantes reservados para as fotos reais do cliente.

## Estratégia de design

### Paleta (refinada a partir do roxo + verde original)
- **Roxo-tinta profundo** (`--primary` ~ 262 60% 14%) para seções escuras/hero; variante média (262 45% 32%) para detalhes
- **Verde-esmeralda** (~ 150 70% 38%) como cor de ação/CTA, com variantes hover/pressionado no `button.tsx`
- Fundos claros com leve tinta de roxo (ex.: 260 40% 98%) em vez de cinza neutro
- Texto de corpo em seções escuras: roxo-claro luminoso (~ 258 60% 92%) com opacidade controlada, garantindo ≥ 4.5:1 de contraste
- Botão secundário sobre fundo escuro: `bg-white/10 border-white/25 text-white` (visível), nunca roxo-escuro sobre roxo-escuro

### Tipografia
- Importar Google Fonts no `index.html`: **Sora** (display/títulos) + **Inter** (corpo)
- Registrar em `tailwind.config.ts` como `font-display` / `font-sans`

### Tokens, gradientes e animações (`src/index.css`)
- `--gradient-hero`: gradiente diagonal roxo profundo → roxo médio
- `--shadow-glow` e `--shadow-elegant` usando o roxo/verde com transparência
- Keyframe de `fade-up` para reveal suave ao scroll (via `framer-motion`, já instalado)
- `scroll-behavior: smooth` + `scroll-margin-top` nas seções

### Slots de foto real (substitui o "imagem de referência")
Componente `ImagePlaceholder` reutilizável: slot limpo com gradiente suave, borda tracejada, ícone lucide e legenda curta (ex.: "Espaço reservado para foto do trabalho"). Variantes de proporção (16:9, 4:3, 1:1, retrato). Zero texto expondo "referência".

## Estrutura da página (seções)

1. **Navbar sticky** — logo "LH Prime Pinturas", âncoras (Serviços, Antes e Depois, Galeria, Processo, FAQ, Contato), CTA verde WhatsApp, menu mobile via `Sheet`
2. **Hero** — badge "Pintura e acabamento de alto padrão", headline "Pintura que transforma ambientes.", subtítulo, cidade com pin, CTA verde + CTA secundário legível, placeholder de imagem em destaque
3. **Trust bar** — 4 diferenciais com check (acabamento profissional, cuidado em cada detalhe, atendimento personalizado, região)
4. **Sobre** — 2 colunas, texto, citação "Cada detalhe faz diferença no resultado final.", placeholder
5. **Serviços** — 8 cards com ícones lucide e hierarquia melhorada
6. **Antes e Depois** — `BeforeAfterSlider` (divisor arrastável com `pointer events`) para 2 projetos, placeholders internos
7. **Ferramenta Achei a Tinta** — 2 passos, links externos (acheiatinta.com)
8. **Galeria** — filtros funcionais (Todos/Residencial/Comercial/Interno/Externo/Antes e Depois) + grid de placeholders
9. **Processo** — 4 passos numerados
10. **Depoimentos** — cards elegantes com espaço para depoimentos reais (sem textos falsos)
11. **Instagram + Área de atendimento** — @luuiiztellespio, CTA ver Instagram; cidade atendida
12. **FAQ** — `Accordion` shadcn com as perguntas do site original
13. **Formulário de contato** — nome, WhatsApp, cidade, tipo de serviço, mensagem → monta mensagem e abre `wa.me/5522992538926` (sem backend, "não armazenamos dados")
14. **CTA final + Footer** — marcas, links, contato
15. **Botão flutuante único de WhatsApp** (sem empilhamento com outros botões)

## Arquivos

**Criar:**
- `src/data/site.ts` — config: telefone (5522992538926), Instagram, links, serviços, galeria, passos, FAQ, etc.
- `src/lib/whatsapp.ts` — helper `buildWhatsAppLink(message)`
- `src/components/site/ImagePlaceholder.tsx` — slot de foto real reutilizável
- `src/components/site/BeforeAfterSlider.tsx` — comparador arrastável
- `src/components/site/Navbar.tsx`, `Hero.tsx`, `About.tsx`, `Services.tsx`, `BeforeAfter.tsx`, `ColorTools.tsx`, `Gallery.tsx`, `Process.tsx`, `Testimonials.tsx`, `ServiceArea.tsx`, `Faq.tsx`, `ContactForm.tsx`, `Footer.tsx`, `FloatingWhatsApp.tsx`

**Modificar:**
- `src/pages/Index.tsx` — reescrita, compondo as seções (remove `useTranslation`)
- `src/index.css` — tokens de cor/tipografia, gradientes, sombras, keyframes
- `tailwind.config.ts` — fontes (`font-sans`/`font-display`), animações, cores extras se necessário
- `src/components/ui/button.tsx` — adicionar variants `hero-secondary`, `whatsapp` e melhorar contraste dos outline sobre fundo escuro
- `index.html` — `lang="pt-BR"`, `<title>` e meta description em português, links das Google Fonts

**Reutilizar (já existentes):** `Accordion`, `Sheet`, `Input`, `Textarea`, `Select`, `Badge`, `Separator`, `lucide-react`, `framer-motion`, `clsx`/`cn`.

**Não tocar:** `i18n/*` (fica inicializado mas sem uso), `analytics.ts`, demais componentes shadcn.

## Checklist de implementação

- [ ] Adicionar Google Fonts (Sora + Inter) no `index.html` e registrar `font-display`/`font-sans` no `tailwind.config.ts`
- [ ] Definir tokens refinados de roxo/verde, gradientes, sombras e keyframe `fade-up` no `src/index.css`
- [ ] Adicionar variants (`hero-secondary`, `whatsapp`) e corrigir contraste dos buttons em `src/components/ui/button.tsx`
- [ ] Criar `src/lib/whatsapp.ts` com `buildWhatsAppLink`
- [ ] Criar `src/data/site.ts` com todo o conteúdo (telefone 5522992538926, Instagram @luuiiztellespio, serviços, galeria, passos, FAQ)
- [ ] Criar `ImagePlaceholder.tsx` com variantes de proporção (16:9, 4:3, 1:1)
- [ ] Criar `Navbar.tsx` sticky com âncoras, CTA verde e menu mobile via `Sheet`
- [ ] Criar `Hero.tsx` com badge, headline, CTAs legíveis e placeholder em destaque
- [ ] Criar `About.tsx` com citação e placeholder
- [ ] Criar `Services.tsx` com 8 cards de serviço e ícones lucide
- [ ] Criar `BeforeAfterSlider.tsx` (divisor arrastável via pointer events)
- [ ] Criar `BeforeAfter.tsx` com 2 projetos usando o slider
- [ ] Criar `ColorTools.tsx` com os 2 passos e links externos
- [ ] Criar `Gallery.tsx` com filtros funcionais e grid de placeholders
- [ ] Criar `Process.tsx` com os 4 passos
- [ ] Criar `Testimonials.tsx` com cards para depoimentos reais (sem texto falso)
- [ ] Criar `ServiceArea.tsx` (Instagram + atendimento regional)
- [ ] Criar `Faq.tsx` com `Accordion`
- [ ] Criar `ContactForm.tsx` que monta mensagem e abre `wa.me` (sem backend)
- [ ] Criar `Footer.tsx` e `FloatingWhatsApp.tsx` (botão único flutuante)
- [ ] Reescrever `src/pages/Index.tsx` compondo todas as seções
- [ ] Atualizar `index.html`: `lang="pt-BR"`, título e meta description em português

## Checklist de verificação

- [ ] `pnpm lint` sem erros
- [ ] `pnpm exec tsc --noEmit` sem erros
- [ ] `pnpm run build` conclui com sucesso
- [ ] Screenshot `desktop_1280`: todas as seções renderizam, CTAs verdes e botões secundários com contraste visível sobre fundo escuro
- [ ] Screenshot `mobile_390`: menu mobile abre, grids empilham, sem overflow horizontal
- [ ] Filtros da galeria (Todos/Residencial/Comercial/Interno/Externo/Antes e Depois) alternam o grid corretamente
- [ ] Slider antes/depois arrasta e mostra as duas imagens
- [ ] Submeter o formulário abre `wa.me` com a mensagem pré-preenchida corretamente
- [ ] Âncoras do menu rolam suavemente até as seções
- [ ] Nenhum texto de placeholder exposto (ex.: "imagem de referência") permanece no site
