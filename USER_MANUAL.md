# ePESO User Manual

## How to Use This Manual

Each section below covers one module. If you're new, read **Security** and **Employment Facilitation** first — the patterns you learn there (adding, editing, searching, filtering, the Recycle Bin, status badges) repeat throughout the rest of the system.

Every module section follows the same layout: **Required Fields**, **How to Add**, **Available Actions**, and **Status Flow** (where the module has one).

---

## 1. Security — User Management

The **System Users** tab (under Security) is where staff accounts are created and managed.

### Roles: Administrator vs Staff

| Role | Access |
|---|---|
| **Administrator** | Full access to every module automatically — nothing to configure. |
| **Staff** | Access is set module-by-module, as either **Viewer** (can look but not change anything) or **Editor** (can add, edit, and delete). |

The **Security** module itself is always Administrator-only — a Staff account can never be given access to User Management, no matter what.

### How to Add a New User

1. Click **Add User**.
2. Fill in their **First Name, Last Name, Username,** and a **Password**.
3. Choose their **Role** — Administrator or Staff.
4. If Staff, go through the module list and set each one to **Viewer** or **Editor** (Administrators skip this step).
5. Confirm — the account is created as **Active**.

### How to Edit a User / Change a Password

1. Open a user from the list.
2. Update their details or permissions the same way as when adding one.
3. To change their password, turn on the **Change Password** toggle first — leaving it off keeps their existing password unchanged.
4. Save.

### How to Delete a User

1. Open the user's delete action — a confirmation prompt appears first, since this can't be undone.
2. Confirm.

Note: the system won't let you delete the **last remaining Administrator account** — there always needs to be at least one.

### Permission Cheat-Sheet

Each of the following can be set to **Viewer** or **Editor** for a Staff account:

Employment Facilitation · CDSP · GIP · SPES · Livelihood · Skills Training · OFW · Documents · Maintenance · Security (Administrator-only) · Report

---

## 2. Employment Facilitation

Employment Facilitation is where jobseekers get registered, matched to employers, and tracked from application through hiring. It has five tabs: **Applicants**, **Vacancies**, **Referrals**, **Placements**, and **Employers**.

### Applicants

**Required fields to save:**
- Surname
- First Name
- Date of Birth
- Sex
- Civil Status
- Contact Number
- Province, City/Municipality, and Barangay

Everything else (job preference, education, training, work experience, document attachments) can be filled in now or added later.

**How to add an applicant:**
1. Click **Add Applicant**.
2. Work through the step-by-step form — personal info, job preference, education, training, work experience, and document attachments.
3. Fill in at least the required fields above, then save. Incomplete sections can be finished later via Edit.

**Available actions (⋯ menu on any applicant):**
- **View** — see the full profile.
- **Edit** — update any section.
- **Employment History** — see their referral/placement history.
- **Refer** — send them to an open vacancy.
- **Delete** — moves them to the Recycle Bin (see Good to Know).

**Other tools on this tab:**
- **Import** — bulk-add applicants from an Excel/CSV file (downloadable template provided).
- **Export** — download the current list as Excel or CSV.
- **Resume Builder** — generate a printable resume from an existing applicant's saved information.

### Employers

**Required fields to save:**
- Company Name
- TIN Number
- Contact person's Full Name and Contact Number
- Street, Province, City/Municipality, and Barangay

**How to add an employer:**
1. Click **Add Employer**.
2. Fill in company info, a contact person, and an address.
3. Save.

Editing an existing employer reveals an extra **Job Openings** section, where you can list the positions they're hiring for.

### Vacancies

**How to add a vacancy:**
1. Click **Add Vacancy**.
2. Fill in the job title, employer, number of openings, job type, salary range, and requirements.
3. Save — it starts as **Open**.

**Available actions (⋯ menu on any vacancy):**
- **View** / **Edit**
- **Match** — browse applicants and refer one straight to this vacancy.
- **Close** / **Open** — closing only stops it from accepting new applicants; nothing is deleted.

### Referrals

Referrals are created from an applicant's **Refer** action or a vacancy's **Match** screen — you don't add them directly here.

**Status flow:**
1. **Pending** (starting status)
2. Update to **Interviewed**, **Not Hired**, or **Hired**

Marking someone **Hired** automatically removes them from this list and creates a matching record in **Placements** — no extra step needed. If you try to refer someone already referred (or placed) with the same employer for the same position, the system warns you first in case it's a duplicate.

### Placements

**Status flow:** one of **Active**, **Resigned**, **Terminated**, or **Completed**.

**Available actions:**
- **Update Status** — change the current status.
- **Record Promotion** — log a new job title, date, and salary. The original hire record is kept; the displayed position updates.

### Quick Workflow: From Applicant to Placement

