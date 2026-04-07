import type { AlertRule, AlertEvent, AlertPreset, AlertCondition } from "@/lib/types/alerts";
import type { SubnetDetailModel, RiskLevel } from "@/lib/types/subnets";

const RULES_KEY = "tyvera_alert_rules";
const HISTORY_KEY = "tyvera_alert_history";
const SNAPSHOT_KEY = "tyvera_subnet_snapshot";

// ── Storage helpers ──────────────────────────────────────────────────

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setInStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail if storage is full or unavailable
  }
}

// ── Rule management ──────────────────────────────────────────────────

export function getAlertRules(): AlertRule[] {
  return getFromStorage<AlertRule[]>(RULES_KEY, []);
}

export function saveAlertRule(rule: AlertRule): void {
  const rules = getAlertRules();
  const existing = rules.findIndex((r) => r.id === rule.id);
  if (existing >= 0) {
    rules[existing] = rule;
  } else {
    rules.push(rule);
  }
  setInStorage(RULES_KEY, rules);
}

export function deleteAlertRule(id: string): void {
  const rules = getAlertRules().filter((r) => r.id !== id);
  setInStorage(RULES_KEY, rules);
}

export function toggleAlertRule(id: string): void {
  const rules = getAlertRules();
  const rule = rules.find((r) => r.id === id);
  if (rule) {
    rule.enabled = !rule.enabled;
    saveAlertRule(rule);
  }
}

// ── Alert history ───────────────────────────────────────────────────

export function getAlertHistory(): AlertEvent[] {
  return getFromStorage<AlertEvent[]>(HISTORY_KEY, []);
}

export function saveAlertEvent(event: AlertEvent): void {
  const history = getAlertHistory();
  history.push(event);
  // Keep only last 100 events
  if (history.length > 100) {
    history.shift();
  }
  setInStorage(HISTORY_KEY, history);
}

export function acknowledgeAlert(eventId: string): void {
  const history = getAlertHistory();
  const event = history.find((e) => e.id === eventId);
  if (event) {
    event.acknowledged = true;
    setInStorage(HISTORY_KEY, history);
  }
}

// ── Snapshot management ──────────────────────────────────────────────

function getSubnetSnapshot(): Record<number, SubnetDetailModel> {
  return getFromStorage<Record<number, SubnetDetailModel>>(SNAPSHOT_KEY, {});
}

function saveSubnetSnapshot(subnets: SubnetDetailModel[]): void {
  const snapshot: Record<number, SubnetDetailModel> = {};
  subnets.forEach((subnet) => {
    snapshot[subnet.netuid] = subnet;
  });
  setInStorage(SNAPSHOT_KEY, snapshot);
}

// ── Alert evaluation ────────────────────────────────────────────────

function getMetricValue(subnet: SubnetDetailModel, metric: string): number {
  const map: Record<string, number> = {
    yield: subnet.yield,
    score: subnet.score,
    liquidity: subnet.liquidity,
    emissions: subnet.emissions,
    stakers: subnet.stakers,
    price: 0, // placeholder
    inflow: subnet.inflow,
  };
  return map[metric] ?? 0;
}

function checkRiskCondition(previousRisk: RiskLevel | undefined, currentRisk: RiskLevel): boolean {
  const riskOrder: Record<RiskLevel, number> = { LOW: 0, MODERATE: 1, HIGH: 2, SPECULATIVE: 3 };
  if (!previousRisk) return riskOrder[currentRisk] >= 2; // Trigger on HIGH or SPECULATIVE
  return riskOrder[currentRisk] > riskOrder[previousRisk];
}

export function evaluateAlerts(rules: AlertRule[], subnets: SubnetDetailModel[]): AlertEvent[] {
  const events: AlertEvent[] = [];
  const previousSnapshot = getSubnetSnapshot();

  rules.forEach((rule) => {
    if (!rule.enabled) return;

    const targetSubnets =
      rule.subnetFilter === "any"
        ? subnets
        : subnets.filter((s) => s.netuid === rule.subnetFilter);

    targetSubnets.forEach((subnet) => {
      const condition = rule.condition;
      const currentValue = getMetricValue(subnet, condition.metric);
      const previousData = previousSnapshot[subnet.netuid];

      let shouldTrigger = false;
      let previousValue = currentValue;

      if (condition.metric === "risk") {
        // Special handling for risk level
        if (checkRiskCondition(previousData?.risk, subnet.risk as RiskLevel)) {
          shouldTrigger = true;
        }
      } else if (condition.operator === "above") {
        shouldTrigger = currentValue > condition.value;
      } else if (condition.operator === "below") {
        shouldTrigger = currentValue < condition.value;
      } else if (condition.operator === "changes_by") {
        const prevValue = getMetricValue(previousData || subnet, condition.metric);
        previousValue = prevValue;
        const change = Math.abs(currentValue - prevValue);
        shouldTrigger = change >= condition.value;
      }

      if (shouldTrigger) {
        const event: AlertEvent = {
          id: `${rule.id}-${subnet.netuid}-${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          subnet: {
            netuid: subnet.netuid,
            name: subnet.name,
          },
          metric: condition.metric,
          previousValue,
          currentValue,
          threshold: condition.value,
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
        };
        events.push(event);

        // Update rule's last triggered and count
        rule.lastTriggered = new Date().toISOString();
        rule.triggerCount = (rule.triggerCount || 0) + 1;
        saveAlertRule(rule);
      }
    });
  });

  // Save current snapshot for next evaluation
  saveSubnetSnapshot(subnets);

  // Save events to history
  events.forEach(saveAlertEvent);

  return events;
}

// ── Presets ──────────────────────────────────────────────────────────

export function getAlertPresets(): AlertPreset[] {
  return [
    {
      name: "Yield Guardian",
      description: "Alert when any watched subnet yield drops below 15%",
      icon: "TrendingDown",
      rules: [
        {
          name: "Yield Guardian",
          subnetFilter: "any",
          condition: {
            metric: "yield",
            operator: "below",
            value: 15,
          },
          enabled: true,

        },
      ],
    },
    {
      name: "Whale Watcher",
      description: "Alert when any subnet liquidity changes by more than 20%",
      icon: "Waves",
      rules: [
        {
          name: "Whale Watcher",
          subnetFilter: "any",
          condition: {
            metric: "liquidity",
            operator: "changes_by",
            value: 20,
          },
          enabled: true,

        },
      ],
    },
    {
      name: "Risk Monitor",
      description: "Alert when any held subnet risk changes to HIGH or SPECULATIVE",
      icon: "AlertTriangle",
      rules: [
        {
          name: "Risk Monitor",
          subnetFilter: "any",
          condition: {
            metric: "risk",
            operator: "above",
            value: 2,
          },
          enabled: true,

        },
      ],
    },
    {
      name: "New Opportunity",
      description: "Alert when any subnet score rises above 80",
      icon: "Star",
      rules: [
        {
          name: "New Opportunity",
          subnetFilter: "any",
          condition: {
            metric: "score",
            operator: "above",
            value: 80,
          },
          enabled: true,

        },
      ],
    },
    {
      name: "Emission Tracker",
      description: "Alert when subnet emissions drop below 2%",
      icon: "Zap",
      rules: [
        {
          name: "Emission Tracker",
          subnetFilter: "any",
          condition: {
            metric: "emissions",
            operator: "below",
            value: 2,
          },
          enabled: true,

        },
      ],
    },
  ];
}
