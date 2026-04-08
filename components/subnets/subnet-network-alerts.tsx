'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Key, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { SubnetDetailModel } from '@/lib/types/subnets';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'whale' | 'dereg' | 'coldkey';
  severity: 'warning' | 'danger' | 'info';
  netuid: number;
  subnetName: string;
  metric: string;
  description: string;
  value?: number;
}

interface SubnetNetworkAlertsProps {
  subnets: SubnetDetailModel[];
}

export function SubnetNetworkAlerts({ subnets }: SubnetNetworkAlertsProps) {
  const [activeTab, setActiveTab] = useState<'whale' | 'dereg' | 'coldkey'>('whale');

  // Generate whale movement alerts
  const whaleAlerts: Alert[] = subnets
    .flatMap((subnet) => {
      const alerts: Alert[] = [];

      const f24h = subnet.flow24h ?? 0;
      const f1w = subnet.flow1w ?? 0;

      if (Math.abs(f24h) > 500) {
        const direction = f24h > 0 ? 'Inflow' : 'Outflow';
        alerts.push({
          id: `whale-24h-${subnet.netuid}`,
          type: 'whale',
          severity: Math.abs(f24h) > 1000 ? 'danger' : 'warning',
          netuid: subnet.netuid,
          subnetName: subnet.name,
          metric: 'Flow 24h',
          description: `${direction}: ${Math.abs(f24h).toFixed(2)} τ`,
          value: f24h,
        });
      }

      if (Math.abs(f1w) > 2000) {
        const direction = f1w > 0 ? 'Major inflow' : 'Major outflow';
        alerts.push({
          id: `whale-1w-${subnet.netuid}`,
          type: 'whale',
          severity: 'danger',
          netuid: subnet.netuid,
          subnetName: subnet.name,
          metric: 'Flow 7d',
          description: `${direction}: ${Math.abs(f1w).toFixed(2)} τ`,
          value: f1w,
        });
      }

      return alerts;
    });

  // Generate dereg risk alerts
  const deregAlerts: Alert[] = subnets
    .flatMap((subnet) => {
      const alerts: Alert[] = [];

      if (subnet.emissions === 0 && subnet.stakers < 20) {
        alerts.push({
          id: `dereg-high-${subnet.netuid}`,
          type: 'dereg',
          severity: 'danger',
          netuid: subnet.netuid,
          subnetName: subnet.name,
          metric: 'Emissions + Stakers',
          description: `Zero emissions with only ${subnet.stakers} stakers — high deregistration risk`,
        });
      } else if (subnet.emissions === 0 && subnet.stakers < 50) {
        alerts.push({
          id: `dereg-moderate-${subnet.netuid}`,
          type: 'dereg',
          severity: 'warning',
          netuid: subnet.netuid,
          subnetName: subnet.name,
          metric: 'Emissions + Stakers',
          description: `Zero emissions with ${subnet.stakers} stakers — moderate deregistration risk`,
        });
      }

      if (subnet.age < 14 && subnet.liquidity < 10000) {
        alerts.push({
          id: `dereg-new-fragile-${subnet.netuid}`,
          type: 'dereg',
          severity: 'warning',
          netuid: subnet.netuid,
          subnetName: subnet.name,
          metric: 'Age + Liquidity',
          description: `New subnet (${subnet.age} days) with low liquidity (${subnet.liquidity.toFixed(2)} τ) — fragile`,
        });
      }

      return alerts;
    });

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'danger':
        return '#ef4444';
      case 'warning':
        return '#f97316';
      case 'info':
        return '#22d3ee';
      default:
        return '#6b7280';
    }
  };

  const getSeverityBgColor = (severity: string): string => {
    switch (severity) {
      case 'danger':
        return 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15';
      case 'warning':
        return 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15';
      case 'info':
        return 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15';
      default:
        return 'bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/15';
    }
  };

  const getAlertIcon = (type: string, severity: string = 'info') => {
    switch (type) {
      case 'whale':
        return severity === 'danger' ? (
          <TrendingUp size={18} style={{ color: getSeverityColor(severity) }} />
        ) : (
          <TrendingDown size={18} style={{ color: getSeverityColor(severity) }} />
        );
      case 'dereg':
        return <AlertTriangle size={18} style={{ color: getSeverityColor(severity) }} />;
      case 'coldkey':
        return <Key size={18} style={{ color: getSeverityColor(severity) }} />;
      default:
        return <ArrowUpDown size={18} />;
    }
  };

  const alerts =
    activeTab === 'whale' ? whaleAlerts : activeTab === 'dereg' ? deregAlerts : [];

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-white/[0.07] pb-4">
        <button
          onClick={() => setActiveTab('whale')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
            activeTab === 'whale'
              ? 'bg-white/[0.1] text-white border border-white/[0.15]'
              : 'text-white/60 hover:text-white/80 border border-transparent',
          )}
        >
          Whale Tracker
        </button>
        <button
          onClick={() => setActiveTab('dereg')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
            activeTab === 'dereg'
              ? 'bg-white/[0.1] text-white border border-white/[0.15]'
              : 'text-white/60 hover:text-white/80 border border-transparent',
          )}
        >
          Dereg Watch
        </button>
        <button
          onClick={() => setActiveTab('coldkey')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
            activeTab === 'coldkey'
              ? 'bg-white/[0.1] text-white border border-white/[0.15]'
              : 'text-white/60 hover:text-white/80 border border-transparent',
          )}
        >
          Coldkey Swaps
        </button>
      </div>

      {/* Alert feed */}
      <div className="space-y-3">
        {activeTab === 'coldkey' ? (
          // Coldkey swap upcoming feature
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center gap-4">
            <div className="flex-shrink-0">
              <Key size={24} className="text-white/40" />
            </div>
            <div>
              <h3 className="text-white font-medium">Coldkey Swap Monitoring</h3>
              <p className="text-white/60 text-sm mt-1">
                Coldkey swap monitoring requires direct chain indexing. This feature is under development and will be available in a future update.
              </p>
            </div>
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <Link
              key={alert.id}
              href={`/subnets/${alert.netuid}`}
              className={cn(
                'block p-4 rounded-xl border transition-all duration-200 cursor-pointer',
                getSeverityBgColor(alert.severity),
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{getAlertIcon(alert.type, alert.severity)}</div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-medium truncate">{alert.subnetName}</span>
                    <span className="text-white/50 text-xs flex-shrink-0">sn{alert.netuid}</span>
                  </div>
                  <p className="text-white/70 text-sm mb-2">{alert.description}</p>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span className="px-2 py-1 bg-white/[0.05] rounded border border-white/[0.1]">
                      {alert.metric}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-8 rounded-xl bg-white/[0.03] border border-white/[0.07] text-center">
            <p className="text-white/60 text-sm">No {activeTab} alerts detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
