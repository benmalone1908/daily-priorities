interface MetricsChartLegendProps {
  activeTab: string;
}

export const MetricsChartLegend = ({ activeTab }: MetricsChartLegendProps) => {
  return (
    <div className="flex items-center space-x-4 text-xs">
      {activeTab === "display" && (
        <>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-green-400 opacity-80"></div>
            <span>Impressions</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 bg-amber-500"></div>
            <span>Clicks</span>
          </div>
        </>
      )}
      {activeTab === "attribution" && (
        <>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span>Transactions</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-purple-500 opacity-80"></div>
            <span>Attributed Sales</span>
          </div>
        </>
      )}
      {activeTab === "spend" && (
        <>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-blue-500"></div>
            <span>MediaJel Direct</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-yellow-400"></div>
            <span>Channel Partners</span>
          </div>
        </>
      )}
    </div>
  );
};