import React from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Target, Calendar, Eye } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import type { ProcessedCampaign } from '@/types/pacing';
import { formatCurrency, formatNumber, formatPercentage, getPacingColor } from '@/lib/pacingUtils';

interface DetailedCampaignViewProps {
  campaign: ProcessedCampaign;
}

export const DetailedCampaignView: React.FC<DetailedCampaignViewProps> = ({ campaign }) => {
  const { metrics } = campaign;

  const getPacingIcon = (pacing: number) => {
    if (pacing > 1) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Campaign Timeline */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 uppercase tracking-wide mb-1">
                <Calendar className="h-4 w-4" />
                Flight Dates
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {format(metrics.startDate, 'MMM dd')} - {format(metrics.endDate, 'MMM dd, yyyy')}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 uppercase tracking-wide mb-1">
                <Calendar className="h-4 w-4" />
                Days Into Campaign
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.daysIntoCampaign}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 uppercase tracking-wide mb-1">
                <Calendar className="h-4 w-4" />
                Days Until End
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.daysUntilEnd}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Expected Impressions</h3>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Eye className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.expectedImpressions)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Actual Impressions</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.actualImpressions)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Current Pacing</h3>
              <div className={`p-2 rounded-lg ${
                metrics.currentPacing >= 0.95 && metrics.currentPacing <= 1.05
                  ? 'bg-green-100'
                  : metrics.currentPacing >= 0.85 && metrics.currentPacing <= 1.15
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}>
                <div className={getPacingColor(metrics.currentPacing)}>
                  {getPacingIcon(metrics.currentPacing)}
                </div>
              </div>
            </div>
            <div className={`text-2xl font-bold ${getPacingColor(metrics.currentPacing)}`}>
              {formatPercentage(metrics.currentPacing)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.currentPacing > 1 ? 'Ahead of pace' : 'Behind pace'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Remaining Impressions</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.remainingImpressions)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Daily Average Needed</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.remainingAverageNeeded)}</div>
            <p className="text-xs text-gray-500 mt-1">per remaining day</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Yesterday's Impressions</h3>
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Eye className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.yesterdayImpressions)}</div>
              <div className={`text-sm font-semibold ${getPacingColor(metrics.yesterdayVsNeeded)}`}>
                {formatPercentage(metrics.yesterdayVsNeeded)}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">of daily target</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};