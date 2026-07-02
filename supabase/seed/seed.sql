-- VitaOS — dados iniciais: exercícios, planos de treino e alimentos base PT.
-- Idempotente: usa on conflict do nothing via slugs/nomes únicos.

-- =========================================================
-- Exercícios globais (user_id null)
-- =========================================================
insert into public.exercises (slug, name, category, primary_muscles, equipment, difficulty, instructions) values
-- Peso corporal
('flexoes', 'Flexões', 'strength', '{peito,tricep,ombros}', '{bodyweight}', 'beginner', 'Mãos à largura dos ombros, corpo em linha reta, desce o peito até quase tocar o chão e empurra.'),
('flexoes-joelhos', 'Flexões nos joelhos', 'strength', '{peito,tricep}', '{bodyweight}', 'beginner', 'Variante mais fácil das flexões com apoio nos joelhos.'),
('agachamento', 'Agachamento', 'strength', '{quadricep,gluteo}', '{bodyweight}', 'beginner', 'Pés à largura dos ombros, desce como se te fosses sentar, peito erguido, e sobe.'),
('afundo', 'Afundo (lunge)', 'strength', '{quadricep,gluteo}', '{bodyweight}', 'beginner', 'Passo em frente, desce o joelho de trás quase até ao chão, mantém o tronco vertical.'),
('ponte-gluteos', 'Ponte de glúteos', 'strength', '{gluteo,posterior}', '{bodyweight}', 'beginner', 'Deitado de costas, joelhos fletidos, eleva a anca contraindo os glúteos.'),
('prancha', 'Prancha', 'core', '{core}', '{bodyweight}', 'beginner', 'Antebraços no chão, corpo em linha reta, contrai o abdómen. Não deixes a anca cair.'),
('prancha-lateral', 'Prancha lateral', 'core', '{core,obliquos}', '{bodyweight}', 'intermediate', 'De lado, apoio num antebraço, corpo em linha reta.'),
('mountain-climbers', 'Mountain climbers', 'cardio', '{core,ombros}', '{bodyweight}', 'intermediate', 'Em posição de prancha alta, alterna os joelhos ao peito em ritmo rápido.'),
('burpees', 'Burpees', 'cardio', '{corpo_todo}', '{bodyweight}', 'intermediate', 'Agacha, apoia as mãos, salta para prancha, flexão opcional, volta e salta.'),
('polichinelos', 'Polichinelos (jumping jacks)', 'cardio', '{corpo_todo}', '{bodyweight}', 'beginner', 'Salta abrindo pernas e braços em simultâneo, volta à posição inicial.'),
('agachamento-salto', 'Agachamento com salto', 'cardio', '{quadricep,gluteo}', '{bodyweight}', 'intermediate', 'Agachamento explosivo terminando com salto vertical.'),
('superman', 'Superman', 'strength', '{lombar,gluteo}', '{bodyweight}', 'beginner', 'Deitado de barriga para baixo, eleva braços e pernas em simultâneo, segura 2s.'),
('abdominal-crunch', 'Abdominal crunch', 'core', '{core}', '{bodyweight}', 'beginner', 'Deitado, joelhos fletidos, enrola o tronco levando as costelas à bacia.'),
('elevacao-pernas', 'Elevação de pernas', 'core', '{core}', '{bodyweight}', 'intermediate', 'Deitado, pernas esticadas, eleva-as até 90° sem arquear a lombar.'),
('dead-bug', 'Dead bug', 'core', '{core}', '{bodyweight}', 'beginner', 'De costas, braços e joelhos a 90°, estende braço e perna opostos sem mexer a lombar.'),
('bird-dog', 'Bird dog', 'core', '{core,lombar}', '{bodyweight}', 'beginner', 'De gatas, estende braço e perna opostos, mantém a bacia estável.'),
-- Halteres
('supino-halteres-chao', 'Supino com halteres no chão', 'strength', '{peito,tricep}', '{dumbbell}', 'beginner', 'Deitado no chão (ou banco), empurra os halteres do peito para cima.'),
('supino-halteres-banco', 'Supino com halteres no banco', 'strength', '{peito,tricep,ombros}', '{dumbbell,bench}', 'intermediate', 'Deitado no banco, desce os halteres ao nível do peito e empurra.'),
('remada-haltere', 'Remada unilateral com haltere', 'strength', '{costas,bicep}', '{dumbbell}', 'beginner', 'Apoia uma mão (banco/cadeira), puxa o haltere à anca com o cotovelo junto ao corpo.'),
('press-militar-halteres', 'Press militar com halteres', 'strength', '{ombros,tricep}', '{dumbbell}', 'beginner', 'Em pé, empurra os halteres dos ombros até acima da cabeça.'),
('curl-bicep', 'Curl de bíceps', 'strength', '{bicep}', '{dumbbell}', 'beginner', 'Cotovelos junto ao corpo, flete os antebraços sem balançar.'),
('extensao-tricep', 'Extensão de tríceps acima da cabeça', 'strength', '{tricep}', '{dumbbell}', 'beginner', 'Haltere seguro com as duas mãos atrás da cabeça, estende os cotovelos.'),
('agachamento-goblet', 'Agachamento goblet', 'strength', '{quadricep,gluteo,core}', '{dumbbell}', 'beginner', 'Haltere junto ao peito, agachamento profundo com peito erguido.'),
('peso-morto-romeno-halteres', 'Peso morto romeno com halteres', 'strength', '{posterior,gluteo,lombar}', '{dumbbell}', 'intermediate', 'Halteres à frente das coxas, desce-os pelas pernas com costas retas, anca atrás.'),
('afundo-halteres', 'Afundo com halteres', 'strength', '{quadricep,gluteo}', '{dumbbell}', 'intermediate', 'Afundo segurando um haltere em cada mão.'),
('elevacao-lateral', 'Elevação lateral', 'strength', '{ombros}', '{dumbbell}', 'beginner', 'Eleva os halteres lateralmente até à altura dos ombros, cotovelos ligeiramente fletidos.'),
('encolhimento-ombros', 'Encolhimento de ombros', 'strength', '{trapezio}', '{dumbbell}', 'beginner', 'Halteres ao lado do corpo, encolhe os ombros em direção às orelhas.'),
('remada-curvada-halteres', 'Remada curvada com halteres', 'strength', '{costas,bicep}', '{dumbbell}', 'intermediate', 'Tronco inclinado ~45°, puxa os dois halteres à cintura.'),
('russian-twist-haltere', 'Russian twist com haltere', 'core', '{obliquos,core}', '{dumbbell}', 'intermediate', 'Sentado, tronco inclinado atrás, roda o haltere de um lado para o outro.'),
-- Elásticos
('remada-elastico', 'Remada com elástico', 'strength', '{costas,bicep}', '{band}', 'beginner', 'Elástico preso à frente, puxa os cotovelos atrás apertando as omoplatas.'),
('press-peito-elastico', 'Press de peito com elástico', 'strength', '{peito,tricep}', '{band}', 'beginner', 'Elástico nas costas, empurra as mãos em frente.'),
('abducao-anca-elastico', 'Abdução de anca com elástico', 'strength', '{gluteo}', '{band}', 'beginner', 'Elástico acima dos joelhos, afasta os joelhos contra a resistência.'),
('face-pull-elastico', 'Face pull com elástico', 'strength', '{ombros,costas}', '{band}', 'intermediate', 'Puxa o elástico à cara com cotovelos altos, aperta as omoplatas.'),
-- Barra de tração
('tracao', 'Tração (pull-up)', 'strength', '{costas,bicep}', '{pullup_bar}', 'advanced', 'Pega pronada, puxa o queixo acima da barra sem balançar.'),
('tracao-negativa', 'Tração negativa', 'strength', '{costas,bicep}', '{pullup_bar}', 'intermediate', 'Salta para cima da barra e desce o mais devagar possível.'),
('suspensao-barra', 'Suspensão na barra (dead hang)', 'strength', '{antebraco,costas}', '{pullup_bar}', 'beginner', 'Pendura-te na barra com braços esticados e ombros ativos.'),
-- Passadeira
('caminhada-passadeira', 'Caminhada na passadeira', 'cardio', '{pernas}', '{treadmill}', 'beginner', 'Caminhada em ritmo confortável; usa inclinação para aumentar a intensidade.'),
('caminhada-inclinada', 'Caminhada inclinada', 'cardio', '{pernas,gluteo}', '{treadmill}', 'beginner', 'Passadeira com 6–12% de inclinação, passo firme sem te agarrares.'),
('corrida-passadeira', 'Corrida na passadeira', 'cardio', '{pernas}', '{treadmill}', 'intermediate', 'Corrida contínua em ritmo conversável.'),
('intervalos-passadeira', 'Intervalos na passadeira', 'cardio', '{pernas}', '{treadmill}', 'intermediate', '1 min rápido / 2 min lento, repetir. Ajusta velocidades ao teu nível.'),
-- Bicicleta
('bicicleta-continuo', 'Bicicleta — ritmo contínuo', 'cardio', '{pernas}', '{bike}', 'beginner', 'Pedalada contínua em zona 2 (consegues falar frases completas).'),
('bicicleta-intervalos', 'Bicicleta — intervalos', 'cardio', '{pernas}', '{bike}', 'intermediate', '30s forte / 90s leve, repetir 8–12 vezes.'),
-- Mobilidade
('gato-vaca', 'Gato-vaca', 'mobility', '{coluna}', '{bodyweight}', 'beginner', 'De gatas, alterna entre arquear e arredondar a coluna, devagar.'),
('alongamento-isquios', 'Alongamento de isquiotibiais', 'mobility', '{posterior}', '{bodyweight}', 'beginner', 'Perna esticada apoiada, inclina o tronco à frente com costas retas, 30s cada lado.'),
('rotacao-toracica', 'Rotação torácica', 'mobility', '{coluna,ombros}', '{bodyweight}', 'beginner', 'De gatas, mão na nuca, roda o cotovelo para o teto seguindo com o olhar.'),
('alongamento-flexores-anca', 'Alongamento de flexores da anca', 'mobility', '{anca}', '{bodyweight}', 'beginner', 'Posição de afundo baixo, empurra a anca em frente, 30s cada lado.'),
('worlds-greatest-stretch', 'World''s greatest stretch', 'mobility', '{anca,coluna}', '{bodyweight}', 'intermediate', 'Afundo profundo, cotovelo ao chão, roda o braço para o teto.')
on conflict (slug) do nothing;

