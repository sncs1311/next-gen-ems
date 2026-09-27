'use client';
// frontend/src/app/intelligence/eval-report/page.jsx
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui';
import api from '@/lib/api';

function MetricCard({ label, value, good, description }) {
  const isGood = good !== undefined ? (value >= good) : null;
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${isGood === true ? 'text-green-600' : isGood === false ? 'text-red-500' : 'text-gray-900'}`}>
        {value !== undefined && value !== null ? value : '—'}
      </div>
      {description && <div className="text-xs text-gray-400 mt-1">{description}</div>}
    </div>
  );
}

function ModelSection({ title, data, type }) {
  if (!data) return null;
  return (
    <div className="mb-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Version: {data.model_version} · Trained: {data.trained_at ? new Date(data.trained_at).toLocaleString() : '—'} ·
          Training samples: {data.training_samples} · Test samples: {data.test_samples}
        </p>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {type === 'classifier' ? (
          <>
            <MetricCard label="Accuracy" value={data.accuracy} good={0.75} description="Overall correct predictions" />
            <MetricCard label="Precision" value={data.precision} good={0.70} description="Correct positive predictions" />
            <MetricCard label="Recall" value={data.recall} good={0.65} description="True positives caught" />
            <MetricCard label="F1 Score" value={data.f1_score} good={0.70} description="Harmonic mean of P & R" />
            {data.roc_auc && <MetricCard label="ROC AUC" value={data.roc_auc} good={0.75} description="Area under ROC curve" />}
          </>
        ) : (
          <>
            <MetricCard label="MAE" value={data.mae} description="Mean absolute error (litres)" />
            <MetricCard label="RMSE" value={data.rmse} description="Root mean squared error" />
            <MetricCard label="R²" value={data.r2} good={0.70} description="Variance explained by model" />
          </>
        )}
      </div>
    </div>
  );
}

export default function EvalReportPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['eval-report'],
    queryFn: async () => { const { data } = await api.get('/intelligence/eval-report'); return data; },
    retry: false,
  });

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Model Evaluation Report</h1>
          <p className="text-gray-400 text-sm mt-1">FR-IL-006 — Performance metrics for all trained ML models</p>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : error || data?.error ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 mb-2">No evaluation report found.</p>
          <p className="text-gray-400 text-sm">Run <code className="bg-gray-100 px-1 rounded">python train.py</code> in the <code className="bg-gray-100 px-1 rounded">ml_service</code> folder to train the models.</p>
        </div>
      ) : (
        <div className="card">
          <ModelSection
            title="Predictive Maintenance — Random Forest Classifier"
            data={data?.predictive_maintenance}
            type="classifier"
          />
          <ModelSection
            title="Fuel Consumption Forecast — XGBoost Regressor"
            data={data?.fuel_forecast}
            type="regressor"
          />
          <ModelSection
            title="Driver Behavior Scoring — Random Forest Classifier"
            data={data?.driver_behavior}
            type="classifier"
          />
        </div>
      )}

      <div className="card mt-6 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Model Architecture Notes</h3>
        <div className="space-y-2 text-sm text-gray-500">
          <p><span className="font-medium text-gray-700">Predictive Maintenance:</span> Random Forest (200 trees, max depth 8, balanced class weights). Features: asset age, utilization rate, MTBF, MTTR, breakdown history, fuel anomalies, overdue PM flag, equipment sub-type.</p>
          <p><span className="font-medium text-gray-700">Fuel Forecast:</span> XGBoost Regressor (300 estimators, LR 0.05). Features: active asset count, 7-day and 30-day average daily consumption, project identity. Output: weekly consumption forecast per site.</p>
          <p><span className="font-medium text-gray-700">Driver Behavior:</span> Random Forest (150 trees, max depth 6, balanced class weights). Features: severe/minor incidents, fuel overconsumptions, breakdown attributions, license and medical compliance, years of experience. Output: Low / Medium / High risk label + composite score.</p>
        </div>
      </div>
    </AppShell>
  );
}