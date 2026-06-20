/**
 * @fileoverview ESLint rule: no-hard-delete
 *
 * LEGAL BASIS: Revisionssicherheit (audit-proof record keeping) requires
 * that original time entries are never destroyed. All corrections must be
 * soft-deletes with an audit trail (who changed what, when, and why).
 *
 * BANS:
 *   - SQL DELETE statements on time-entry tables
 *   - ORM `.delete()`, `.destroy()`, `.remove()` on time-entry models
 *   - Prisma `delete()`, `deleteMany()` on time-entry models
 *
 * ALLOWS:
 *   - Soft-delete patterns (setting `deletedAt`, `status: 'deleted'`)
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
        "Ban hard-deletes on time entry data — Revisionssicherheit requires soft-delete with audit trail",
      category: "Legal Compliance",
      recommended: "error",
    },
    messages: {
      noHardDelete:
        "Hard delete detected on '{{method}}'. " +
        "Revisionssicherheit requires soft-delete with audit trail. " +
        "Use .update({ deletedAt: serverTimestamp() }) instead.",
      noSqlDelete:
        "SQL DELETE statement detected. " +
        "Revisionssicherheit forbids hard-deleting time entries. " +
        "Use UPDATE ... SET deleted_at = $1 instead.",
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

    const deleteMethods = new Set(["delete", "deleteMany", "destroy", "remove", "forceDelete"]);
    const timeEntryModels =
      /\b(TimeEntry|timeEntry|time_entry|Quoska|stamp|ClockEntry|WorkSession|ShiftEntry|clockEntry|workSession|shiftEntry)\b/i;

    return {
      // ORM calls: model.delete(), model.destroy(), prisma.timeEntry.delete()
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          deleteMethods.has(node.callee.property.name)
        ) {
          // Only flag if the model name looks like a time-entry model
          let modelName = "";
          if (node.callee.object.type === "Identifier") {
            modelName = node.callee.object.name;
          } else if (
            node.callee.object.type === "MemberExpression" &&
            node.callee.object.property.type === "Identifier"
          ) {
            modelName = node.callee.object.property.name;
          }

          if (timeEntryModels.test(modelName)) {
            context.report({
              node,
              messageId: "noHardDelete",
              data: { method: node.callee.property.name },
            });
          }
        }
      },

      // SQL template literals: `DELETE FROM ...`
      TaggedTemplateExpression(node) {
        if (
          node.tag.type === "Identifier" &&
          node.tag.name === "sql"
        ) {
          const quasi = node.quasi.quasis[0];
          if (quasi && /DELETE\s+FROM/i.test(quasi.value.raw)) {
            context.report({
              node,
              messageId: "noSqlDelete",
            });
          }
        }
      },
    };
  },
};