-- =========================================================
-- Planos de treino globais
-- =========================================================
insert into public.workout_plans (slug, name, description, goal_type, level, equipment, weeks) values
('perder-gordura-iniciante', 'Perder gordura em casa — Iniciante',
 '3 treinos de força + 2 de cardio por semana. Só precisas de halteres e do teu corpo. Ideal para começar a perder gordura com segurança.',
 'lose_fat', 'beginner', '{bodyweight,dumbbell}', 4),
('forca-halteres-iniciante', 'Primeiro ciclo de força com halteres',
 'Programa full-body 3x/semana com halteres e banco. Foco em aprender os padrões básicos e progredir carga.',
 'gain_muscle', 'beginner', '{dumbbell,bench}', 4),
('cardio-casa-passadeira-bike', 'Base cardiovascular — passadeira & bicicleta',
 '5 sessões/semana de cardio de baixa intensidade para baixar a FC de repouso e construir base aeróbica.',
 'improve_health', 'beginner', '{treadmill,bike}', 4),
('peso-corporal-sem-equipamento', 'Full-body sem equipamento',
 '3 treinos/semana só com peso corporal. Para fazer em qualquer lado, sem desculpas.',
 'lose_fat', 'beginner', '{bodyweight}', 4)
on conflict (slug) do nothing;

