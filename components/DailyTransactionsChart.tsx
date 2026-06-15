import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useShop } from '../store';
import { SaleStatus } from '../types';
import { formatCurrency } from '../utils';
import { TrendingUp, ShoppingBag, Landmark, Activity } from 'lucide-react';

type ViewMode = 'combined' | 'sales' | 'pos';

export const DailyTransactionsChart: React.FC = () => {
  const { sales, posTransactions } = useShop();
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  
  // Responsive sizing state
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  // Watch for container resize to ensure crisp pixel density and fit
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 300),
        height: 350
      });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Format YYYY-MM-DD
  const getLocalDateString = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Compile data for the last 30 days
  const data = useMemo(() => {
    const list = [];
    const today = new Date();
    
    // Create base 30 days starting 29 days ago up to today
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dateStr = getLocalDateString(d);
      list.push({
        dateStr,
        date: d,
        label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
        salesTotal: 0,
        posTotal: 0,
        combinedTotal: 0,
        salesCount: 0,
        posCount: 0
      });
    }

    // Accumulate Shop Sales
    sales.forEach(sale => {
      if (sale.status !== SaleStatus.COMPLETED) return;
      const dateStr = sale.saleDate || sale.createdAt.split('T')[0];
      const match = list.find(item => item.dateStr === dateStr);
      if (match) {
        match.salesTotal += sale.totalAmount;
        match.salesCount += 1;
      }
    });

    // Accumulate POS withdrawals volume
    posTransactions.forEach(tx => {
      const dateStr = (tx.transactionDate || tx.createdAt).split('T')[0];
      const match = list.find(item => item.dateStr === dateStr);
      if (match) {
        match.posTotal += tx.withdrawalAmount;
        match.posCount += 1;
      }
    });

    // Compute combined values
    list.forEach(item => {
      item.combinedTotal = item.salesTotal + item.posTotal;
    });

    return list;
  }, [sales, posTransactions]);

  // View style helpers
  const config = useMemo(() => {
    switch (viewMode) {
      case 'sales':
        return {
          stroke: '#10b981', // Emerand-500
          fillGradientStart: 'rgba(16, 185, 129, 0.25)',
          label: 'Direct Retail Sales',
          icon: ShoppingBag,
          colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-100',
          accentColor: 'bg-emerald-500'
        };
      case 'pos':
        return {
          stroke: '#3b82f6', // Blue-500
          fillGradientStart: 'rgba(59, 130, 246, 0.25)',
          label: 'POS Cash-outs',
          icon: Landmark,
          colorClass: 'text-blue-500 bg-blue-50 border-blue-100',
          accentColor: 'bg-blue-500'
        };
      case 'combined':
      default:
        return {
          stroke: '#6366f1', // Indigo-500
          fillGradientStart: 'rgba(99, 102, 241, 0.25)',
          label: 'Combined Business Volume',
          icon: Activity,
          colorClass: 'text-indigo-500 bg-indigo-50 border-indigo-100',
          accentColor: 'bg-indigo-500'
        };
    }
  }, [viewMode]);

  // Compute scale boundaries
  const margin = { top: 30, right: 30, bottom: 40, left: 65 };
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  const xScale = useMemo(() => {
    return d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, innerWidth]);
  }, [data, innerWidth]);

  const yScale = useMemo(() => {
    const getValue = (d: typeof data[0]) => {
      if (viewMode === 'combined') return d.combinedTotal;
      if (viewMode === 'sales') return d.salesTotal;
      return d.posTotal;
    };
    
    const maxVal = d3.max(data, getValue) || 1000;
    // Add 15% top padding for visual breathing room
    return d3.scaleLinear()
      .domain([0, maxVal * 1.15])
      .range([innerHeight, 0]);
  }, [data, viewMode, innerHeight]);

  // D3 Generators
  const linePath = useMemo(() => {
    const getValue = (d: typeof data[0]) => {
      if (viewMode === 'combined') return d.combinedTotal;
      if (viewMode === 'sales') return d.salesTotal;
      return d.posTotal;
    };

    const lineGenerator = d3.line<typeof data[0]>()
      .x(d => xScale(d.date))
      .y(d => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    return lineGenerator(data) || '';
  }, [data, xScale, yScale, viewMode]);

  const areaPath = useMemo(() => {
    const getValue = (d: typeof data[0]) => {
      if (viewMode === 'combined') return d.combinedTotal;
      if (viewMode === 'sales') return d.salesTotal;
      return d.posTotal;
    };

    const areaGenerator = d3.area<typeof data[0]>()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    return areaGenerator(data) || '';
  }, [data, xScale, yScale, viewMode, innerHeight]);

  // Gridticks and dynamic helper points
  const yTicks = useMemo(() => yScale.ticks(5), [yScale]);
  const xTicks = useMemo(() => xScale.ticks(6), [xScale]);

  // Interaction tracking state
  const [hoveredPoint, setHoveredPoint] = useState<typeof data[0] | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - margin.left;

    if (mouseX < 0 || mouseX > innerWidth) {
      setHoveredPoint(null);
      return;
    }

    const mouseDate = xScale.invert(mouseX);
    const bisectDate = d3.bisector((d: typeof data[0]) => d.date).left;
    const index = bisectDate(data, mouseDate, 1);
    
    const d0 = data[index - 1];
    const d1 = data[index];
    
    let closest = d0;
    if (d0 && d1) {
      closest = (mouseDate.getTime() - d0.date.getTime() > d1.date.getTime() - mouseDate.getTime()) ? d1 : d0;
    }

    if (closest) {
      setHoveredPoint(closest);
      
      const getValue = (d: typeof data[0]) => {
        if (viewMode === 'combined') return d.combinedTotal;
        if (viewMode === 'sales') return d.salesTotal;
        return d.posTotal;
      };

      setTooltipPos({
        x: xScale(closest.date) + margin.left,
        y: yScale(getValue(closest)) + margin.top
      });
    }
  };

  const IconComponent = config.icon;

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${config.colorClass}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">30-Day Daily Revenue Trend</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Real-time visual audit of shop cash inflows and point-of-sale volume.
          </p>
        </div>

        {/* View Mode Selectors */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setViewMode('combined')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewMode === 'combined'
                ? 'bg-white text-indigo-600 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Combined
          </button>
          <button
            onClick={() => setViewMode('sales')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewMode === 'sales'
                ? 'bg-white text-emerald-600 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setViewMode('pos')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewMode === 'pos'
                ? 'bg-white text-blue-600 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            POS Withdrawals
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full overflow-visible">
        {/* SVG Drawing Canvas */}
        <svg
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="select-none overflow-visible cursor-crosshair"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={config.stroke} stopOpacity={0.00} />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Fine Grid lines */}
            {yTicks.map((tick, i) => (
              <g key={i} className="opacity-40">
                <line
                  x1={0}
                  y1={yScale(tick)}
                  x2={innerWidth}
                  y2={yScale(tick)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={-12}
                  y={yScale(tick) + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-medium text-[10px] font-black"
                >
                  {tick >= 1000 ? `₦${(tick / 1000).toFixed(0)}k` : `₦${tick}`}
                </text>
              </g>
            ))}

            {/* X-Axis ticks */}
            {xTicks.map((tickDate, i) => (
              <g key={i}>
                <line
                  x1={xScale(tickDate)}
                  y1={innerHeight}
                  x2={xScale(tickDate)}
                  y2={innerHeight + 6}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
                <text
                  x={xScale(tickDate)}
                  y={innerHeight + 20}
                  textAnchor="middle"
                  className="fill-slate-400 font-bold text-[10px]"
                >
                  {tickDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </text>
              </g>
            ))}

            {/* Bottom Base axis line */}
            <line
              x1={0}
              y1={innerHeight}
              x2={innerWidth}
              y2={innerHeight}
              stroke="#cbd5e1"
              strokeWidth={1.5}
            />

            {/* Area Path */}
            <path
              d={areaPath}
              className="fill-current text-indigo-500/10"
              style={{
                fill: `url(#chartGradient)`,
                transition: 'all 500ms ease-out-cubic'
              }}
            />

            {/* Line Path */}
            <path
              d={linePath}
              fill="none"
              stroke={config.stroke}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500"
            />

            {/* Hover Guides */}
            {hoveredPoint && (
              <g>
                {/* Vertical cursor guideline */}
                <line
                  x1={xScale(hoveredPoint.date)}
                  y1={0}
                  x2={xScale(hoveredPoint.date)}
                  y2={innerHeight}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />

                {/* Pulsing indicator marker */}
                <circle
                  cx={xScale(hoveredPoint.date)}
                  cy={yScale(
                    viewMode === 'combined'
                      ? hoveredPoint.combinedTotal
                      : viewMode === 'sales'
                      ? hoveredPoint.salesTotal
                      : hoveredPoint.posTotal
                  )}
                  r={8}
                  fill={config.stroke}
                  className="animate-ping opacity-30"
                />
                
                <circle
                  cx={xScale(hoveredPoint.date)}
                  cy={yScale(
                    viewMode === 'combined'
                      ? hoveredPoint.combinedTotal
                      : viewMode === 'sales'
                      ? hoveredPoint.salesTotal
                      : hoveredPoint.posTotal
                  )}
                  r={5}
                  fill={config.stroke}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              </g>
            )}
          </g>
        </svg>

        {/* Floating Interactive HTML Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-10 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 text-[11px] leading-relaxed select-none pointer-events-none transform -translate-x-1/2 -translate-y-12"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 12,
              transition: 'left 100ms ease-out, top 100ms ease-out'
            }}
          >
            <div className="font-black text-[10px]  tracking-normal text-slate-400 border-b border-white/15 pb-1.5 mb-2 flex justify-between gap-4">
              <span>{hoveredPoint.date.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className={`w-2 h-2 rounded-full ${config.accentColor}`}></span>
            </div>
            
            <div className="space-y-1 bg-white/5 p-2 rounded-xl border border-white/5">
              <div className="flex justify-between gap-8 font-medium">
                <span className="text-slate-400">Retail Revenue:</span>
                <span className="font-black font-medium text-emerald-400">
                  {formatCurrency(hoveredPoint.salesTotal)}
                </span>
              </div>
              <div className="flex justify-between gap-8 font-medium">
                <span className="text-slate-400">POS Trans Volume:</span>
                <span className="font-black font-medium text-blue-400">
                  {formatCurrency(hoveredPoint.posTotal)}
                </span>
              </div>
              <div className="flex justify-between gap-8 font-black text-xs border-t border-white/10 pt-1.5 mt-1">
                <span>Total Accumulated:</span>
                <span className="font-medium text-indigo-300">
                  {formatCurrency(hoveredPoint.combinedTotal)}
                </span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 px-1 font-semibold">
              <span>Orders: <b>{hoveredPoint.salesCount}</b></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>POS Requests: <b>{hoveredPoint.posCount}</b></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
