/**
 * Index file for Quoska custom ESLint rules.
 *
 * Each rule encodes a legal requirement from German labor law (ArbZG),
 * audit-proofing requirements (Revisionssicherheit / GoBD), or DSGVO.
 *
 * Reference: HARNESS_ENGINEERING.md — Technique 3
 */

"use strict";

module.exports = {
  rules: {
    "no-client-timestamps": require("./no-client-timestamps"),
    "no-hard-delete": require("./no-hard-delete"),
    "require-auth-middleware": require("./require-auth-middleware"),
    "require-audit-fields": require("./require-audit-fields"),
    "no-backdating": require("./no-backdating"),
    "enforce-break-rules": require("./enforce-break-rules"),
    "enforce-max-working-hours": require("./enforce-max-working-hours"),
    "enforce-rest-period": require("./enforce-rest-period"),
    "no-cross-layer-imports": require("./no-cross-layer-imports"),
  },
};
