# VitaOS — Plano da app de Saúde, Gym & Fitness

## Contexto

O objetivo é criar a app de health & fitness mais completa possível para uso pessoal (e potencialmente público), juntando num só produto o que hoje está espalhado por várias apps: biometria detalhada de balança inteligente (MyFitnessPal não faz), treino em casa adaptado ao equipamento disponível (Nike Training Club não liga à nutrição), diário alimentar com foco em produtos portugueses/europeus (Open Food Facts), e mais tarde um coach com IA que lê todos os dados e explica o "porquê".

**Decisões já tomadas com o utilizador:**
- **Plataforma:** PWA / web app instalável (Next.js + Supabase) — funciona em iOS/Android/desktop sem lojas.
- **Âmbito V1:** núcleo completo — biometria + medidas, refeições + calorias, treinos em casa, dashboard "Hoje".
- **BD de alimentos:** Open Food Facts (gratuita, boa cobertura PT/EU, códigos de barras) + alimentos base + refeições personalizadas.
- O código será colocado num **repositório novo** (este repo Tvde está vazio e serve só para o plano); por agora, desenvolver na branch `claude/health-fitness-app-plan-7sl7p1` e migrar depois.

---

## 1. Stack técnica

| Camada | Escolha | Porquê |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript + Tailwind CSS** | PWA instalável, rápido de iterar, SSR para dashboards |
| PWA | `next-pwa` / service worker + manifest | Instalável no telemóvel, funciona offline (registos em fila) |
| Backend/BD | **Supabase** (Postgres + Auth + Row Level Security + Storage) | Auth pronta, BD relacional, storage para fotos de progresso |
| Gráficos | **Recharts** | Gráficos de peso/gordura/medidas com médias móveis |
| Alimentos | **Open Food Facts API** (barcode + pesquisa) com cache local em Postgres | Cobertura PT/EU gratuita |
| Scan barcode | `html5-qrcode` ou API `BarcodeDetector` do browser (câmara na PWA) | Scan de códigos de barras sem app nativa |
| Estado/fetch | React Query (TanStack Query) | Cache, optimistic updates, offline retry |
| IA (V2) | Claude API (`claude-sonnet-5`) | Coach conversacional + insights semanais |
| Idioma | PT-PT primeiro, i18n preparado (`next-intl`) | Utilizador português; EN depois |

---

## 2. Módulos do produto (o que já estava definido + o que acrescento)

### 2.1 Corpo (biometria) — V1
- Peso diário + **todas as métricas da balança inteligente**: % gordura corporal, gordura visceral, massa muscular, músculo esquelético, % água, massa óssea, TMB, idade metabólica, proteína corporal.
- Medidas corporais: pescoço, ombros, peito, cintura, anca, braço E/D, coxa E/D, gémeo E/D — com comparação lado a lado por semana/mês.
- IMC, rácio cintura/altura e rácio cintura/anca calculados automaticamente.
- **Fotos de progresso** (frente/lado/costas) com comparador lado a lado e privacidade total (Supabase Storage privado).
- Gráficos com **média móvel de 7 dias** (a métrica que importa, não o peso do dia) e bandas de tendência.
- Metas por métrica com data-alvo (ex.: "gordura visceral 17 → 12 até dezembro") e projeção de quando será atingida ao ritmo atual.

### 2.2 Nutrição — V1
- Diário por refeição (pequeno-almoço, almoço, jantar, snacks) com calorias + macros (proteína, hidratos, gordura, fibra, açúcar, sal).
- Pesquisa Open Food Facts + scan de código de barras pela câmara + alimentos criados manualmente.
- **Refeições típicas guardadas** ("a minha sopa", "sandes de bife") para registo em 2 toques — a feature nº 1 de adesão.
- Receitas próprias com cálculo automático por porção.
- Cálculo de necessidades: TMB (Mifflin-St Jeor, ou a TMB real da balança se registada) × atividade × objetivo (ex.: perder 0,5 kg/semana) → alvo de kcal e macros.
- Hidratação (copos/ml) com meta diária.
- Vista simples (kcal + proteína) e vista avançada (todos os micronutrientes disponíveis).

