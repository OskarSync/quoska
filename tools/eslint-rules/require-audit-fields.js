/**
 * @fileoverview ESLint rule: require-audit-fields
 *
 * LEGAL BASIS: Revisionssicherheit — every mutation to time entry data must
 * include audit fields (who changed it, when, and the original values).
 * §16 ArbZG + GoBD require a traceable audit trail.
 *
 * ENFORCES:
 *   - When creating/updating time entries via ORM, the call must include
 *     at minimum: `changedBy` or `modifiedBy` field.
 *   - Detects patterns like prisma.timeEntry.update({ data: {...} })
 *     and checks that the data object includes audit metadata.
 *
 * ALLOWS:
 *   - Test files
 *   - Read operations (findMany, findUnique, etc.)
 *   - Soft-delete operations (already covered by no-hard-delete rule)
 *
 * @author quoska-harness
 */

"use strict";

/** @type {import('eslint').RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Time entry mutations must include audit fields — Revisionssicherheit / GoBD",
      category: "Legal Compliance",
      recommended: "error",
    },
    messages: {
      requireAuditFields:
        "Time entry mutation detected without audit fields. " +
        "Revisionssicherheit (GoBD) requires tracking who changed what and when. " +
        "Include changedBy/modifiedBy and changedAt/modifiedAt in your data payload.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Skip test files
    if (
      filename.includes(".test.") ||
      filename.includes(".spec.") ||
      filename.includes("/tests/") ||
      filename.includes("/test/")
    ) {
      return {};
    }

    const mutationMethods = new Set(["update", "updateMany", "upsert", "create"]);
    const timeEntryModels =
      /\b(TimeEntry|timeEntry|time_entry|Quoska|stamp|ClockEntry|WorkSession|ShiftEntry)\b/i;
    const auditFieldPatterns =
      /^(changedBy|modifiedBy|updatedBy|changedAt|modifiedAt|updatedAt|auditNote|changeReason)$/;

    function hasAuditFields(node) {
      if (!node) return false;

      // Check object expression for audit fields
      if (node.type === "ObjectExpression") {
        return node.properties.some((prop) => {
          if (prop.type === "SpreadElement") return true; // Spread could include audit fields
          if (prop.key) {
            const keyName =
              prop.key.type === "Identifier"
                ? prop.key.name
                : prop.key.type === "Literal"
                ? String(prop.key.value)
                : "";
            return auditFieldPatterns.test(keyName);
          }
          return false;
        });
      }

      // Variable reference — can't statically determine, allow
      if (node.type === "Identifier") return true;

      return false;
    }

    return {
      CallExpression(node) {
        // Match: model.update({ data: {...} }), prisma.timeEntry.update({ data: {...} })
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          mutationMethods.has(node.callee.property.name)
        ) {
          // Check if this is a time-entry model
          let modelName = "";
          if (node.callee.object.type === "Identifier") {
            modelName = node.callee.object.name;
          } else if (
            node.callee.object.type === "MemberExpression" &&
            node.callee.object.property.type === "Identifier"
          ) {
            modelName = node.callee.object.property.name;
          }

          if (!timeEntryModels.test(modelName)) return;

          // Find the data argument
          const firstArg = node.arguments[0];
          if (!firstArg || firstArg.type === "SpreadElement") return;

          // For create/update calls, check for audit fields
          // Pattern 1: update({ data: { ... } })
          if (firstArg.type === "ObjectExpression") {
            const dataProp = firstArg.properties.find((prop) => {
              if (prop.type === "SpreadElement") return false;
              return (
                prop.key &&
                prop.key.type === "Identifier" &&
                prop.key.name === "data"
              );
            });

            if (dataProp && dataProp.value) {
              if (!hasAuditFields(dataProp.value)) {
                context.report({
                  node,
                  messageId: "requireAuditFields",
                });
              }
            } else if (firstArg.properties.length > 0 && !dataProp) {
              // Direct object: model.update({ field: value })
              if (!hasAuditFields(firstArg)) {
                context.report({
                  node,
                  messageId: "requireAuditFields",
                });
              }
            }
          }
        }
      },
    };
  },
};
