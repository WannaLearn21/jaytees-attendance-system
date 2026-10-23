# Runbook: Lost or Stolen Phone, Forgotten PIN, Suspected Account Misuse

Goal: stop someone else from punching as an employee, quickly, without losing attendance history.

## Who does what

| Situation | Who acts |
| :--- | :--- |
| Employee reports a lost or stolen phone | Branch Admin (or SysAd) |
| Employee forgot their PIN | Branch Admin (or SysAd) |
| Employee suspects someone used their account | Branch Admin, then SysAd reviews |
| An Admin or SysAd account may be compromised | SysAd and the owner |

## A. Employee phone lost or stolen

1. **Confirm identity** in person or by a method the branch already trusts (for example a call to a known number). Do not act on a message alone.
2. Open Staff, find the employee, choose **Deactivate**. This blocks sign-in and stops punches. History stays.
3. Check **Live attendance** and the employee's recent punches for anything the employee did not do since the phone was lost. Note times and selfies.
4. When the employee has a new device: choose **Reactivate**, then **Reset PIN**. Give the one-time PIN in person. The employee signs in and must change it.
5. If punches were made after the loss, a Branch Admin adds corrections (`void` the wrong punches with a reason). Never delete punches.
6. The actions above are audit-logged automatically. Add a short note in the correction reason ("phone stolen, punches voided").

## B. Forgotten PIN

1. Confirm identity.
2. Staff, **Reset PIN**, hand over the one-time PIN in person or by a private message the employee controls.
3. The employee must set a new PIN at first sign-in.

## C. Employee says they did not make a punch

1. Open the punch and view the selfie (signed URL), distance, flags (`duplicate_photo`, `shared_device`, `location_jump`).
2. If the punch is wrong, `void` it through a correction with a reason. If unclear, keep it and note the dispute; the Admin decides.
3. If it looks like someone used the employee's account, follow section A (deactivate, then reset).

## D. Admin or SysAd account possibly compromised

1. SysAd (or the owner) deactivates the account at once.
2. Rotate: the account's password and MFA, and, if a SysAd or the service key may be exposed, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (Vercel environment, then redeploy).
3. Review `audit_log` since the last time you are sure the account was safe: account changes, off-site toggles, corrections, exports, geofence edits. Reverse what is wrong with new records, not deletions.
4. Tell the owner. If employee personal data (photos, locations) may have been accessed, follow the legal notification duties that apply to you, and keep a written timeline.

## After any of these

- Note the date, who acted, and the outcome in `docs/runbooks/incidents/`.
- If the same problem keeps happening, raise it as a decision (`docs/decisions/README.md`).
