import { CampaignDataRow } from '@/types/campaign';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";

interface SpendMetricsChartProps {
  data: CampaignDataRow[];
  barSize: number;
}

export const SpendMetricsChart = ({ data, barSize }: SpendMetricsChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(value) => `$${formatNumber(value)}`} tick={{ fontSize: 10 }} />
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <Tooltip
          formatter={(value: unknown, name: string) => [
            `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            name === 'MediaJelDirect' ? 'MediaJel Direct' : 'Channel Partners'
          ]}
          labelFormatter={(label: string) => `Date: ${label}`}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const mediaJelValue = payload.find(p => p.dataKey === 'MediaJelDirect')?.value || 0;
              const channelPartnersValue = payload.find(p => p.dataKey === 'ChannelPartners')?.value || 0;
              const total = Number(mediaJelValue) + Number(channelPartnersValue);

              return (
                <div className="bg-white/95 border border-gray-200 rounded p-3 shadow-lg">
                  <p className="font-medium mb-2">{`Date: ${label}`}</p>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm">MediaJel Direct: ${Number(mediaJelValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                      <span className="text-sm">Channel Partners: ${Number(channelPartnersValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-1 mt-2">
                      <span className="text-sm font-medium">Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="MediaJelDirect"
          stackId="spend"
          fill="#3b82f6"
          name="MediaJel Direct"
          barSize={barSize}
        />
        <Bar
          dataKey="ChannelPartners"
          stackId="spend"
          fill="#fbbf24"
          name="Channel Partners"
          barSize={barSize}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};