-- Dias do plano: Perder gordura iniciante (Seg força A, Ter cardio, Qua descanso, Qui força B, Sex cardio, Sáb força C, Dom descanso)
with p as (select id from public.workout_plans where slug = 'perder-gordura-iniciante')
insert into public.plan_days (plan_id, day_index, name, focus)
select p.id, d.day_index, d.name, d.focus from p, (values
  (0, 'Força A — corpo inteiro', 'strength'),
  (1, 'Cardio — caminhada inclinada', 'cardio'),
  (3, 'Força B — corpo inteiro', 'strength'),
  (4, 'Cardio — bicicleta', 'cardio'),
  (5, 'Força C + core', 'strength')
) as d(day_index, name, focus)
on conflict (plan_id, day_index) do nothing;

with d as (
  select pd.id, pd.day_index from public.plan_days pd
  join public.workout_plans p on p.id = pd.plan_id where p.slug = 'perder-gordura-iniciante'
)
insert into public.plan_exercises (plan_day_id, exercise_id, position, sets, reps, rest_seconds, duration_minutes)
select d.id, e.id, x.position, x.sets, x.reps, x.rest, x.dur
from d
join (values
  (0, 'agachamento-goblet', 0, 3, '10-12', 90, null::int),
  (0, 'supino-halteres-chao', 1, 3, '8-12', 90, null),
  (0, 'remada-haltere', 2, 3, '10-12', 90, null),
  (0, 'prancha', 3, 3, '30s', 60, null),
  (1, 'caminhada-inclinada', 0, null, null, null, 35),
  (3, 'peso-morto-romeno-halteres', 0, 3, '10-12', 90, null),
  (3, 'press-militar-halteres', 1, 3, '8-12', 90, null),
  (3, 'afundo', 2, 3, '8/lado', 90, null),
  (3, 'dead-bug', 3, 3, '8/lado', 60, null),
  (4, 'bicicleta-continuo', 0, null, null, null, 35),
  (5, 'agachamento', 0, 3, '15', 60, null),
  (5, 'flexoes', 1, 3, 'máx', 90, null),
  (5, 'remada-curvada-halteres', 2, 3, '10-12', 90, null),
  (5, 'ponte-gluteos', 3, 3, '15', 60, null),
  (5, 'prancha-lateral', 4, 2, '20s/lado', 60, null)
) as x(day_index, slug, position, sets, reps, rest, dur) on x.day_index = d.day_index
join public.exercises e on e.slug = x.slug
on conflict do nothing;