### 2.3 Treino em casa — V1
- Onboarding de equipamento: peso corporal, halteres (com que cargas), banco, elásticos, passadeira, bicicleta, barra de tração, etc.
- Biblioteca de exercícios com **animação/GIF + instruções de execução**, filtrável por equipamento/músculo/dificuldade (seed inicial de ~150 exercícios via base aberta tipo wger/free-exercise-db).
- Planos estruturados por objetivo e nível (ex.: "Perder gordura em casa — iniciante", "Primeiro ciclo de força com halteres") em ciclos semanais que misturam força + cardio (passadeira/bike).
- Registo de treino: séries × reps × carga, ou duração/distância/FC média para cardio; cronómetro de descanso.
- Histórico e recordes pessoais (PRs) por exercício; progressão sugerida (dupla progressão reps→carga).
- Se falhas um treino, o plano **reordena a semana** em vez de o perder.

### 2.4 Dashboard "Hoje" — V1
- Cartões: peso vs média 7d, kcal consumidas vs alvo, proteína, treino do dia, hidratação, streak de registo.
- Alertas contextuais: "faltam 40 g de proteína", "peso estagnado há 2 semanas — sugerimos recalibrar o alvo".
- Check-in diário de humor/energia/sono (escala 1–5) — alimenta os insights do coach em V2.

---

## 3. Coisas NOVAS a acrescentar (para ser "a melhor do mundo")

Além do que a pesquisa de mercado já identificou (Metabolic Score, alvo calórico auto-ajustável, planos home-aware, protocolos de 30 dias), acrescento:

1. **Revisão semanal automática** (V1, sem IA): todos os domingos, um relatório "A tua semana" — tendência de peso, aderência ao alvo de kcal, treinos feitos vs planeados, medidas alteradas. Nenhuma app grátis faz isto bem.
2. **Registo de análises clínicas** (V2): colesterol, glicemia/HbA1c, tensão arterial, FC de repouso — com gráficos e faixas de referência. Fecha o ciclo "fitness → saúde real" e alimenta o Metabolic Score.
3. **Suplementos e medicação** (V2): registo com lembretes (creatina, whey, vitamina D…), cruzado com o diário alimentar para totais reais de proteína.
4. **Foto da refeição com estimativa por IA** (V2, Claude vision): tira foto ao prato → estimativa de alimentos e kcal, editável. Registo sem fricção — o santo graal da adesão.
5. **Lista de compras gerada do plano de refeições** (V2): plano semanal → lista agregada por categoria, com quantidades.
6. **Gestor de fadiga/recuperação** (V2): usa check-ins de sono/energia + volume de treino para sugerir deload ou trocar força por mobilidade num dia mau.
7. **Aquecimento automático** (V1, barato de fazer): cada treino gera 5 min de warm-up específico dos músculos do dia.
8. **Modo "Recovery/base cardiovascular"** (V2): protocolo seguro para FC de repouso alta ou regresso de pausa longa — caminhada progressiva na passadeira com zonas de FC.
9. **Exportação total dos dados** (V1): CSV/JSON de tudo. Confiança + nenhum lock-in — raro no mercado.
10. **Offline-first** (V1): registar peso/refeição/treino sem rede; sincroniza quando voltar. Crítico numa PWA.
11. **Streaks inteligentes** (V1): streak de *consistência* (registaste + cumpriste ±10% do alvo), não apenas de abrir a app.
12. **Coach IA com contexto total** (V2): chat que lê biometria + refeições + treinos + check-ins e responde "porque não desceu o peso esta semana?" com dados reais, e explica métricas (gordura visceral, TMB) em linguagem simples.
13. **Alvo calórico adaptativo** (V2): recalibra o défice a cada 2 semanas com base no gasto energético *real* implícito na tendência de peso vs kcal registadas (método "adaptive TDEE", tipo MacroFactor — nenhuma app grátis o faz).
14. **Grupos privados e desafios de saúde real** (V3): desafios de consistência e de métricas (baixar FC repouso), não só passos.
15. **Integrações** (V3): Apple Health/Google Fit (via wrapper nativo Capacitor se se justificar), Strava, balanças com API.

---

## 4. Esquema de base de dados (Supabase/Postgres, principais tabelas)

Todas com `user_id` + Row Level Security.

