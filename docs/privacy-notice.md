# Privacy Notice (Draft for Review)

Employee-facing text for the first-login consent screen. This is a **draft**. Have it reviewed by someone qualified (for example a lawyer or your data protection contact) before use. If the branches operate in the Philippines, check it against the Data Privacy Act of 2012 (RA 10173) and current guidance from the National Privacy Commission. Replace every [PLACEHOLDER].

Version: `notice_version` = `2026-10-v1` (change it whenever the text changes; employees must accept the new version before they can punch).

---

## Screen text (plain language)

### How Jaytees uses your attendance information

[COMPANY LEGAL NAME] ("we") uses the Jaytees attendance app to record when you start and finish work. This page explains what we collect and why.

**What we collect when you tap Time In or Time Out**
- The time of your punch.
- Your phone's location at that moment.
- A photo of your face taken at that moment (a selfie).
- Your name, employee code and branch.
- Short notes you type (for example an errand note).

**What we do not collect**
- We do **not** track your location at any other time.
- We do not read your contacts, messages or other photos.

**Why we collect it**
- To record your working hours and pay you correctly.
- To make sure each punch is made by the right person at the right place.

**Who can see it**
- You can see your own punches and hours at any time.
- Your branch manager (Admin) can see punches and photos for your branch.
- The system administrator can see all branches.
- We do not share your information with others unless the law requires it. [ADD ANY PAYROLL OR OTHER PROCESSOR NAMES]

**How long we keep it**
- Selfie photos are deleted after **60 days**.
- Punch records (times, location and notes) are kept for [RETENTION PERIOD, DECIDED BY THE COMPANY].

**How we protect it**
- Your information is stored securely, protected by access rules and sign-in, and photos are never public.

**Your choices and rights**
- You may ask to see the information we hold about you, ask for corrections, and ask questions about how it is used. Contact [NAME / ROLE] at [CONTACT DETAILS].
- [ADD OTHER RIGHTS OR COMPLAINT CHANNELS REQUIRED BY LAW]

[ ] I have read this and I agree. (button: **I agree**)

If someone does not agree: show "Please speak to your manager." and do not allow punching until the company has resolved it.

---

## Implementation notes (for agents)

- Show this once at first login and again whenever `notice_version` changes.
- Store `profile_id`, `notice_version`, `accepted_at` in `consents`. Do not store IP addresses or device details with it.
- Button and text follow `docs/ui.md` (18 px text, 56 px button, plain language). Keep sentences short; do not turn this into a legal wall of text.
- The text lives in the messages file, not in components, so it can be translated.
- The retention figures here must match `docs/runbooks/photo-purge.md` and the database. If they differ, stop and ask.
- Open decisions that affect this notice: D10 (punch record retention and data contact) in `docs/decisions/README.md`.