-- Dias do plano: Força halteres iniciante (Seg/Qua/Sex full-body)
with p as (select id from public.workout_plans where slug = 'forca-halteres-iniciante')
insert into public.plan_days (plan_id, day_index, name, focus)
select p.id, d.day_index, d.name, d.focus from p, (values
  (0, 'Full-body A', 'strength'),
  (2, 'Full-body B', 'strength'),
  (4, 'Full-body C', 'strength')
) as d(day_index, name, focus)
on conflict (plan_id, day_index) do nothing;

with d as (
  select pd.id, pd.day_index from public.plan_days pd
  join public.workout_plans p on p.id = pd.plan_id where p.slug = 'forca-halteres-iniciante'
)
insert into public.plan_exercises (plan_day_id, exercise_id, position, sets, reps, rest_seconds, duration_minutes)
select d.id, e.id, x.position, x.sets, x.reps, x.rest, null::int
from d
join (values
  (0, 'agachamento-goblet', 0, 3, '8-12', 120),
  (0, 'supino-halteres-banco', 1, 3, '8-12', 120),
  (0, 'remada-haltere', 2, 3, '8-12', 90),
  (0, 'elevacao-lateral', 3, 2, '12-15', 60),
  (2, 'peso-morto-romeno-halteres', 0, 3, '8-12', 120),
  (2, 'press-militar-halteres', 1, 3, '8-12', 120),
  (2, 'afundo-halteres', 2, 3, '8/lado', 90),
  (2, 'curl-bicep', 3, 2, '10-15', 60),
  (4, 'agachamento-goblet', 0, 3, '8-12', 120),
  (4, 'supino-halteres-banco', 1, 3, '8-12', 120),
  (4, 'remada-curvada-halteres', 2, 3, '8-12', 90),
  (4, 'extensao-tricep', 3, 2, '10-15', 60)
) as x(day_index, slug, position, sets, reps, rest) on x.day_index = d.day_index
join public.exercises e on e.slug = x.slug
on conflict do nothing;

-- Dias do plano: Base cardiovascular
with p as (select id from public.workout_plans where slug = 'cardio-casa-passadeira-bike')
insert into public.plan_days (plan_id, day_index, name, focus)
select p.id, d.day_index, d.name, d.focus from p, (values
  (0, 'Caminhada zona 2', 'cardio'),
  (1, 'Bicicleta contínua', 'cardio'),
  (2, 'Caminhada inclinada', 'cardio'),
  (4, 'Bicicleta contínua', 'cardio'),
  (5, 'Caminhada longa', 'cardio')
) as d(day_index, name, focus)
on conflict (plan_id, day_index) do nothing;

