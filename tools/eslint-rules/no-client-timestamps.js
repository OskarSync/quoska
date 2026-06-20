/**
 * @fileoverview ESLint rule: no-client-timestamps
 *
 * LEGAL BASIS: §16 ArbZG — timestamps must be server-generated to be
 * revisionssicher (audit-proof). Client clocks can be manipulated.
 *
 * BANS:
 *   - Date.now()
 *   - new Date()
 *   - performance.now() used for timestamps
 *   - Any third-party date library calls (moment(), dayjs()) used for timestamp creation
 *
 * ALLOWS:
 *   - Server-side timestamp utilities (files matching *.server.ts or in server/ dirs)
 *   - Display formatting of dates (formatDate, toLocaleDateString, etc.)
 *   - Test files
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
        "Ban client-side timestamp creation — ArbZG requires server-side timestamps",
      category: "Legal Compliance",
      recommended: "error",
    },
    messages: {
      noClientTimestamp:
        "Client-side timestamp detected ({{name}}). " +
        "ArbZG §16 requires server-generated timestamps for revisionssicherheit. " +
        "Use a server-side timestamp API instead.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Skip server-side files and tests
    if (
      filename.includes(".server.") ||
      filename.includes("/server/") ||
      filename.includes("/server\\") ||
      filename.includes(".test.") ||
      filename.includes(".spec.") ||
      filename.includes("/tests/") ||
      filename.includes("/test/")
    ) {
      return {};
    }

    const bannedCalls = new Set([
      "Date.now",
      "Date.now()",
      "new Date",
    ]);

    const bannedGlobalCalls = new Set(["moment", "dayjs"]);

    return {
      // Date.now()
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "Date" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "now"
        ) {
          context.report({
            node,
            messageId: "noClientTimestamp",
            data: { name: "Date.now()" },
          });
        }

        // moment(), dayjs()
        if (
          node.callee.type === "Identifier" &&
          bannedGlobalCalls.has(node.callee.name)
        ) {
          context.report({
            node,
            messageId: "noClientTimestamp",
            data: { name: `${node.callee.name}()` },
          });
        }
      },

      // new Date()
      NewExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "Date"
        ) {
          context.report({
            node,
            messageId: "noClientTimestamp",
            data: { name: "new Date()" },
          });
        }
      },
    };
  },
};
