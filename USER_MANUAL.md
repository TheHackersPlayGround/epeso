# ePESO User Manual

## How to Use This Manual

Each section below covers one module. If you're new, read Employment Facilitation and Security first — the patterns you learn there (adding, editing, searching, filtering, the Recycle Bin, status badges) repeat throughout the rest of the system.

---

## 1. Employment Facilitation

Employment Facilitation is where jobseekers get registered, matched to employers, and tracked from application through hiring. It has five tabs: **Applicants**, **Vacancies**, **Referrals**, **Placements**, and **Employers**.

### Applicants

The master list of jobseekers registered with the PESO office. Use **Add Applicant** to open a step-by-step form (personal info, job preference, education, training, work experience, and document attachments). You don't need to fill in everything to save — only **Surname, First Name, Date of Birth, Sex, Civil Status, Contact Number**, and the applicant's **Province, City/Municipality, and Barangay** are required. Everything else can be added or completed later.

From the ⋯ menu on any applicant you can **View**, **Edit**, check their **Employment History**, **Refer** them to an open vacancy, or **Delete** them (see Good to Know for what deleting actually does).

Other handy tools on this tab: **Import** (bulk-add applicants from an Excel/CSV file, with a downloadable template), **Export** (download the list as Excel or CSV), and **Resume Builder** (generate a printable resume from an existing applicant's saved information).

### Employers

The registry of companies that post job openings. **Add Employer** asks for company info, a contact person, and an address — the fields that must be filled in are **Company Name, TIN Number**, the contact person's **Full Name** and **Contact Number**, and the company's **Street, Province, City/Municipality, and Barangay**. When you later **Edit** an employer, an extra **Job Openings** section appears where you can list the positions they're hiring for.

### Vacancies

Job openings tied to a specific employer. **Add Vacancy** asks for the job title, the employer, how many openings there are, job type, salary range, and requirements. New vacancies always start out **Open**. From the ⋯ menu you can **View**, **Edit**, use **Match** to browse applicants and refer one straight to the vacancy, or **Close**/**Open** it — closing just stops it from accepting new applicants, it doesn't delete anything.

### Referrals

Whenever you refer an applicant to a vacancy (from Applicants or from a Vacancy's Match screen), it shows up here with status **Pending**. From here you can update it to **Interviewed**, **Not Hired**, or **Hired**. Marking someone **Hired** automatically moves them off this list and creates a record over in **Placements** — nothing further needs to be done manually. If you try to refer someone who's already been referred (or placed) with the same employer for the same position, the system will warn you before letting you continue, in case it's a duplicate.

### Placements

Everyone who's actually been hired. Each placement shows the current position and one of four statuses: **Active, Resigned, Terminated,** or **Completed**. Use **Update Status** to change it, or **Record Promotion** to log a new job title, date, and salary — the placement keeps its original hire record while showing the updated position.

### Quick Workflow: From Applicant to Placement

1. **Add** the jobseeker under Applicants.
2. **Refer** them to an open vacancy (from their ⋯ menu, or from a vacancy's Match screen).
3. The referral starts as **Pending** — update it as things progress (**Interviewed**, then **Hired** or **Not Hired**).
4. Marking a referral **Hired** automatically creates a **Placement** for them.
5. Track their employment status in Placements, and log **Record Promotion** whenever their role or salary changes.

---

## 2. Security — User Management

The **System Users** tab (under Security) is where staff accounts are created and managed.

### Roles: Administrator vs Staff

| Role | Access |
|---|---|
| **Administrator** | Full access to every module automatically — nothing to configure. |
| **Staff** | Access is set module-by-module, as either **Viewer** (can look but not change anything) or **Editor** (can add, edit, and delete). |

The **Security** module itself is the one exception — it's always Administrator-only, so a Staff account can never be given access to User Management, no matter what.

### Adding a New User

1. Click **Add User**.
2. Fill in their **First Name, Last Name, Username,** and a **Password**.
3. Choose their **Role** — Administrator or Staff.
4. If you chose Staff, go through the module list and set each one to **Viewer** or **Editor** as appropriate (Administrators skip this — they already have full access).
5. Confirm, and the account is created as **Active**.

### Editing a User / Changing a Password

Open a user from the list to edit their details or permissions the same way as when adding one. To change their password, use the **Change Password** toggle in the edit screen — leaving it off keeps their existing password unchanged.

### Deleting a User

Deleting asks for confirmation first, since it can't be undone. As a safety net, the system won't let you delete the **last remaining Administrator account** — there always needs to be at least one.

### Permission Cheat-Sheet

Each of the following can be set to **Viewer** or **Editor** for a Staff account:

Employment Facilitation · CDSP · GIP · SPES · Livelihood · Skills Training · OFW · Documents · Maintenance · Security (Administrator-only) · Report

---

## 3. CDSP

CDSP registers jobseekers for career-coaching services (like Career Coaching or Pre-Employment Coaching) and schedules them into sessions run by a facilitator.

### Managing Applicant Profiles

Adding or editing a CDSP applicant always requires **Last Name, First Name, Sex, Birthdate, Civil Status,** and **Barangay** — the same baseline as GIP and SPES. CDSP additionally requires you to select a **CDSP Service Availed** (see the Quirks note below — this field doesn't have a red asterisk, but it is required). An applicant's status — **Active** or **Inactive** — is set automatically based on whether they're currently assigned to an activity; there's no manual switch for it.

### CDSP Maintenance: Activities

Under Maintenance, staff create **Activities** — things like a coaching session or workshop — with a title, date, location, facilitator, counselor, and capacity. New activities always start as **Planned**, and move through **Ongoing** to **Completed** via the ⋯ menu. Assigning or unassigning an applicant to an activity is done from the CDSP applicant list itself (not from Maintenance), and only works while the activity is still **Planned** — once it's Completed, applicants stay locked to it.

Two things are unique to CDSP: attendance can be marked **Present** or **Absent** while an activity is Ongoing, and the system won't let you mark an activity **Completed** until every participant's attendance has been recorded. Deleting an activity is only blocked while applicants are still actively enrolled in it (Planned or Ongoing) — once it's Completed, the activity can be deleted freely.

---

## 4. GIP

GIP (Government Internship Program) places applicants into paid internships with partner government offices, organized into **Batches**.

### Managing Applicant Profiles

GIP asks for a bit more than CDSP or SPES: on top of the usual **Last Name, First Name, Sex, Birthdate, Civil Status,** and **Barangay**, it also requires at least one **Classification** to be checked and a **School/University** to be filled in — making it the strictest of the three profile forms. Status (**Active, Inactive,** or **Completed**) is set automatically based on the assigned batch's status, not manually.

### GIP Maintenance: Batches

A GIP Batch records the assigned government office, deployment location, supervisor, number of slots, funding source, start/end dates, and monthly allowance. New batches start as **Planned** and move to **Ongoing** then **Completed** via the ⋯ menu — completing a batch automatically marks every assigned applicant as **Completed** too, and reopening it reverts them back to Active. Assigning/unassigning applicants happens from the GIP applicant list and only works while a batch is still **Planned**.

Deleting a batch is blocked if **any** applicant was ever assigned to it — even in the past, not just currently — since there's no separate history of past interns beyond the batch link itself.

---

## 5. SPES

SPES (Special Program for Employment of Students) places student applicants into temporary employment with host employers, also organized into **Batches**.

### Managing Applicant Profiles

SPES has the simplest profile form of the three — nothing extra beyond the usual baseline: **Last Name, First Name, Sex, Birthdate, Civil Status,** and **Barangay**. School, income, and classification details can all be filled in but aren't required. Status (**Active, Inactive,** or **Completed**) works exactly like GIP — driven automatically by the assigned batch.

### SPES Maintenance: Batches

A SPES Batch records available slots, program start/end dates, the participating employer, deployment location, program coordinator, and funding source. Batches move through **Planned → Ongoing → Completed** the same way GIP batches do, and assigning/unassigning applicants follows the same Planned-only rule.

Just like GIP, deleting a SPES batch is blocked if any applicant was ever linked to it, current or past.

---

## Good to Know

A few things that work the same way across CDSP, GIP, SPES, and Employment Facilitation.

### Status Badges

Activity/Batch statuses (**Planned, Ongoing, Completed**) and applicant statuses (**Active, Inactive**, and for GIP/SPES, **Completed**) are generally computed automatically from what they're assigned to — you won't usually need to set an applicant's status directly.

### The Recycle Bin

Deleting an applicant, employer, or referral doesn't erase it right away — it's moved to the Recycle Bin, found under **Security → Activity Logs → Recycle Bin**. From there you can **Restore** it or **Permanently Delete** it. The bin shows a countdown, but nothing is actually deleted automatically when it reaches zero — records stay there until someone chooses to restore or permanently delete them, so it's worth checking in on periodically to keep it tidy.

### Deleting Applicants — When It's Blocked

You can't delete an applicant who's actively tied up in an assignment. The exact rule differs slightly by program:
- **CDSP** — blocked only while the applicant is currently enrolled in a **Planned** or **Ongoing** activity. Once that activity is Completed, they can be deleted.
- **GIP / SPES** — blocked if the applicant was **ever** linked to a batch, even one that finished long ago, since that link is the only record that the assignment happened.

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
6. Reports (EF,CDSP,GIP,SPES)

On-Progress (Not Yet Done)
6. Livelihood
7. Skills Training
8. OFW
9. Documents