with d as (
  select pd.id, pd.day_index from public.plan_days pd
  join public.workout_plans p on p.id = pd.plan_id where p.slug = 'cardio-casa-passadeira-bike'
)
insert into public.plan_exercises (plan_day_id, exercise_id, position, duration_minutes)
select d.id, e.id, 0, x.dur
from d
join (values
  (0, 'caminhada-passadeira', 30),
  (1, 'bicicleta-continuo', 30),
  (2, 'caminhada-inclinada', 30),
  (4, 'bicicleta-continuo', 35),
  (5, 'caminhada-passadeira', 45)
) as x(day_index, slug, dur) on x.day_index = d.day_index
join public.exercises e on e.slug = x.slug
on conflict do nothing;

-- Dias do plano: Peso corporal
with p as (select id from public.workout_plans where slug = 'peso-corporal-sem-equipamento')
insert into public.plan_days (plan_id, day_index, name, focus)
select p.id, d.day_index, d.name, d.focus from p, (values
  (0, 'Full-body A', 'strength'),
  (2, 'Full-body B + cardio', 'strength'),
  (4, 'Full-body C + core', 'strength')
) as d(day_index, name, focus)
on conflict (plan_id, day_index) do nothing;

with d as (
  select pd.id, pd.day_index from public.plan_days pd
  join public.workout_plans p on p.id = pd.plan_id where p.slug = 'peso-corporal-sem-equipamento'
)
insert into public.plan_exercises (plan_day_id, exercise_id, position, sets, reps, rest_seconds, duration_minutes)
select d.id, e.id, x.position, x.sets, x.reps, x.rest, null::int
from d
join (values
  (0, 'agachamento', 0, 3, '15-20', 60),
  (0, 'flexoes', 1, 3, 'máx', 90),
  (0, 'afundo', 2, 3, '10/lado', 60),
  (0, 'prancha', 3, 3, '30-45s', 60),
  (2, 'agachamento-salto', 0, 3, '10', 90),
  (2, 'flexoes-joelhos', 1, 3, '12-15', 60),
  (2, 'mountain-climbers', 2, 3, '30s', 60),
  (2, 'polichinelos', 3, 3, '45s', 45),
  (4, 'ponte-gluteos', 0, 3, '15-20', 60),
  (4, 'superman', 1, 3, '12', 60),
  (4, 'elevacao-pernas', 2, 3, '10-12', 60),
  (4, 'prancha-lateral', 3, 3, '20-30s/lado', 45)
) as x(day_index, slug, position, sets, reps, rest) on x.day_index = d.day_index
join public.exercises e on e.slug = x.slug
on conflict do nothing;

