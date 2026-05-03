import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Zap, Thermometer } from 'lucide-react';
import { telemetryDB, TelemetryRecord } from '../services/telemetryStore';

interface TelemetryChartProps {
    metric: 'hashrate' | 'power' | 'temp';
    color: string;
    icon: React.ReactNode;
    unit: string;
}

const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const TelemetryChart: React.FC<TelemetryChartProps> = ({ metric, color, icon, unit }) => {
    const [data, setData] = React.useState<any[]>([]);

    const refresh = async () => {
        const records = await telemetryDB.getLast(24); // last 24 points (or more if more stored)
        setData(records.map(r => ({
            time: formatTime(r.timestamp),
            [metric]: metric === 'hashrate' ? r.hashrate : metric === 'power' ? r.power : r.temp
        })).reverse());
    };

    React.useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-surface border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    {icon} 24h {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </h3>
                <span className="text-xs text-muted">{unit}</span>
            </div>
            <div className="h-[200px]">
                {data.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #333', borderRadius: '4px' }} itemStyle={{ color: '#fff' }} />
                            <Line type="monotone" dataKey={metric} stroke={color} strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted text-sm">Collecting data...</div>
                )}
            </div>
        </div>
    );
};

export default TelemetryChart;
