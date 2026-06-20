/**
 * @fileoverview ESLint rule: require-auth-middleware
 *
 * LEGAL BASIS: DSGVO (Art. 5, 25, 32) — time entry data is personal data.
 * Every API endpoint that reads or writes time data MUST have authentication.
 * Unauthenticated access to employee time data is a data breach.
 *
 * ENFORCES:
 *   - API route handlers that reference "time", "quoska", "clock", "entry",
 *     "arbeitszeit", "pause", "break", "shift", "attendance" must be wrapped
 *     in or preceded by an auth middleware call.
 *
 * ALLOWS:
 *   - Test files
 *   - Explicitly public endpoints (e.g., /health)
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
        "Time data API endpoints must require authentication — DSGVO",
      category: "Legal Compliance",
      recommended: "error",
    },
    messages: {
      requireAuth:
        "API endpoint handling time data ({{path}}) has no authentication middleware. " +
        "DSGVO requires access control for personal data. " +
        "Add auth middleware (e.g., requireAuth, authenticate, authGuard) before this handler.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Skip test files and non-route files
    if (
      filename.includes(".test.") ||
      filename.includes(".spec.") ||
      filename.includes("/tests/") ||
      filename.includes("/test/")
    ) {
      return {};
    }

    const timeDataPatterns =
      /\b(time|quoska|clock|entry|arbeitszeit|pause|break|shift|attendance)\b/i;
    const authMiddlewareNames =
      /\b(auth|requireAuth|authenticate|authGuard|isAuthenticated|verifyToken|checkAuth|jwt|session)\b/i;

    function hasAuthInCallChain(node) {
      // Check if the route definition includes auth middleware
      // Pattern: app.get('/path', authMiddleware, handler)
      // or: router.use(authMiddleware)
      if (!node) return true; // Can't determine — don't flag

      // Walk up to find the route call with middleware args
      let current = node;
      while (current.parent) {
        current = current.parent;
        if (
          current.type === "CallExpression" &&
          current.callee.type === "MemberExpression"
        ) {
          const method = current.callee.property;
          if (
            method.type === "Identifier" &&
            ["get", "post", "put", "patch", "delete", "use"].includes(
              method.name
            )
          ) {
            // Check arguments for auth middleware
            for (const arg of current.arguments) {
              if (arg.type === "Identifier" && authMiddlewareNames.test(arg.name)) {
                return true;
              }
              if (
                arg.type === "CallExpression" &&
                arg.callee.type === "Identifier" &&
                authMiddlewareNames.test(arg.callee.name)
              ) {
                return true;
              }
              if (
                arg.type === "MemberExpression" &&
                arg.property.type === "Identifier" &&
                authMiddlewareNames.test(arg.property.name)
              ) {
                return true;
              }
            }
            // Found the route call, no auth middleware detected
            return false;
          }
        }
      }
      return true; // Can't determine — don't flag
    }

    return {
      CallExpression(node) {
        // Match route definitions: app.get('/time/...', handler) etc.
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          ["get", "post", "put", "patch"].includes(node.callee.property.name)
        ) {
          // Check if path contains time-related keywords
          const pathArg = node.arguments[0];
          if (
            pathArg &&
            pathArg.type === "Literal" &&
            typeof pathArg.value === "string" &&
            timeDataPatterns.test(pathArg.value)
          ) {
            // Check for auth middleware in arguments
            const hasAuth = node.arguments.some((arg) => {
              if (arg.type === "Identifier")
                return authMiddlewareNames.test(arg.name);
              if (arg.type === "CallExpression" && arg.callee.type === "Identifier")
                return authMiddlewareNames.test(arg.callee.name);
              if (
                arg.type === "CallExpression" &&
                arg.callee.type === "MemberExpression" &&
                arg.callee.property.type === "Identifier"
              )
                return authMiddlewareNames.test(arg.callee.property.name);
              if (arg.type === "MemberExpression" && arg.property.type === "Identifier")
                return authMiddlewareNames.test(arg.property.name);
              return false;
            });

            if (!hasAuth) {
              context.report({
                node,
                messageId: "requireAuth",
                data: { path: pathArg.value },
              });
            }
          }
        }
      },
    };
  },
};
