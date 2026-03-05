"use client";
import React, { useState, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ChartData } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { api } from "~/trpc/react";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

// Empty template for a new quarter
const BLANK_QUARTER = { date: '2024-Q4', revenue: 0, netIncome: 0, ebitda: 0, cfo: 0, shares: 0, eps: 0, stockPriceAvg: 0 };

export const FundamentalAnalysisTool = () => {
  const [symbolInput, setSymbolInput] = useState("AAPL");
  const [activeSymbol, setActiveSymbol] = useState("AAPL");
  const [metric, setMetric] = useState<'ebitda' | 'netIncome' | 'cfo'>('ebitda');
  const [isEditing, setIsEditing] = useState(false);
  const [manualData, setManualData] = useState<any[]>([BLANK_QUARTER]);

  const utils = api.useUtils();
  
  // 1. FETCH DATA
  const { data, isLoading } = api.stock.getData.useQuery(
    { symbol: activeSymbol },
    { 
      retry: false,
      refetchOnWindowFocus: false 
    }
  );

  // 2. SAVE MANUAL DATA
  const saveMutation = api.stock.saveManualData.useMutation({
    onSuccess: () => {
        setIsEditing(false);
        utils.stock.getData.invalidate(); // Refresh the chart
        alert("Database Updated Successfully!");
    }
  });

  // 3. SAVE TO PORTFOLIO
  const addToPortfolio = api.stock.addToPortfolio.useMutation({
    onSuccess: () => { alert("Added to Dashboard!"); utils.invalidate(); },
    onError: (err) => alert(err.message.includes("LIMIT") ? "Limit Reached (Max 5)" : "Error saving.")
  });

  // Decide what to show: Database Data OR Manual Input Data
  const displayData = isEditing ? manualData : (data || []);
  const showChart = displayData.length > 0 && !isEditing;

  const chartConfig = useMemo(() => {
    if (!showChart) return null;
    return {
      labels: displayData.map((d: any) => d.date),
      datasets: [
        { type: 'line' as const, label: 'Price ($)', data: displayData.map((d: any) => d.stockPriceAvg), borderColor: '#4f46e5', borderWidth: 2, yAxisID: 'y_price' },
        { type: 'bar' as const, label: metric.toUpperCase(), data: displayData.map((d: any) => d[metric]), backgroundColor: '#10b981', yAxisID: 'y_fundamentals' }
      ]
    } as ChartData<'bar'|'line'>;
  }, [displayData, metric, showChart]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if(symbolInput) {
        setActiveSymbol(symbolInput.toUpperCase());
        setIsEditing(false);
    }
  };

  const startManualEntry = () => {
      // If we have data, edit it. If not, start with 4 blank quarters
      setManualData(data && data.length > 0 ? [...data] : [
          { ...BLANK_QUARTER, date: '2024-Q4' },
          { ...BLANK_QUARTER, date: '2024-Q3' },
          { ...BLANK_QUARTER, date: '2024-Q2' },
          { ...BLANK_QUARTER, date: '2024-Q1' }
      ]);
      setIsEditing(true);
  };

  const updateManualRow = (index: number, field: string, value: any) => {
      const newData = [...manualData];
      newData[index] = { ...newData[index], [field]: field === 'date' ? value : Number(value) };
      setManualData(newData);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {activeSymbol} 
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-normal">
                    {data?.length ? 'Database Connected' : 'No Data'}
                </span>
            </h2>
        </div>
        <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input value={symbolInput} onChange={(e) => setSymbolInput(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm w-24" placeholder="Ticker" />
                <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800">Search</button>
            </form>
            <button onClick={startManualEntry} className="border border-slate-200 px-3 py-2 rounded-lg text-sm hover:bg-slate-50" title="Edit Data">✏️</button>
            <button onClick={() => addToPortfolio.mutate({ symbol: activeSymbol })} className="border border-slate-200 px-3 py-2 rounded-lg text-sm hover:bg-slate-50" title="Save to Portfolio">💾</button>
        </div>
      </div>

      {/* CHART MODE */}
      {showChart && !isLoading && (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                {['ebitda', 'netIncome', 'cfo'].map((m) => (
                    <button key={m} onClick={() => setMetric(m as any)} className={`px-3 py-1 text-xs font-bold uppercase rounded ${metric === m ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>{m}</button>
                ))}
            </div>
            <div className="h-[400px]">
                <Chart type='bar' data={chartConfig!} options={{ responsive: true, maintainAspectRatio: false, scales: { y_fundamentals: { position: 'left', display: true, grid: { display: false } }, y_price: { position: 'right', display: true } }}} />
            </div>
        </div>
      )}

      {/* EDIT/MANUAL MODE */}
      {isEditing && (
          <div className="space-y-4">
              <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 border border-yellow-200">
                  <strong>Analyst Mode:</strong> Enter data from Yahoo/Google Finance. Values in Millions (except Price/EPS).
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium">
                          <tr>
                              <th className="p-2">Date (Q)</th>
                              <th className="p-2">Revenue</th>
                              <th className="p-2">EBITDA</th>
                              <th className="p-2">Net Income</th>
                              <th className="p-2">Cash Flow</th>
                              <th className="p-2">Stock Price</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {manualData.map((row, i) => (
                              <tr key={i}>
                                  <td className="p-1"><input className="w-24 border rounded p-1" value={row.date} onChange={e => updateManualRow(i, 'date', e.target.value)} /></td>
                                  <td className="p-1"><input className="w-20 border rounded p-1" type="number" value={row.revenue} onChange={e => updateManualRow(i, 'revenue', e.target.value)} /></td>
                                  <td className="p-1"><input className="w-20 border rounded p-1" type="number" value={row.ebitda} onChange={e => updateManualRow(i, 'ebitda', e.target.value)} /></td>
                                  <td className="p-1"><input className="w-20 border rounded p-1" type="number" value={row.netIncome} onChange={e => updateManualRow(i, 'netIncome', e.target.value)} /></td>
                                  <td className="p-1"><input className="w-20 border rounded p-1" type="number" value={row.cfo} onChange={e => updateManualRow(i, 'cfo', e.target.value)} /></td>
                                  <td className="p-1"><input className="w-20 border rounded p-1" type="number" value={row.stockPriceAvg} onChange={e => updateManualRow(i, 'stockPriceAvg', e.target.value)} /></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setManualData([...manualData, { ...BLANK_QUARTER }])} className="text-xs bg-gray-100 px-3 py-2 rounded hover:bg-gray-200">+ Add Quarter</button>
                  <button onClick={() => saveMutation.mutate({ symbol: activeSymbol, data: manualData })} disabled={saveMutation.isPending} className="ml-auto bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700">
                      {saveMutation.isPending ? "Saving..." : "Save to Database"}
                  </button>
              </div>
          </div>
      )}

      {/* EMPTY STATE (No Data, No Edit) */}
      {!isLoading && !showChart && !isEditing && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">No data found for <strong>{activeSymbol}</strong>.</p>
              <button onClick={startManualEntry} className="bg-white border border-gray-300 text-indigo-600 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50">
                  Build Database Manually
              </button>
          </div>
      )}
    </div>
  );
};