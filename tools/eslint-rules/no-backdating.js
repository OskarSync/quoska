/**
 * @fileoverview ESLint rule: no-backdating
 *
 * LEGAL BASIS: ArbZG — time entries must be "tagesaktuell" (current-day).
 * Employees cannot create or modify time entries for dates in the past.
 * Only managers with explicit audit-trail reasons may correct past entries.
 *
 * ENFORCES:
 *   - No `date` or `startTime` parameter that is set from user input without
 *     server-side validation.
 *   - Flags direct assignment of user-provided dates to time entry fields.
 *
 * ALLOWS:
 *   - Server-generated timestamps (serverTimestamp(), etc.)
 *   - Manager correction endpoints (path contains "correction" or "admin")
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
        "Warn about potential backdating of time entries — ArbZG requires tagesaktuell entries",
      category: "Legal Compliance",
      recommended: "warn",
    },
    messages: {
      noBackdating:
        "Potential backdating detected: user-provided value '{{param}}' " +
        "assigned to time entry date field. " +
        "ArbZG requires tagesaktuell entries. Use server-side date validation " +
        "or restrict to current day only.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Skip test files, server files, and correction endpoints
    if (
      filename.includes(".test.") ||
      filename.includes(".spec.") ||
      filename.includes("/tests/") ||
      filename.includes("/test/") ||
      filename.includes("correction") ||
      filename.includes("admin")
    ) {
      return {};
    }

    const dateFieldNames = new Set([
      "date",
      "startTime",
      "endTime",
      "start_time",
      "end_time",
      "datum",
      "beginn",
      "ende",
      "checkIn",
      "checkOut",
      "check_in",
      "check_out",
    ]);

    const userInputPatterns = /\b(req|request|body|params|query|input|data|payload)\b/;

    return {
      // Detect: entry.date = req.body.date
      AssignmentExpression(node) {
        if (
          node.left.type === "MemberExpression" &&
          node.left.property.type === "Identifier" &&
          dateFieldNames.has(node.left.property.name) &&
          node.right.type === "MemberExpression"
        ) {
          // Trace back to see if source is user input
          let source = node.right;
          let isUserInput = false;
          while (source.object) {
            if (
              source.object.type === "Identifier" &&
              userInputPatterns.test(source.object.name)
            ) {
              isUserInput = true;
              break;
            }
            source = source.object;
          }

          if (isUserInput) {
            context.report({
              node,
              messageId: "noBackdating",
              data: { param: node.left.property.name },
            });
          }
        }
      },
    };
  },
};
