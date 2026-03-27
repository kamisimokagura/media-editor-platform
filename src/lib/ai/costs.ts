/**
 * Server-side AI operation cost definitions.
 * Clients cannot override these values.
 */
export const OPERATION_COSTS: Record<string, number> = {
  // Image generation
  "generate": 3,
  "generate:gemini-flash": 2,
  "generate:gpt-image": 5,
  "generate:grok-aurora": 3,
  "generate:flux-pro": 4,
  "generate:recraft-v3": 3,

  // Image editing
  "erase": 2,
  "expand": 2,
  "inpaint": 3,
  "remove-bg": 1,
  "style": 3,
  "upscale": 2,

  // Chat
  "chat": 1,
};

/** Valid base operations (without model suffix) */
export const VALID_OPERATIONS = new Set(
  Object.keys(OPERATION_COSTS)
    .map((k) => k.split(":")[0])
);

/** Valid models per operation */
export const VALID_MODELS: Record<string, Set<string>> = {};
for (const key of Object.keys(OPERATION_COSTS)) {
  const [op, model] = key.split(":");
  if (model) {
    if (!VALID_MODELS[op]) VALID_MODELS[op] = new Set();
    VALID_MODELS[op].add(model);
  }
}

/** Check if an operation (and optional model) is valid */
export function isValidOperation(operation: string, model?: string): boolean {
  if (!VALID_OPERATIONS.has(operation)) return false;
  if (model && VALID_MODELS[operation] && !VALID_MODELS[operation].has(model)) return false;
  return true;
}

/**
 * Get the cost for an operation. Falls back to base operation cost,
 * then to 1 credit as last resort.
 */
export function getOperationCost(operation: string, model?: string): number {
  if (model) {
    const specificKey = `${operation}:${model}`;
    if (specificKey in OPERATION_COSTS) {
      return OPERATION_COSTS[specificKey];
    }
  }
  return OPERATION_COSTS[operation] ?? 1;
}