1. **Add** the jobseeker under Applicants.
2. **Refer** them to an open vacancy (from their ⋯ menu, or from a vacancy's Match screen).
3. The referral starts as **Pending** — update it as things progress (**Interviewed**, then **Hired** or **Not Hired**).
4. Marking a referral **Hired** automatically creates a **Placement** for them.
5. Track their employment status in Placements, and log **Record Promotion** whenever their role or salary changes.

---

## 3. CDSP

CDSP registers jobseekers for career-coaching services (like Career Coaching or Pre-Employment Coaching) and schedules them into sessions run by a facilitator.

### Managing Applicant Profiles

**Required fields to save:**
- Last Name, First Name, Sex, Birthdate, Civil Status, Barangay
- **CDSP Service Availed** — required even though it has no red asterisk (see Good to Know)

**Status:** **Active** or **Inactive** — set automatically based on whether the applicant is currently assigned to an activity. There's no manual switch for it.

### CDSP Maintenance: Activities

**Activity fields:** title, date, location, facilitator, counselor, capacity.

**How to add an activity:**
1. Go to Maintenance → CDSP.
2. Click to add a new activity and fill in the fields above.
3. Save — it starts as **Planned**.

**Status flow:**
1. **Planned** (start)
2. **Ongoing** (via ⋯ menu)
3. **Completed** (via ⋯ menu)

**Assigning/unassigning applicants:** done from the CDSP applicant list itself (not from Maintenance), and only while the activity is still **Planned**. Once Completed, applicants stay locked to it.

**Things unique to CDSP:**
- Attendance can be marked **Present** or **Absent** while an activity is **Ongoing**.
- An activity can't be marked **Completed** until every participant's attendance has been recorded.

**Deleting an activity:** blocked only while applicants are still actively enrolled (Planned or Ongoing). Once Completed, it can be deleted freely.

---

## 4. GIP

GIP (Government Internship Program) places applicants into paid internships with partner government offices, organized into **Batches**.

### Managing Applicant Profiles

**Required fields to save:**
- Last Name, First Name, Sex, Birthdate, Civil Status, Barangay
- At least one **Classification** checked
- **School/University** filled in

(This is the strictest of the three profile forms — CDSP/GIP/SPES.)

**Status:** **Active**, **Inactive**, or **Completed** — set automatically based on the assigned batch's status, not manually.

### GIP Maintenance: Batches

**Batch fields:** assigned government office, deployment location, supervisor, number of slots, funding source, start/end dates, monthly allowance.

**Status flow:**
1. **Planned** (start)
2. **Ongoing** (via ⋯ menu)
3. **Completed** (via ⋯ menu) — automatically marks every assigned applicant **Completed** too
4. **Reopen** — reverts assigned applicants back to **Active**

**Assigning/unassigning applicants:** from the GIP applicant list, only while the batch is still **Planned**.

**Deleting a batch:** blocked if **any** applicant was ever assigned to it — even in the past — since the batch link is the only record that the internship happened.

---

## 5. SPES

SPES (Special Program for Employment of Students) places student applicants into temporary employment with host employers, also organized into **Batches**.

### Managing Applicant Profiles

**Required fields to save:**
- Last Name, First Name, Sex, Birthdate, Civil Status, Barangay

(The simplest of the three profile forms — school, income, and classification details are optional.)

**Status:** **Active**, **Inactive**, or **Completed** — works exactly like GIP, driven automatically by the assigned batch.

### SPES Maintenance: Batches

**Batch fields:** available slots, program start/end dates, participating employer, deployment location, program coordinator, funding source.

**Status flow:** same as GIP — **Planned → Ongoing → Completed**, with the same Planned-only assign/unassign rule.

**Deleting a batch:** blocked the same way as GIP — if any applicant was ever linked to it, current or past.

---

## 6. Livelihood

Livelihood is an umbrella over four separate sub-programs, each with its own applicant list and its own record type in Maintenance:
- **DILEEP – DILP** → tracks a **Project**
- **DILEEP – TUPAD** → tracks a **Project**
- **SLP** → tracks a **Project**
- **CLPEP** → tracks an **Intervention** (no cash assistance component — see Quirks)

### Managing Beneficiary Profiles

**Required fields to save (all four programs):**
- Last Name, First Name, Sex, Birthdate, Barangay
- Civil Status — required for DILP, TUPAD, and SLP (CLPEP's form skips this field, since it also covers minors/child-labor cases)

**Status:** **Inactive**, **Active**, or **Completed** — never set manually, derived automatically:

| Assignment | Beneficiary Status |
|---|---|
| Not assigned to any project/intervention | Inactive |
| Assigned to a **Planned** or **Ongoing** one | Active |
| Assigned to a **Completed** one | Completed |

### Livelihood Maintenance: Projects & Interventions

One shared Maintenance screen handles all four programs.

**How to add a project/intervention:**
1. Go to Maintenance → Livelihood.
2. Pick a **Service Type**: DILEEP (DILP), DILEEP (TUPAD), SLP, or CLPEP — the form below switches to match.
3. Fill in that program's fields (see table below).
4. Save — it starts as **Planned**.

**Fields by program:**

| Program | Distinct fields | Assistance Amount / Release Date? |
|---|---|---|
| DILP | Project ID Number, Project Type, Program Component, Implementation Type | Yes |
| TUPAD | Location, Facilitator | Yes |
| SLP | Location, Facilitator, SLP Track | Yes |
| CLPEP | Intervention Category, Target Beneficiaries, Implementing Officer, Partner Agency | **No — non-cash program** |

**Status flow (all four):**
1. **Planned** (start)
2. **Ongoing** (via ⋯ menu)
3. **Completed** (via ⋯ menu)
4. **Reopen** — sends it back to **Planned**

**How to assign a beneficiary:**
1. Go to the applicant list for that program (not Maintenance).
2. Use the row's **Assign Project** / **Assign Intervention** action.
3. Only projects/interventions still **Planned** are selectable.

**Program-specific assignment rules:**
- **SLP** — you can only assign to a project matching the beneficiary's own **SLP Track**, and their **Assessment Result** must be **Qualified** first.
- **TUPAD, SLP, CLPEP** — a project/intervention stops accepting new assignments once it reaches its target beneficiary count.
- **DILP** — one-time only: once a DILP beneficiary has ever been assigned a project, they can't be reassigned again, even after it's Completed.
- **TUPAD, SLP, CLPEP** — allow a fresh assignment once the current one is Completed, and keep a running history viewable via **View Assignment History**.

**Unassigning/changing an assignment:** only possible while the project/intervention is still **Planned** — once it moves past Planned, that link is locked in as the permanent record of what happened.

**Deletion rules:**
- **Project/Intervention** — blocked while any beneficiary is currently assigned to it.
- **Beneficiary** — blocked while actively tied to a **Planned** or **Ongoing** assignment.

---

## 7. Skills Training

Skills Training registers applicants for skills trainings and schedules them into sessions, organized into **Batches** (just a label, e.g. "BATCH-004") containing individual **Trainings**.

### Managing Applicant Profiles

**Required fields to save:**
- Last Name, First Name, Sex, Birthdate, Civil Status, Barangay

Classification, Desired Qualification, and Purpose of Training are all checkbox groups, each with an "Others, please specify" option that supports multiple custom entries.

**Status:** **Waitlisted** or **Accepted** only — set manually, not derived.

**How to change status:**
- Option A: open the full **Edit** form and change the Status field.
- Option B (faster): use **Update Status** from the ⋯ menu — opens a small dropdown-only modal instead of the whole profile form.

### Skills Training Maintenance: Batches & Trainings

**How to add a batch:**
1. Go to Maintenance → Skills Training.
2. Click to add a batch and give it a name (e.g. "BATCH-004").
3. Save.

**How to add a training:**
1. Select the batch it belongs to.
2. Fill in title, date, location, facilitator, and a target number of participants.
3. Save — it starts as **Planned**.

**Status flow:**
1. **Planned** (start)
2. **Ongoing** — via ⋯ menu, **blocked if 0 participants are assigned** (set a slot count and assign someone first)
3. **Completed** — via ⋯ menu, **blocked if any assigned participant's attendance hasn't been marked** Present or Absent yet (the system shows how many are unmarked and jumps you to the Attendance screen)
4. **Reopen** — sends it back to **Planned**

**How to assign a participant:**
1. From the applicant list, use **Assign Training**.
2. Only trainings that are still **Planned** and have an actual slot count set (not 0) are selectable.
3. A training with 0 slots shows as disabled with a note to set a slot count in Maintenance first.

**Unassigning:** only works while the training is still **Planned** — once it starts, the assignment is locked in.

---

## 8. OFW Services

OFW Services handles requests for assistance from Overseas Filipino Workers and their families — everything from employment referrals to OWWA benefits claims.

### Managing OFW Requests

**Required fields to save:**
- First Name, Last Name, Sex, Birthdate, Civil Status, Barangay
- Employment Status, Reference Number, Date Filed

(Reference Number auto-suggests a value but stays editable.)

**How to add a request:**
1. Click **Add Request**.
2. Fill in the required fields above.
3. Check off one or more **Type of Request** options (17 total, e.g. employment referral, skills training, OWWA Welfare Case).
4. Fill in any extra fields that appear (see table below).
5. Save — status starts as **Pending**.

**Conditional fields by Type of Request:**

| Type of Request checked | Extra fields shown |
|---|---|
| Employment Referral | Desired Position, Type of Skill, repeatable Agency list |
| OWWA Welfare Case | Form attachment slot |
| Inquiry | "Please Specify" text box |
| Other DOLE Program | "Please Specify" text box |
| Livelihood | 5 named ELPOR form attachment slots (A, A2, B, B1, C) |

None of these extra attachments are required to save.

**Status flow (set manually):**
1. **Pending** (start)
2. **Approved** — or **Rejected** (terminal)
3. **Ongoing** ("Start Processing")
4. **Completed** (terminal)

Note: on the request list, Employment Referral's Desired Position and Type of Skill show as subtext under the Type of Request column, rather than as their own columns.

---

## 9. Reports

Reports gives you access to every module's data in one place. **General PESO Report** is a separate cross-program summary still being finalized and isn't covered here.

### How to Generate a Report

1. Pick a **Report Category**: Employment Facilitation, CDSP, GIP, SPES, Livelihood, Skills Training, or OFW Services.
2. If the category offers one, pick a **Report Type** (see table below).
3. Set a **Report Period**: Monthly, Annual, or Custom Range.
4. Click **Generate Report**.

**Report Type options by category:**

| Category | Report Type choices |
|---|---|
| CDSP | Participant List vs. Activity List |
| GIP | Participant List vs. Batch List |
| SPES | Participant List vs. Batch List |
| Livelihood | Pick **Program Type** first (All Programs, DILP, TUPAD, SLP, or CLPEP), then Beneficiary List vs. Project/Intervention List |
| Skills Training | Participant List vs. Training List |
| OFW Services | No Report Type choice — every request is one row |
| Employment Facilitation | No on-screen report — see note below |

**Employment Facilitation is the one exception:** clicking Generate Report doesn't show a preview at all — it downloads the official PESO LMI/SPRS report directly as a formatted Excel file.

### Working with a Generated Report

- **Columns** — show or hide individual fields. Status is available but hidden by default everywhere.
- **Export** — download as:
  - **Excel** — detailed table + a Summary section
  - **PDF** — detailed table + a Summary section
  - **CSV** — data only, no summary
- **Per-row roster export** — available for CDSP's Activity List, GIP/SPES's Batch List, Livelihood's Project/Intervention List, and Skills Training's Training List. Each row has its own **Export Attendees / Interns / Students / Beneficiaries / Trainees** action to download just that one session/batch/project/training's roster.

---

## Good to Know

A few things that work the same way across CDSP, GIP, SPES, Livelihood, Skills Training, and Employment Facilitation.

### Status Badges

| Program | Activity/Batch/Project/Training status | Applicant status | Set how? |
|---|---|---|---|
| CDSP, GIP, SPES, Livelihood, Skills Training | Planned, Ongoing, Completed | Active / Inactive (+ Completed where batched) | Automatic |
| Skills Training | — | Waitlisted / Accepted | Manual |
| OFW Services | Pending, Approved, Ongoing, Completed, Rejected | — | Manual |

### The Recycle Bin

1. Deleting an applicant, beneficiary, employer, or referral doesn't erase it right away — it moves to the Recycle Bin.
2. Find it under **Security → Activity Logs → Recycle Bin**.
3. From there, **Restore** it or **Permanently Delete** it.

Note: the bin shows a countdown, but nothing is deleted automatically when it reaches zero — records stay there until someone chooses to restore or permanently delete them, so it's worth checking in on periodically to keep it tidy.

### Deleting Applicants — When It's Blocked

You can't delete an applicant who's actively tied up in an assignment. The exact rule differs slightly by program:

| Program(s) | Blocked when... |
|---|---|
| CDSP, Livelihood, Skills Training | Currently enrolled in a **Planned** or **Ongoing** activity/project/training. Once Completed, deletion is allowed. |
| GIP, SPES | Was **ever** linked to a batch, even one that finished long ago — since that link is the only record the assignment happened. |

### A Few Small Quirks

- On the CDSP profile form, **CDSP Service Availed** is required to save, even though it isn't marked with a red asterisk like the other required fields. If Save doesn't seem to work, check that field first.

---

## NOTES

CURRENTLY WORKING (Ready for Testing)
1. Employment Facilatation
2. User Management/Adding User
3. CDSP
4. GIP
5. SPES
6. Livelihood (Sprint 3)
7. Skills Training (Sprint 3)
8. OFW (Sprint 3)
9. Reports (EF, CDSP, GIP, SPES, Livelihood, Skills Training, OFW)

On-Progress (Not Yet Done)
1. General PESO Report (cross-program summary report)
2. Documents
3. Activity Logs
