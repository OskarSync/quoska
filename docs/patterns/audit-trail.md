# Pattern: Audit Trail

**owner:** oskar  
**last_verified:** 2026-05-12  

---

## When to Use

Every mutation (create, update, delete, pause, resume) on a `time_entry` record.

## Implementation

### 1. Service Layer

Every service function that mutates `time_entries` must:

1. Perform the mutation
2. Write a corresponding audit record
3. Both in the same transaction (atomic)

```typescript
// src/services/timeEntryService.ts

async function clockOut(
  tenantId: UUID,
  employeeId: UUID,
  timeEntryId: UUID
): Promise<TimeEntry> {
  return await db.transaction(async (tx) => {
    // 1. Update the time entry
    const entry = await tx
      .from('time_entries')
      .update({ clock_out: sql`NOW()`, status: 'completed' })
      .eq('id', timeEntryId)
      .eq('tenant_id', tenantId)
      .returning('*')
      .single();

    // 2. Write audit record
    await tx.from('time_entry_audit').insert({
      time_entry_id: timeEntryId,
      tenant_id: tenantId,
      changed_by: employeeId,
      action: 'update',
      field_name: 'clock_out',
      old_value: null,  // was null (running)
      new_value: entry.clock_out,
      reason: 'Clock out',
      changed_at: sql`NOW()`,
    });

    return entry;
  });
}
```

### 2. Manager Edit (with reason)

```typescript
async function editTimeEntry(
  tenantId: UUID,
  managerId: UUID,
  timeEntryId: UUID,
  changes: { field: string; newValue: any },
  reason: string  // REQUIRED for manager edits
): Promise<TimeEntry> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('Reason is required for time entry edits (min 5 chars)');
  }

  return await db.transaction(async (tx) => {
    // 1. Get current value
    const current = await tx
      .from('time_entries')
      .select(changes.field)
      .eq('id', timeEntryId)
      .eq('tenant_id', tenantId)
      .single();

    // 2. Update
    const entry = await tx
      .from('time_entries')
      .update({ [changes.field]: changes.newValue, updated_at: sql`NOW()` })
      .eq('id', timeEntryId)
      .eq('tenant_id', tenantId)
      .returning('*')
      .single();

    // 3. Audit
    await tx.from('time_entry_audit').insert({
      time_entry_id: timeEntryId,
      tenant_id: tenantId,
      changed_by: managerId,
      action: 'update',
      field_name: changes.field,
      old_value: JSON.stringify(current[changes.field]),
      new_value: JSON.stringify(changes.newValue),
      reason,
      changed_at: sql`NOW()`,
    });

    return entry;
  });
}
```

### 3. Soft Delete

```typescript
async function deleteTimeEntry(
  tenantId: UUID,
  managerId: UUID,
  timeEntryId: UUID,
  reason: string
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .from('time_entries')
      .update({ deleted_at: sql`NOW()` })
      .eq('id', timeEntryId)
      .eq('tenant_id', tenantId);

    await tx.from('time_entry_audit').insert({
      time_entry_id: timeEntryId,
      tenant_id: tenantId,
      changed_by: managerId,
      action: 'delete',
      field_name: 'deleted_at',
      old_value: null,
      new_value: 'now',
      reason,
      changed_at: sql`NOW()`,
    });
  });
}
```

## Database Constraints

```sql
-- Audit table is INSERT-only
CREATE POLICY "audit_insert_only" ON time_entry_audit
  FOR INSERT WITH CHECK (true);  -- anyone authenticated can insert

CREATE POLICY "audit_no_update" ON time_entry_audit
  FOR UPDATE USING (false);  -- block updates

CREATE POLICY "audit_no_delete" ON time_entry_audit
  FOR DELETE USING (false);  -- block deletes

-- Time entries: soft delete only
ALTER TABLE time_entries ADD COLUMN deleted_at timestamptz;
-- No hard delete possible through application
```

## Testing

```typescript
// tests/legal/revisionssicherheit.test.ts

test('clocking out creates an audit record', async () => {
  const entry = await clockOut(tenantId, employeeId, timeEntryId);

  const audit = await getAuditRecord(timeEntryId, 'update', 'clock_out');
  expect(audit).toBeDefined();
  expect(audit.old_value).toBeNull();
  expect(audit.new_value).toBe(entry.clock_out);
});

test('manager edit requires reason', async () => {
  await expect(
    editTimeEntry(tenantId, managerId, entryId, { field: 'clock_in', newValue: '...' }, '')
  ).rejects.toThrow('Reason is required');
});

test('hard delete is blocked at DB level', async () => {
  await expect(
    db.from('time_entries').delete().eq('id', entryId)
  ).rejects.toThrow(); // RLS blocks this
});

test('audit records cannot be updated', async () => {
  await expect(
    db.from('time_entry_audit').update({ old_value: 'tampered' }).eq('id', auditId)
  ).rejects.toThrow();
});
```
