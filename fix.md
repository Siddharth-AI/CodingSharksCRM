# CRM-Side Fixes Required

This frontend (Next.js) only **forwards leads** to CRM at:
`POST ${NEXT_PUBLIC_CRM_API_URL}/api/public/leads`
(via proxy `src/app/api/leads/route.ts`)

Frontend is NOT able to:
- Check if mobile already exists in DB
- Send SMS

These must be done in CRM. List below.

---

## 1. Mobile Number Dedup Check

When a lead hits `/api/public/leads`:

```
1. Sanitize mobile → 10 digits, strip +91
2. Lookup: SELECT id FROM leads WHERE mobile = ?
3. If exists:
   - Do NOT create duplicate row (or update existing meta)
   - Set flag isNewLead = false
   - DO NOT send SMS
4. If not exists:
   - Create new lead row
   - Set flag isNewLead = true
   - Trigger SMS (see #2)
```

### Response shape (recommended)

```json
{
  "success": true,
  "data": { "leadId": "...", "isNewLead": true },
  "error": null
}
```

Frontend already expects `{ success, error }` — extending with `data.isNewLead` is backward-compatible.

---

## 2. SMS Trigger — only NEW numbers

```
if (isNewLead) {
  await smsProvider.send({
    to: mobile,
    template: "WELCOME_LEAD",
    vars: { name }
  });
}
```

- Use whichever provider you have (MSG91 / Textlocal / Twilio / Gupshup).
- Wrap in try/catch — SMS failure must NOT fail the lead creation.
- Log SMS attempts (`sms_log` table: leadId, mobile, status, providerMsgId, sentAt).

---

## 3. Server-Side Mobile Validation (defense in depth)

Frontend already validates `^[6-9]\d{9}$`. Backend must validate same:

```
const MOBILE_REGEX = /^[6-9]\d{9}$/;
if (!MOBILE_REGEX.test(sanitized)) {
  return 400 { success: false, error: "Invalid mobile number" }
}
```

Reject anything that does not match — bot/spam guard.

---

## 4. Email + Name Validation

- Email: standard RFC pattern, lowercase before storing.
- Name: trim, length ≥ 2, letters/spaces/`.`/`'`/`-` only.
- Reject otherwise with 400.

---

## 5. Rate Limiting (recommended)

Per IP: 5 lead submits / 10 min.
Per mobile: 3 submits / hour.
Returns 429 with `Retry-After` header.

---

## 6. Audit Trail

Even when `isNewLead = false`, log the touch:

```
lead_touches (
  id, leadId, source, page, ip, userAgent, createdAt
)
```

So marketing knows the same number filled multiple forms.

---

## Frontend Changes Already Done

- `src/lib/validators.ts` — shared mobile/email/name validators
- All forms now validate before submit:
  - `src/components/common/lead-modal.tsx`
  - `src/components/pages/workshop/shared/registration-modal.tsx`
  - `src/components/pages/home/book-live-class-section.tsx`
  - `src/components/pages/counseling/counseling-cta.tsx`
  - `src/components/pages/insta/insta-prompt-source-page.tsx`
  - `src/components/pages/courses/course-detail-page.tsx` (HeroForm)
- Mobile rule: 10 digits, must start with 6/7/8/9
- Phone input: `inputMode="numeric"`, `maxLength=10`, digits-only on change

---

## Action Items for CRM Team

- [ ] Add mobile dedup check on `POST /api/public/leads`
- [ ] Add `isNewLead` flag in response
- [ ] Wire SMS trigger ONLY when `isNewLead === true`
- [ ] Server-side validation (mobile/email/name) — match frontend rules
- [ ] Rate limiting on lead endpoint
- [ ] `sms_log` + `lead_touches` audit tables
