import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, TrendingUp, Filter } from "lucide-react";
import { cn } from "../utils";

interface TrendData {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: string;
  recordedAt: any;
}

interface LongitudinalTrendsProps {
  trends: TrendData[];
}

export default function LongitudinalTrends({ trends }: LongitudinalTrendsProps) {
  const [selectedBiomarker, setSelectedBiomarker] = useState<string | null>(null);

  const biomarkerNames = useMemo(() => {
    const names = new Set(trends.map(t => t.name));
    return Array.from(names);
  }, [trends]);

  // Set initial selection if none selected
  useMemo(() => {
    if (!selectedBiomarker && biomarkerNames.length > 0) {
      setSelectedBiomarker(biomarkerNames[0]);
    }
  }, [biomarkerNames]);

  const chartData = useMemo(() => {
    if (!selectedBiomarker) return [];
    
    return trends
      .filter(t => t.name === selectedBiomarker)
      .sort((a, b) => (a.recordedAt?.seconds || 0) - (b.recordedAt?.seconds || 0))
      .map(t => ({
        date: new Date((t.recordedAt?.seconds || 0) * 1000).toLocaleDateString(),
        value: t.value,
        unit: t.unit
      }));
  }, [trends, selectedBiomarker]);

  if (trends.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40 bg-natural-bg/30 rounded-[32px] border border-dashed border-black/5">
        <Activity className="size-10 text-natural-muted" />
        <p className="text-sm font-medium">No biometric trends available for longitudinal mapping.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-natural-card p-8 md:p-10 rounded-[40px] border border-black/[0.03] shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-natural-accent/10 rounded-2xl">
            <TrendingUp className="size-5 text-natural-accent" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-natural-text">Biometric Trajectory</h3>
            <p className="text-[11px] text-natural-muted font-bold uppercase tracking-widest mt-0.5">Predictive health trend analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-natural-bg p-1.5 rounded-2xl border border-black/5">
          <Filter className="size-3.5 text-natural-muted ml-3" />
          <select
            value={selectedBiomarker || ""}
            onChange={(e) => setSelectedBiomarker(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-bold text-natural-text uppercase tracking-wider pr-8 cursor-pointer"
          >
            {biomarkerNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[350px] w-full mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#6B7D7D' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#6B7D7D' }} 
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                fontSize: '12px',
                padding: '12px 16px'
              }}
              labelStyle={{ fontWeight: 800, color: '#2D3142', marginBottom: '4px' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8E9B90" 
              strokeWidth={3} 
              dot={{ fill: '#8E9B90', strokeWidth: 2, r: 4, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#2D3142' }}
              name={selectedBiomarker || "Biomarker"}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-natural-bg/50 p-6 rounded-[24px] border border-black/5 flex items-center justify-between">
         <div className="space-y-1">
            <span className="text-[10px] font-bold text-natural-muted uppercase tracking-[2px]">Current Calibration</span>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-serif font-bold text-natural-text">
                  {chartData[chartData.length - 1]?.value || 0}
               </span>
               <span className="text-xs font-bold text-natural-accent uppercase">
                  {chartData[chartData.length - 1]?.unit || ""}
               </span>
            </div>
         </div>
         <div className="text-right">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              chartData.length > 1 && chartData[chartData.length - 1].value > chartData[chartData.length - 2].value
              ? "bg-amber-50 text-amber-600"
              : "bg-emerald-50 text-emerald-600"
            )}>
               <Activity className="size-3" />
               <span>Trajectory Active</span>
            </div>
         </div>
      </div>
    </div>
  );
}
