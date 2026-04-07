export type AlertMetric = "yield" | "score" | "liquidity" | "emissions" | "stakers" | "risk" | "price" | "inflow";
export type AlertOperator = "above" | "below" | "changes_by";

export interface AlertCondition {
  metric: AlertMetric;
  operator: AlertOperator;
  value: number;
}

export interface AlertRule {
  id: string;
  name: string;
  subnetFilter: number | "any";
  condition: AlertCondition;
  enabled: boolean;
  createdAt: string;
  lastTriggered: string | null;
  triggerCount: number;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  subnet: {
    netuid: number;
    name: string;
  };
  metric: string;
  previousValue: number;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
}

export interface AlertPreset {
  name: string;
  description: string;
  icon: string;
  rules: Omit<AlertRule, "id" | "createdAt" | "lastTriggered" | "triggerCount">[];
}
