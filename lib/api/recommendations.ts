import { mapRecommendationDtoToUiModel } from "@/lib/adapters/recommendations";
import { ACTIVE_RECOMMENDATIONS } from "@/lib/mock-data/recommendations";

export function getRecommendations(_address?: string) {
  // TODO: replace stub with real backend call.
  return ACTIVE_RECOMMENDATIONS.map(mapRecommendationDtoToUiModel);
}
