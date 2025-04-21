
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Eye, MousePointer, ShoppingCart } from "lucide-react";

interface WeeklySummaryProps {
  data: {
    impressions: number;
    clicks: number;
    transactions: number;
  }
}

const WeeklySummary = ({ data }: WeeklySummaryProps) => {
  const { impressions, clicks, transactions } = data;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="bg-sky-100 p-2 rounded-full">
            <Eye className="h-4 w-4 text-sky-500" />
          </div>
          <div>
            <p className="text-sm font-medium">{formatNumber(impressions)}</p>
            <p className="text-xs text-muted-foreground">7-Day Impressions</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="bg-violet-100 p-2 rounded-full">
            <MousePointer className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-medium">{formatNumber(clicks)}</p>
            <p className="text-xs text-muted-foreground">7-Day Clicks</p>
            <p className="text-xs text-muted-foreground mt-1">
              CTR: {formatNumber(ctr, { decimals: 2, suffix: '%' })}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-100 p-2 rounded-full">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium">{formatNumber(transactions)}</p>
            <p className="text-xs text-muted-foreground">7-Day Transactions</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WeeklySummary;
