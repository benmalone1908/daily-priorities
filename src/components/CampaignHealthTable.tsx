
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";

interface CampaignHealthTableProps {
  healthData: CampaignHealthData[];
}

type SortField = keyof CampaignHealthData;
type SortDirection = 'asc' | 'desc';

const CampaignHealthTable = ({ healthData }: CampaignHealthTableProps) => {
  const [sortField, setSortField] = useState<SortField>('healthScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    return [...healthData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  }, [healthData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getHealthScoreBadge = (score: number) => {
    if (score >= 7) return <Badge className="bg-green-100 text-green-800">{score}</Badge>;
    if (score >= 4) return <Badge className="bg-yellow-100 text-yellow-800">{score}</Badge>;
    return <Badge className="bg-red-100 text-red-800">{score}</Badge>;
  };

  const getPaceBadge = (pace?: number) => {
    if (!pace) return <Badge variant="secondary">N/A</Badge>;
    if (pace >= 95 && pace <= 105) return <Badge className="bg-green-100 text-green-800">{pace.toFixed(1)}%</Badge>;
    if ((pace >= 90 && pace < 95) || (pace > 105 && pace <= 110)) return <Badge className="bg-yellow-100 text-yellow-800">{pace.toFixed(1)}%</Badge>;
    return <Badge className="bg-red-100 text-red-800">{pace.toFixed(1)}%</Badge>;
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('campaignName')} className="h-auto p-0 font-medium">
                  Campaign Name {getSortIcon('campaignName')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('spend')} className="h-auto p-0 font-medium">
                  Spend {getSortIcon('spend')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('pace')} className="h-auto p-0 font-medium">
                  Pace % {getSortIcon('pace')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('ctr')} className="h-auto p-0 font-medium">
                  CTR {getSortIcon('ctr')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('roas')} className="h-auto p-0 font-medium">
                  ROAS {getSortIcon('roas')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('healthScore')} className="h-auto p-0 font-medium">
                  Health Score {getSortIcon('healthScore')}
                </Button>
              </TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((campaign, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium max-w-xs truncate" title={campaign.campaignName}>
                  {campaign.campaignName}
                </TableCell>
                <TableCell>{formatCurrency(campaign.spend)}</TableCell>
                <TableCell>{getPaceBadge(campaign.pace)}</TableCell>
                <TableCell>{formatPercentage(campaign.ctr)}</TableCell>
                <TableCell>{campaign.roas.toFixed(2)}x</TableCell>
                <TableCell>{getHealthScoreBadge(campaign.healthScore)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {campaign.burnRateConfidence}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {healthData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No campaign data available for health scoring.
        </div>
      )}
    </div>
  );
};

export default CampaignHealthTable;
