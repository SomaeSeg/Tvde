import { describe, expect, it } from 'vitest';
import {
  ageFromBirthDate,
  bmi,
  bmiCategory,
  bmrMifflin,
  calorieTarget,
  epley1RM,
  macroTargets,
  movingAverage,
  portionMacros,
  projectGoalDate,
  sessionVolume,
  streak,
  tdee,
  trendPerDay,
  waistToHeight,
  waistToHip,
} from './calc';

describe('ageFromBirthDate', () => {
  it('calcula idade antes e depois do aniversário', () => {
    const today = new Date('2026-07-02T12:00:00');
    expect(ageFromBirthDate('1985-07-01', today)).toBe(41);
    expect(ageFromBirthDate('1985-07-03', today)).toBe(40);
    expect(ageFromBirthDate('1985-07-02', today)).toBe(41);
  });
});

describe('bmrMifflin', () => {
  it('homem 90kg 175cm 40 anos', () => {
    // 10*90 + 6.25*175 - 5*40 + 5 = 900 + 1093.75 - 200 + 5 = 1798.75
    expect(bmrMifflin('male', 90, 175, 40)).toBe(1799);
  });
  it('mulher 65kg 165cm 30 anos', () => {
    // 650 + 1031.25 - 150 - 161 = 1370.25
    expect(bmrMifflin('female', 65, 165, 30)).toBe(1370);
  });
});

describe('tdee e calorieTarget', () => {
  it('aplica fator de atividade', () => {
    expect(tdee(1800, 'sedentary')).toBe(2160);
    expect(tdee(1800, 'moderate')).toBe(2790);
  });
  it('défice de 0.5 kg/semana ≈ 550 kcal/dia', () => {
    expect(calorieTarget(2500, 'lose_fat', 0.5, 'male')).toBe(1950);
  });
  it('não desce abaixo do piso de segurança', () => {
    expect(calorieTarget(1600, 'lose_fat', 1.0, 'male')).toBe(1500);
    expect(calorieTarget(1300, 'lose_fat', 1.0, 'female')).toBe(1200);
  });
  it('superavit limitado a 300 kcal para ganho', () => {
    expect(calorieTarget(2500, 'gain_muscle', 0.5, 'male')).toBe(2800);
  });
  it('manter = TDEE', () => {
    expect(calorieTarget(2500, 'maintain', 0.5, 'male')).toBe(2500);
  });
});

describe('macroTargets', () => {
  it('proteína 1.8 g/kg em défice, resto coerente', () => {
    const m = macroTargets(1950, 90, 'lose_fat');
    expect(m.proteinG).toBe(162);
    expect(m.fatG).toBe(72); // 90*0.8
    // kcal dos macros ≈ alvo (com arredondamentos)
    const kcalFromMacros = m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9;
    expect(Math.abs(kcalFromMacros - 1950)).toBeLessThan(10);
  });
  it('nunca devolve hidratos negativos', () => {
    const m = macroTargets(1200, 120, 'gain_muscle');
    expect(m.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe('bmi', () => {
  it('calcula e classifica', () => {
    expect(bmi(90, 175)).toBe(29.4);
    expect(bmiCategory(29.4)).toBe('Excesso de peso');
    expect(bmiCategory(22)).toBe('Peso normal');
    expect(bmiCategory(31)).toBe('Obesidade grau I');
  });
});

describe('rácios', () => {
  it('cintura/altura e cintura/anca', () => {
    expect(waistToHeight(100, 175)).toBe(0.57);
    expect(waistToHip(100, 105)).toBe(0.95);
  });
});

describe('movingAverage', () => {
  it('média de 7 dias por janela de calendário', () => {
    const points = [
      { date: '2026-01-01', value: 90 },
      { date: '2026-01-02', value: 91 },
      { date: '2026-01-03', value: 89 },
    ];
    const ma = movingAverage(points, 7);
    expect(ma[0].value).toBe(90);
    expect(ma[1].value).toBe(90.5);
    expect(ma[2].value).toBe(90);
  });
  it('exclui pontos fora da janela', () => {
    const points = [
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-20', value: 90 },
    ];
    const ma = movingAverage(points, 7);
    expect(ma[1].value).toBe(90); // 01-01 está fora da janela de 7 dias
  });
});

describe('trendPerDay e projectGoalDate', () => {
  const losing = [
    { date: '2026-01-01', value: 92 },
    { date: '2026-01-08', value: 91.5 },
    { date: '2026-01-15', value: 91 },
    { date: '2026-01-22', value: 90.5 },
  ];
  it('deteta tendência de descida ~0.5kg/semana', () => {
    const slope = trendPerDay(losing, 28)!;
    expect(slope).toBeCloseTo(-0.5 / 7, 3);
  });
  it('projeta data da meta na direção certa', () => {
    // faltam 2.5 kg a ~0.0714/dia → ~35 dias depois de 01-22
    expect(projectGoalDate(losing, 88)).toBe('2026-02-26');
  });
  it('devolve null se a tendência afasta da meta', () => {
    expect(projectGoalDate(losing, 95)).toBeNull();
  });
  it('devolve null sem dados suficientes', () => {
    expect(trendPerDay([{ date: '2026-01-01', value: 92 }])).toBeNull();
  });
});

describe('portionMacros', () => {
  it('escala por gramas', () => {
    const frango = { kcal_100: 165, protein_100: 31, carbs_100: 0, fat_100: 3.6 };
    const p = portionMacros(frango, 150);
    expect(p.kcal).toBe(247.5);
    expect(p.proteinG).toBe(46.5);
  });
});

describe('streak', () => {
  it('conta dias consecutivos terminando hoje', () => {
    expect(streak(['2026-06-30', '2026-07-01', '2026-07-02'], '2026-07-02')).toBe(3);
  });
  it('permite que hoje ainda não esteja registado', () => {
    expect(streak(['2026-06-30', '2026-07-01'], '2026-07-02')).toBe(2);
  });
  it('quebra em dias falhados', () => {
    expect(streak(['2026-06-28', '2026-07-01'], '2026-07-02')).toBe(1);
    expect(streak([], '2026-07-02')).toBe(0);
  });
});

describe('treino', () => {
  it('volume da sessão', () => {
    expect(
      sessionVolume([
        { reps: 10, weight_kg: 20 },
        { reps: 8, weight_kg: 22.5 },
        { reps: null, weight_kg: null },
      ]),
    ).toBe(380);
  });
  it('1RM Epley', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 10)).toBe(133.3);
  });
});
