/**
 * ESLint Rule: no-cross-layer-imports
 *
 * Enforces the layered architecture of Quoska:
 *   Types → Config → Repos → Services → API Routes → UI
 *
 * Each layer can only import from layers to its LEFT (lower or equal rank).
 * Importing from a higher-rank layer is an error.
 *
 * Reference: NFR-9, ARCHITECTURE.md, docs/coding-standards.md
 */

"use strict";

const LAYER_RANK = {
  types: 0,
  config: 1,
  repos: 2,
  services: 3,
  "api": 4, // API routes (src/app/api/)
  ui: 5, // UI components (src/components/, src/app/ pages)
};

function getLayer(filePath) {
  if (!filePath) return null;

  // Normalize path separators
  const normalized = filePath.replace(/\\/g, "/");

  // Only analyze src/ files
  if (!normalized.includes("src/")) return null;

  // Types: src/types/
  if (normalized.includes("src/types/")) return "types";

  // Config: src/config/
  if (normalized.includes("src/config/")) return "config";

  // Repos: src/repos/
  if (normalized.includes("src/repos/")) return "repos";

  // Services: src/services/
  if (normalized.includes("src/services/")) return "services";

  // API routes: src/app/api/
  if (normalized.includes("src/app/api/")) return "api";

  // UI: src/components/ or src/app/ (pages/layouts)
  if (
    normalized.includes("src/components/") ||
    normalized.includes("src/providers/") ||
    normalized.includes("src/app/")
  ) {
    return "ui";
  }

  return null;
}

function getImportLayer(importPath) {
  if (!importPath) return null;

  // Handle @/ alias
  const resolved = importPath.replace(/^@\//, "src/");

  if (resolved.startsWith("src/types/") || resolved.includes("/types/"))
    return "types";
  if (resolved.startsWith("src/config/") || resolved.includes("/config/"))
    return "config";
  if (resolved.startsWith("src/repos/") || resolved.includes("/repos/"))
    return "repos";
  if (resolved.startsWith("src/services/") || resolved.includes("/services/"))
    return "services";
  if (resolved.startsWith("src/app/api/") || resolved.includes("/app/api/"))
    return "api";
  if (
    resolved.startsWith("src/components/") ||
    resolved.startsWith("src/providers/") ||
    resolved.startsWith("src/app/")
  )
    return "ui";

  return null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce layered architecture (Types → Config → Repos → Services → API Routes → UI)",
      category: "Architecture",
    },
    messages: {
      crossLayerImport:
        "'{{fromLayer}}' layer cannot import from '{{toLayer}}' layer. " +
        "Allowed layers: {{allowedLayers}}. " +
        "See ARCHITECTURE.md for the layered architecture.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const filePath = context.filename || context.getFilename();
        const currentLayer = getLayer(filePath);
        if (!currentLayer) return;

        const importPath = node.source.value;
        const importLayer = getImportLayer(importPath);
        if (!importLayer) return;

        // Same layer is always allowed
        if (currentLayer === importLayer) return;

        const currentRank = LAYER_RANK[currentLayer];
        const importRank = LAYER_RANK[importLayer];

        // Can only import from lower or equal rank layers
        if (importRank > currentRank) {
          const allowedLayers = Object.entries(LAYER_RANK)
            .filter(([, rank]) => rank <= currentRank)
            .map(([name]) => name)
            .join(", ");

          context.report({
            node,
            messageId: "crossLayerImport",
            data: {
              fromLayer: currentLayer,
              toLayer: importLayer,
              allowedLayers,
            },
          });
        }
      },
    };
  },
};
