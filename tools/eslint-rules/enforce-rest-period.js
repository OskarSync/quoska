/**
 * @fileoverview ESLint rule: enforce-rest-period
 *
 * LEGAL BASIS: §5 ArbZG — minimum 11 hours uninterrupted rest period
 * between the end of one shift and the start of the next.
 *
 * ENFORCES:
 *   - Rest period validation must use 11 hours as the minimum threshold
 *   - Flags values less than 11 hours in rest-period validation logic
 *
 * ALLOWS:
 *   - Values greater than or equal to 11 hours (stricter is fine)
 *   - Test files
 *
 * @author quoska-harness
 */

"use strict";

/** @type {import('eslint').RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Rest period validation must enforce §5 ArbZG minimum of 11 hours between shifts",
      category: "Legal Compliance",
      recommended: "warn",
    },
    messages: {
      invalidRestPeriod:
        "Rest period of {{value}}h is below §5 ArbZG minimum of 11 hours. " +
        "Set the minimum to 11 hours or more.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    if (
      filename.includes(".test.") ||
      filename.includes(".spec.") ||
      filename.includes("/tests/") ||
      filename.includes("/test/")
    ) {
      return {};
    }

    function isRestPeriodContext(node) {
      let current = node;
      while (current.parent) {
        current = current.parent;
        if (current.type === "VariableDeclarator" && current.id.type === "Identifier") {
          if (/rest|ruehe|ruhepause|min.*break|gap|pause.*between/i.test(current.id.name)) {
            return true;
          }
        }
        if (current.type === "Property" && current.key.type === "Identifier") {
          if (
            /restPeriod|rest_period|minRestHours|ruhezeit|ruhe.*zeit/i.test(
              current.key.name
            )
          ) {
            return true;
          }
        }
        if (
          current.type === "CallExpression" &&
          current.callee.type === "Identifier"
        ) {
          if (/rest|ruhe|validate.*shift|check.*gap/i.test(current.callee.name)) {
            return true;
          }
        }
      }
      return false;
    }

    return {
      Literal(node) {
        const value = node.value;
        if (typeof value !== "number") return;

        if (!isRestPeriodContext(node)) return;

        // Flag values that represent hours below the 11h minimum
        // Typical range: 1-24 hours
        if (value >= 1 && value < 11 && Number.isInteger(value)) {
          context.report({
            node,
            messageId: "invalidRestPeriod",
            data: { value },
          });
        }
      },
    };
  },
};
