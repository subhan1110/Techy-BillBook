import React, { useEffect, useState } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import { useBillBook } from '../context/BillBookContext';
import { formatINR, getLocalDateKey } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { ReportChartBucket, ReportPeriod, SalesReport } from '../types/models';

export const ReportsPage: React.FC = () => {
  const { t, language, refreshTick } = useBillBook();
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const today = getLocalDateKey(new Date());
  const [dailyDate, setDailyDate] = useState(today);
  const [monthlyDate, setMonthlyDate] = useState(today.slice(0, 7));
  const [yearlyDate, setYearlyDate] = useState(today.slice(0, 4));

  const [report, setReport] = useState<SalesReport | null>(null);
  const [hoveredBucket, setHoveredBucket] = useState<ReportChartBucket | null>(null);

  const referenceDate =
    period === 'daily' ? dailyDate : period === 'monthly' ? monthlyDate : yearlyDate;

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await billBookRepo.getSalesReport(period, referenceDate);
      if (!active) return;
      setReport(data);
      setHoveredBucket(null);
    })();
    return () => {
      active = false;
    };
  }, [period, referenceDate, refreshTick]);

  const maxBucketValue = Math.max(
    1,
    ...(report?.buckets.map((b) => b.totalSales) ?? [1])
  );

  const totalPaymentMix = Math.max(
    1,
    (report?.cashSales ?? 0) + (report?.upiSales ?? 0) + (report?.udharSales ?? 0)
  );
  const cashPct = Math.round(((report?.cashSales ?? 0) / totalPaymentMix) * 100);
  const upiPct = Math.round(((report?.upiSales ?? 0) / totalPaymentMix) * 100);
  const udharPct = Math.max(0, 100 - cashPct - upiPct);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t.reports.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.reports.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C2E] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[42px] w-fit"
        >
          <Printer className="w-4 h-4" />
          <span>{t.reports.printReport}</span>
        </button>
      </div>

      {/* Period Selector & Date Input */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900">
          {(['daily', 'monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] whitespace-nowrap ${
                period === p
                  ? 'bg-white dark:bg-[#111C2E] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {p === 'daily'
                ? t.reports.daily
                : p === 'monthly'
                ? t.reports.monthly
                : t.reports.yearly}
            </button>
          ))}
        </div>

        <div>
          {period === 'daily' && (
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value || today)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2E] px-3.5 py-2 text-sm font-mono-num text-slate-900 dark:text-white min-h-[42px]"
            />
          )}
          {period === 'monthly' && (
            <input
              type="month"
              value={monthlyDate}
              onChange={(e) => setMonthlyDate(e.target.value || today.slice(0, 7))}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2E] px-3.5 py-2 text-sm font-mono-num text-slate-900 dark:text-white min-h-[42px]"
            />
          )}
          {period === 'yearly' && (
            <select
              value={yearlyDate}
              onChange={(e) => setYearlyDate(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2E] px-3.5 py-2 text-sm font-mono-num text-slate-900 dark:text-white min-h-[42px]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.reports.totalSales}</div>
          <div className="text-xl font-bold font-mono-num text-[#0F294A] dark:text-blue-400 mt-1.5">
            {formatINR(report?.totalSales ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.reports.totalBills}</div>
          <div className="text-xl font-bold font-mono-num text-slate-900 dark:text-white mt-1.5">
            {report?.totalBills ?? 0}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.reports.cashSales}</div>
          <div className="text-xl font-bold font-mono-num text-emerald-600 dark:text-emerald-400 mt-1.5">
            {formatINR(report?.cashSales ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.reports.upiSales}</div>
          <div className="text-xl font-bold font-mono-num text-blue-600 dark:text-blue-400 mt-1.5">
            {formatINR(report?.upiSales ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.reports.udharSales}</div>
          <div className="text-xl font-bold font-mono-num text-amber-600 dark:text-amber-400 mt-1.5">
            {formatINR(report?.udharSales ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.reports.paymentsCollected}</div>
          <div className="text-xl font-bold font-mono-num text-emerald-600 dark:text-emerald-400 mt-1.5">
            {formatINR(report?.paymentsCollected ?? 0)}
          </div>
        </div>
        <div className="col-span-2 rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t.reports.outstandingTotal}</div>
            <div className="text-xl font-bold font-mono-num text-red-600 dark:text-red-400 mt-1">
              {formatINR(report?.totalOutstandingUdhar ?? 0)}
            </div>
          </div>
          <BarChart3 className="w-6 h-6 text-slate-300 dark:text-slate-600" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bar Chart */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.reports.salesTrendChart}
            </h3>
            {hoveredBucket && (
              <span className="text-xs font-mono-num text-blue-600 dark:text-blue-400 font-semibold">
                {hoveredBucket.label}: {formatINR(hoveredBucket.totalSales)} ({hoveredBucket.billCount}{' '}
                {t.customers.billsCount})
              </span>
            )}
          </div>

          {!report || report.totalBills === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              {t.reports.noSalesInPeriod}
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div
                className="flex items-end gap-1.5 sm:gap-2 h-52 pt-4"
                style={{ minWidth: period === 'monthly' ? '520px' : '100%' }}
              >
                {report.buckets.map((b) => {
                  const pct = b.totalSales > 0 ? Math.max(6, Math.round((b.totalSales / maxBucketValue) * 100)) : 2;
                  return (
                    <button
                      key={b.label}
                      type="button"
                      onMouseEnter={() => setHoveredBucket(b)}
                      onFocus={() => setHoveredBucket(b)}
                      onClick={() => setHoveredBucket(b)}
                      className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer focus:outline-none"
                    >
                      <div className="w-full flex items-end justify-center flex-1">
                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full max-w-[28px] rounded-t-md transition-colors ${
                            b.totalSales > 0
                              ? 'bg-[#0F294A] group-hover:bg-blue-600 dark:bg-blue-500 dark:group-hover:bg-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-mono-num text-slate-500 dark:text-slate-400 mt-2 truncate max-w-full">
                        {b.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Payment Split Breakdown */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t.reports.paymentSplitChart}
          </h3>

          {!report || report.totalSales === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              {t.reports.noSalesInPeriod}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Stacked Progress Bar */}
              <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                {cashPct > 0 && (
                  <div
                    style={{ width: `${cashPct}%` }}
                    className="bg-emerald-600 h-full"
                    title={`${t.reports.cashSales}: ${cashPct}%`}
                  />
                )}
                {upiPct > 0 && (
                  <div
                    style={{ width: `${upiPct}%` }}
                    className="bg-blue-600 h-full"
                    title={`${t.reports.upiSales}: ${upiPct}%`}
                  />
                )}
                {udharPct > 0 && (
                  <div
                    style={{ width: `${udharPct}%` }}
                    className="bg-amber-500 h-full"
                    title={`${t.reports.udharSales}: ${udharPct}%`}
                  />
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="w-3 h-3 rounded-xs bg-emerald-600 shrink-0" />
                    <span>{t.reports.cashSales}</span>
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                    {formatINR(report.cashSales)} ({cashPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="w-3 h-3 rounded-xs bg-blue-600 shrink-0" />
                    <span>{t.reports.upiSales}</span>
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                    {formatINR(report.upiSales)} ({upiPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="w-3 h-3 rounded-xs bg-amber-500 shrink-0" />
                    <span>{t.reports.udharSales}</span>
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                    {formatINR(report.udharSales)} ({udharPct}%)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                {language === 'gu'
                  ? 'આ રિપોર્ટ તમારા ઓફલાઇન SQLite ડેટાબેઝમાંથી તાત્કાલિક ગણતરી કરેલ છે.'
                  : 'Calculated live from your local offline SQLite database.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
