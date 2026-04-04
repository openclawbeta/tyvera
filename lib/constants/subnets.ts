import { SUBNETS } from "@/lib/mock-data/subnets";

const derivedCategories = Array.from(new Set(SUBNETS.map((subnet) => subnet.category))).sort();

export const SUBNET_CATEGORIES = ["All", ...derivedCategories] as const;
