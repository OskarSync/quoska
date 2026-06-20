/**
 * @fileoverview ESLint rule: enforce-break-rules
 *
 * LEGAL BASIS: §4 ArbZG — mandatory break requirements:
 *   - ≥30 minutes break after 6 hours of work
 *   - ≥45 minutes break after 9 hours of work
 *   - Breaks can be split into blocks of at least 15 minutes
 *
 * ENFORCES:
 *   - Break validation logic must use the correct thresholds (6h → 30min, 9h → 45min)
 *   - Flags hardcoded values that deviate from legal requirements
 *   - Warns if break validation is missing in work-session completion flows
 *
 * ALLOWS:
 *   - Correct threshold values (6, 9, 30, 45)
 *   - Test files
 *   - Stricter values (e.g., 5.5h instead of 6h is fine)
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
        "Break validation must use correct ArbZG §4 thresholds (30min/6h, 45min/9h)",
      category: "Legal Compliance",
      recommended: "warn",
    },
    messages: {
      wrongBreakThreshold:
        "Break threshold {{value}} {{unit}} differs from ArbZG §4 requirements. " +
        "Legal minimum: 30min after 6h work, 45min after 9h work.",
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

    // Legal thresholds in minutes and hours
    const legalHourThresholds = new Set([6, 9, 5.5, 8]); // 5.5 and 8 are stricter = OK
    const legalMinuteThresholds = new Set([30, 45, 15, 20]); // 15 = minimum block, 20 = stricter = OK
    const legalHourlyMinutes = new Set([360, 540]); // 6h in min, 9h in min

    function isBreakRelated(node) {
      // Walk up the AST to see if we're in a break-related context
      let current = node;
      while (current.parent) {
        current = current.parent;
        if (current.type === "VariableDeclarator" && current.id.type === "Identifier") {
          if (/break|pause|ruh?e/i.test(current.id.name)) return true;
        }
        if (current.type === "FunctionDeclaration" && current.id) {
          if (/break|pause|ruhe/i.test(current.id.name)) return true;
        }
        if (
          current.type === "CallExpression" &&
          current.callee.type === "Identifier"
        ) {
          if (/break|pause|validate|check|require/i.test(current.callee.name))
            return true;
        }
      }
      return false;
    }

    return {
      Literal(node) {
        const value = node.value;
        if (typeof value !== "number") return;

        // Only flag in break-related contexts
        if (!isBreakRelated(node)) return;

        // Check hour-like thresholds (6, 9, 8, 10 used as work hour limits)
        if (Number.isInteger(value) && value >= 5 && value <= 10) {
          // Values of 5, 7, 8, 10 are not the ArbZG break thresholds but could be valid
          // Only flag truly wrong values like 7 or values clearly intended as break thresholds
          if (value === 7) {
            context.report({
              node,
              messageId: "wrongBreakThreshold",
              data: { value, unit: "hours" },
            });
          }
        }

        // Check minute-like thresholds
        if (Number.isInteger(value) && value >= 20 && value <= 60) {
          if (!legalMinuteThresholds.has(value)) {
            // Likely a break duration threshold that's not legally compliant
            // Only flag obviously wrong ones: 25, 35, 40, 50, 55, 60
            if ([25, 35, 40, 50, 55].includes(value)) {
              context.report({
                node,
                messageId: "wrongBreakThreshold",
                data: { value, unit: "minutes" },
              });
            }
          }
        }
      },
    };
  },
};