- `profiles` — dados do utilizador: sexo, data nascimento, altura, objetivo, nível atividade, equipamento (jsonb), preferências.
- `body_metrics` — 1 linha/dia: peso, %gordura, gordura_visceral, %musculo, musculo_esqueletico, %agua, massa_ossea, tmb, idade_metabolica, fonte.
- `body_measurements` — data, local (cintura, anca, …), valor_cm.
- `progress_photos` — data, pose, storage_path.
- `goals` — métrica, valor_alvo, data_alvo, estado.
- `foods` — cache local: nome, marca, barcode, kcal/macros por 100g, fonte (off | manual | receita).
- `recipes` + `recipe_items` — receitas com porções.
- `meal_templates` — "refeições típicas" para logging rápido.
- `food_logs` — data, refeição (pa/almoço/jantar/snack), food_id/recipe_id, quantidade, kcal e macros calculados.
- `water_logs` — data, ml.
- `exercises` — nome, músculos, equipamento, gif_url, instruções, dificuldade.
- `workout_plans` + `plan_days` + `plan_exercises` — programas semanais.
- `workout_sessions` + `session_sets` — o que foi realmente feito (séries/reps/carga ou duração/distância).
- `daily_checkins` — humor, energia, sono_horas, notas.
- `nutrition_targets` — histórico de alvos (kcal, macros) com data de início — permite o motor adaptativo em V2.
- V2: `lab_results`, `supplements` + `supplement_logs`, `coach_conversations`.

---

## 5. Roadmap faseado

### V1 — Núcleo completo (o que se constrói agora)
1. **Setup**: repo novo, Next.js + TS + Tailwind + Supabase (auth email/password + Google), PWA manifest/service worker, esquema BD + RLS + seeds.
2. **Onboarding**: dados pessoais, objetivo, equipamento, cálculo do alvo calórico inicial.
3. **Módulo Corpo**: registo diário (formulário rápido com todas as métricas da balança), medidas, fotos, gráficos com média 7d, metas.
4. **Módulo Nutrição**: pesquisa OFF + barcode + alimentos manuais, diário por refeição, refeições típicas, receitas, hidratação, alvo kcal/macros.
5. **Módulo Treino**: biblioteca de exercícios (seed), 4–6 planos pré-feitos por objetivo/equipamento, registo de sessões, PRs, cronómetro descanso, warm-up automático.
6. **Dashboard Hoje** + check-in diário + streaks + revisão semanal automática.
7. **Exportação de dados** + offline-first (fila de sync).

### V2 — Inteligência
- Coach IA (Claude) com contexto total; foto de refeição → kcal; alvo calórico adaptativo (TDEE real); análises clínicas + Metabolic Score; suplementos; lista de compras; gestor de fadiga; modo Recovery.

### V3 — Social & Integrações
- Grupos privados, desafios de saúde real, partilha de receitas/planos; Apple Health/Google Fit (Capacitor), Strava, notificações push.

---

## 6. Ordem de execução da V1 (marcos verificáveis)

| # | Marco | Entregável testável |
|---|---|---|
| 1 | Fundações | Login funciona, BD criada com RLS, PWA instala no telemóvel |
| 2 | Corpo | Registar peso+métricas da balança e ver gráfico com média 7d |
| 3 | Nutrição | Scan de um produto PT real → registar almoço → ver kcal vs alvo |
| 4 | Treino | Escolher plano "halteres em casa", fazer sessão, registar séries |
| 5 | Hoje + revisão | Dashboard com todos os cartões; relatório de domingo gerado |
| 6 | Polimento | Offline, export, streaks, i18n PT, dark mode |

## 7. Verificação
- Testes E2E do fluxo principal (Playwright, já pré-instalado no ambiente): onboarding → registar peso → registar refeição → registar treino → dashboard reflete tudo.
- Testes unitários dos cálculos (TMB, alvo kcal, macros por porção, médias móveis, projeção de metas) — são o coração da app, têm de estar certos.
- Teste manual na PWA em telemóvel: instalação, scan de barcode com a câmara, registo offline.

## Notas
- Repositório: o utilizador confirmou que o código irá depois para um **repositório novo**; por agora tudo é desenvolvido e pushado na branch `claude/health-fitness-app-plan-7sl7p1` deste repo.
- Idioma da UI: PT-PT.
