import { PageHeader } from '@/components/ui';
import { MetricForm } from './metric-form';
import { MetricChart } from './metric-chart';
import { Measurements } from './measurements';
import { Goals } from './goals';

export default function CorpoPage() {
  return (
    <main>
      <PageHeader title="Corpo" subtitle="Biometria, medidas e metas" />
      <div className="space-y-4">
        <MetricForm />
        <MetricChart />
        <Goals />
        <Measurements />
      </div>
    </main>
  );
}
