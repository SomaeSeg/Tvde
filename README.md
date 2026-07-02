# VitaOS 💪

A tua central de saúde: **biometria detalhada, treino em casa e nutrição** num só lugar. PWA instalável no telemóvel, construída com Next.js + Supabase.

## Funcionalidades (V1)

### 📏 Corpo
- Registo diário de peso + **todas as métricas da balança inteligente** (gordura corporal, gordura visceral, massa muscular, músculo esquelético, água, massa óssea, TMB, idade metabólica, proteína corporal)
- Medidas corporais (cintura, anca, peito, braços, coxas…) com deltas e rácios cintura/altura e cintura/anca
- Gráficos com **média móvel de 7 dias** e tendência semanal
- Metas por métrica com **projeção da data de conclusão** ao ritmo atual

### 🍽️ Nutrição
- Diário por refeição com calorias e macros vs alvo diário
- Pesquisa **Open Food Facts** (boa cobertura PT/EU) + base de ~50 alimentos portugueses
- **Scan de código de barras** pela câmara (API BarcodeDetector)
- Alimentos manuais e **refeições típicas** guardadas para registo em 2 toques
- Hidratação com meta diária
- Alvo de kcal/macros calculado por Mifflin-St Jeor × atividade × objetivo, recalculável no Perfil

### 🏋️ Treino
- 4 planos pré-feitos **adaptados ao equipamento que tens em casa** (halteres, banco, passadeira, bicicleta, elásticos, barra, peso corporal)
- Biblioteca de ~48 exercícios com instruções, filtrável por equipamento/categoria
- Registo de sessões: séries × reps × carga (força) ou duração/distância/FC (cardio)
- **Cronómetro de descanso**, **aquecimento automático** gerado para os músculos do dia e **deteção de PRs** (1RM estimado)

### 🏠 Hoje
- Dashboard com peso (média 7d), calorias, proteína, treino do dia, hidratação e streak 🔥
- Alertas contextuais (proteína em falta, peso estagnado)
- Check-in diário de humor/energia/sono
- **Revisão semanal** automática: semana vs semana anterior

### Outros
- Exportação total dos dados em JSON (Perfil → Dados)
- PWA instalável com shell offline básico

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · TanStack Query · Recharts · Vitest

## Setup

1. **Supabase** — cria um projeto em [supabase.com](https://supabase.com) (grátis) ou usa o CLI local:
   ```bash
   npx supabase init   # primeira vez
   npx supabase start  # precisa de Docker
   ```
2. **Base de dados** — aplica a migração e o seed:
   - Cloud: cola o conteúdo de `supabase/migrations/0001_schema.sql` e depois `supabase/seed/seed.sql` no SQL Editor do dashboard.
   - Local: `npx supabase db reset` aplica as migrações; depois corre o seed com `psql "$DB_URL" -f supabase/seed/seed.sql`.
3. **Variáveis de ambiente**:
   ```bash
   cp .env.example .env.local
   # preenche NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
4. **Correr**:
   ```bash
   npm install
   npm run dev
   ```

Para instalar no telemóvel: abre a app no browser → menu → "Adicionar ao ecrã principal".

## Testes

```bash
npm test        # testes unitários do motor de cálculos (vitest)
npm run lint
npm run build
```

## Roadmap

- **V2 — Inteligência**: coach IA (Claude) com contexto total dos teus dados, foto da refeição → kcal, alvo calórico adaptativo (TDEE real), análises clínicas + Metabolic Score, suplementos, lista de compras, gestor de fadiga, receitas com porções, fotos de progresso.
- **V3 — Social & integrações**: grupos privados, desafios de saúde real, Apple Health/Google Fit, Strava, notificações push.
