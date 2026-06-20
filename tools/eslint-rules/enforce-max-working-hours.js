/**
 * @fileoverview ESLint rule: enforce-max-working-hours
 *
 * LEGAL BASIS: §3 ArbZG (incl. ArbZG-Reform 2026):
 *   - Maximum 10 hours per day (8h normal, 10h with overtime)
 *   - Maximum 48 hours per week (averaged over 6 months / 24 weeks)
 *
 * ENFORCES:
 *   - Working hour limit checks must use correct daily max (10h) and weekly max (48h)
 *   - Flags hardcoded values that exceed or incorrectly set these limits
 *
 * ALLOWS:
 *   - Values stricter than legal minimum (e.g., 8h/day, 40h/week)
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
        "Working hour limits must comply with §3 ArbZG (10h/day, 48h/week)",
      category: "Legal Compliance",
      recommended: "warn",
    },
    messages: {
      invalidDailyMax:
        "Daily working hour limit of {{value}}h exceeds §3 ArbZG maximum of 10h/day.",
      invalidWeeklyMax:
        "Weekly working hour limit of {{value}}h exceeds §3 ArbZG maximum of 48h/week.",
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

    const weeklyPatterns =
      /(week|woche)/i;
    const dailyPatterns =
      /(day|daily|tag|täglich)/i;
    const maxHourPatterns =
      /(max.*hour|max.*stunde|stunden.*max|daily.*max|weekly.*max|max.*work|max.*arbeit)/i;

    /** Determine if a Literal is in a daily or weekly context */
    function getWorkHourContext(node) {
      // Walk the entire parent chain looking for context clues
      const sourceCode = context.sourceCode || context.getSourceCode();
      const text = sourceCode.getText(node.parent || node);

      // Also check the line text for context
      const line = sourceCode.lines[node.loc.start.line - 1] || "";

      // Check variable name from parent VariableDeclarator
      let current = node;
      while (current.parent) {
        current = current.parent;

        if (
          current.type === "VariableDeclarator" &&
          current.id.type === "Identifier"
        ) {
          const name = current.id.name;
          if (weeklyPatterns.test(name) && maxHourPatterns.test(name)) return "weekly";
          if (weeklyPatterns.test(name)) return "weekly";
          if (dailyPatterns.test(name) || maxHourPatterns.test(name)) return "daily";
        }

        if (current.type === "Property" && current.key.type === "Identifier") {
          const name = current.key.name;
          if (/week/i.test(name)) return "weekly";
          if (/daily|day|tag/i.test(name)) return "daily";
        }
      }

      // Check the source line for context
      if (weeklyPatterns.test(line) && maxHourPatterns.test(line)) return "weekly";
      if (dailyPatterns.test(line) || maxHourPatterns.test(line)) return "daily";

      return null;
    }

    return {
      Literal(node) {
        const value = node.value;
        if (typeof value !== "number") return;

        const contextType = getWorkHourContext(node);
        if (!contextType) return;

        if (contextType === "daily" && value > 10 && value <= 24) {
          context.report({
            node,
            messageId: "invalidDailyMax",
            data: { value },
          });
        }

        if (contextType === "weekly" && value > 48 && value <= 168) {
          context.report({
            node,
            messageId: "invalidWeeklyMax",
            data: { value },
          });
        }
      },
    };
  },
};
