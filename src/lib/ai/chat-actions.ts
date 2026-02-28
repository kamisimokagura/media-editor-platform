import type { AIChatAction } from "@/types/ai";
import type { ImageAdjustments } from "@/types";

export interface ActionExecutionResult {
  success: boolean;
  adjustments?: Partial<ImageAdjustments>;
  filterName?: string;
  aiFeatureId?: string;
  error?: string;
}

export function executeAction(action: AIChatAction): ActionExecutionResult {
  switch (action.type) {
    case "adjust": {
      const adjustments: Partial<ImageAdjustments> = {};
      for (const [key, value] of Object.entries(action.params)) {
        if (typeof value === "number" || typeof value === "boolean") {
          (adjustments as Record<string, unknown>)[key] = value;
        }
      }
      return { success: true, adjustments };
    }
    case "filter": {
      const filterName = action.params.name as string | undefined;
      if (!filterName) return { success: false, error: "Filter name not specified" };
      return { success: true, filterName };
    }
    case "ai_tool": {
      const toolName = action.params.tool as string | undefined;
      if (!toolName) return { success: false, error: "AI tool name not specified" };
      return { success: true, aiFeatureId: toolName };
    }
    default:
      return { success: false, error: `Unknown action type: ${action.type}` };
  }
}