-- =========================================================
-- Alimentos base (valores por 100 g, fontes: tabelas de composição comuns)
-- =========================================================
insert into public.foods (name, brand, source, kcal_100, protein_100, carbs_100, fat_100, fiber_100, sugar_100, salt_100, serving_g) values
('Arroz branco cozido', null, 'base', 130, 2.7, 28.2, 0.3, 0.4, 0.1, 0.0, 150),
('Massa cozida (esparguete)', null, 'base', 158, 5.8, 30.9, 0.9, 1.8, 0.6, 0.0, 180),
('Batata cozida', null, 'base', 87, 1.9, 20.1, 0.1, 1.8, 0.9, 0.0, 200),
('Batata-doce cozida', null, 'base', 90, 2.0, 20.7, 0.2, 3.0, 6.5, 0.0, 200),
('Pão de mistura', null, 'base', 260, 8.5, 51.0, 1.5, 3.5, 2.0, 1.2, 60),
('Pão integral', null, 'base', 247, 10.0, 41.0, 3.5, 6.0, 4.0, 1.1, 50),
('Broa de milho', null, 'base', 278, 6.6, 58.0, 1.5, 3.0, 1.0, 1.0, 60),
('Flocos de aveia', null, 'base', 379, 13.2, 67.7, 6.5, 10.1, 1.0, 0.0, 40),
('Peito de frango grelhado', null, 'base', 165, 31.0, 0.0, 3.6, 0.0, 0.0, 0.2, 150),
('Bife de vaca grelhado', null, 'base', 217, 28.0, 0.0, 11.5, 0.0, 0.0, 0.2, 150),
('Bife de peru grelhado', null, 'base', 135, 29.0, 0.0, 1.7, 0.0, 0.0, 0.2, 150),
('Lombo de porco assado', null, 'base', 196, 27.0, 0.0, 9.5, 0.0, 0.0, 0.2, 150),
('Bacalhau cozido', null, 'base', 105, 23.0, 0.0, 0.9, 0.0, 0.0, 2.5, 160),
('Pescada cozida', null, 'base', 92, 20.5, 0.0, 1.0, 0.0, 0.0, 0.3, 160),
('Salmão grelhado', null, 'base', 208, 22.0, 0.0, 13.0, 0.0, 0.0, 0.1, 150),
('Sardinha assada', null, 'base', 208, 25.0, 0.0, 12.0, 0.0, 0.0, 0.5, 100),
('Atum em água (escorrido)', null, 'base', 116, 26.0, 0.0, 1.0, 0.0, 0.0, 0.9, 80),
('Ovo cozido', null, 'base', 155, 13.0, 1.1, 11.0, 0.0, 1.1, 0.3, 60),
('Ovo estrelado', null, 'base', 196, 13.6, 0.8, 15.0, 0.0, 0.8, 0.4, 60),
('Leite meio-gordo', null, 'base', 47, 3.3, 4.8, 1.6, 0.0, 4.8, 0.1, 250),
('Iogurte natural', null, 'base', 57, 4.5, 6.0, 1.7, 0.0, 6.0, 0.1, 125),
('Iogurte grego natural', null, 'base', 97, 9.0, 3.8, 5.0, 0.0, 3.8, 0.1, 150),
('Queijo flamengo (fatia)', null, 'base', 344, 24.5, 0.5, 27.0, 0.0, 0.5, 1.7, 20),
('Queijo fresco', null, 'base', 159, 12.0, 3.0, 11.0, 0.0, 3.0, 0.7, 50),
('Fiambre de peru', null, 'base', 104, 18.0, 1.5, 2.8, 0.0, 1.0, 2.0, 25),
('Sopa de legumes', null, 'base', 40, 1.5, 5.5, 1.3, 1.5, 1.5, 0.5, 300),
('Caldo verde', null, 'base', 55, 1.8, 6.0, 2.8, 1.2, 0.8, 0.7, 300),
('Feijão cozido', null, 'base', 110, 7.0, 19.0, 0.5, 6.5, 0.5, 0.0, 100),
('Grão-de-bico cozido', null, 'base', 139, 8.4, 21.0, 2.4, 6.0, 0.5, 0.0, 100),
('Lentilhas cozidas', null, 'base', 116, 9.0, 20.0, 0.4, 7.9, 1.8, 0.0, 100),
('Alface', null, 'base', 15, 1.4, 2.9, 0.2, 1.3, 0.8, 0.0, 50),
('Tomate', null, 'base', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 0.0, 100),
('Cenoura', null, 'base', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 0.1, 80),
('Brócolos cozidos', null, 'base', 35, 2.4, 7.2, 0.4, 3.3, 1.4, 0.0, 150),
('Couve cozida', null, 'base', 30, 1.9, 5.6, 0.4, 2.8, 1.4, 0.0, 150),
('Azeite', null, 'base', 884, 0.0, 0.0, 100.0, 0.0, 0.0, 0.0, 10),
('Manteiga', null, 'base', 717, 0.9, 0.1, 81.0, 0.0, 0.1, 1.2, 10),
('Banana', null, 'base', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 0.0, 120),
('Maçã', null, 'base', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 0.0, 150),
('Laranja', null, 'base', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0.0, 150),
('Pera', null, 'base', 57, 0.4, 15.2, 0.1, 3.1, 9.8, 0.0, 150),
('Uvas', null, 'base', 69, 0.7, 18.1, 0.2, 0.9, 15.5, 0.0, 100),
('Amêndoas', null, 'base', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 0.0, 25),
('Nozes', null, 'base', 654, 15.2, 13.7, 65.2, 6.7, 2.6, 0.0, 25),
('Whey proteína (pó)', null, 'base', 380, 78.0, 6.0, 5.0, 0.0, 5.0, 0.5, 30),
('Café (sem açúcar)', null, 'base', 2, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 50),
('Vinho tinto', null, 'base', 85, 0.1, 2.6, 0.0, 0.0, 0.6, 0.0, 150),
('Cerveja', null, 'base', 43, 0.5, 3.6, 0.0, 0.0, 0.0, 0.0, 330),
('Chocolate preto 70%', null, 'base', 598, 7.8, 45.9, 42.6, 10.9, 24.0, 0.0, 20),
('Bolacha maria', null, 'base', 435, 7.5, 75.0, 11.0, 2.5, 22.0, 0.6, 30)
on conflict do nothing;
