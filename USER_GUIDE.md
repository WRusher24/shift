# Shift (שיפט / شيفت) — User Guide

A quick tour of the platform for supervisors, admins and line workers.
The whole interface is in **Hebrew, right-to-left**, with free-text fields
accepting Hebrew, Arabic or English input. All numbers always display as
regular digits (0-9).

---

## 1. The Production Station — עמדת ייצור (home page)

This is the shop-floor screen, designed for large factory PCs and tablets.
It shows **two lines side by side: קו A and קו B**, each running an
independent live batch.

### Starting a batch

1. On a free line card, pick a **product** (step 1).
2. Tick the **team members** from the checkbox chips (step 2) — each worker
   shows their unique profile emoji.
3. Press **"התחל אצווה"** — the giant live timer starts immediately.

### During the batch

- **Giant timer** — green & glowing while working. Read it from meters away.
- **"+ הוסף משטח" (Add Pallet)** — pick a predefined pallet size
  (per product configuration) or type any custom carton count.
  Points = *cartons × product multiplier*, split equally across the team
  **currently on the line** and credited instantly.
- **Team changes mid-batch** — use the **+** pill to add a worker, or the ✕ on a
  member chip to remove one. Only future pallets use the new split;
  past points stay untouched.
- **"השהה" (Pause)** — choose a reason (raw material shortage, machine
  maintenance, changeover/cleaning, crew break, QC, other). The card turns
  **amber**, the main timer freezes, and pause time accumulates separately.
  Press **"חדש עבודה"** to resume.
- **"סיים אצווה" (Finish)** — closes the batch and archives it in the history ledger.
- **ביטול אצווה** — deletes a batch created by mistake (double-tap to confirm).

### TV Mode — מצב טלוויזיה

- After **10 seconds without any mouse or keyboard activity**, the screen
  switches to a full-screen animated scoreboard: live batch timers,
  volume leaderboard, efficiency leaderboard and a stats ticker.
- **Any** mouse move or key press snaps back to the interactive station.
- You can also open it manually via the **"מצב טלוויזיה"** button — perfect for
  hallway/big-screen displays.

---

## 2. Leaderboards — טבלת מובילים

Two live rankings for the **active race**:

- **נפח (Volume)** — total accumulated race points, with a podium for the top 3.
- **יעילות (Efficiency / PPH)** — points ÷ active working hours.
- Workers below the **minimum active-hours threshold** are flagged
  ("חסרות X ש׳") and are not prize-eligible — this prevents hour-parking bias.

---

## 3. History — היסטוריה

The full operational ledger for every batch ever run:

- Date, line, product, start/finish times
- Active working time vs. total elapsed time
- Pause breakdown by reason
- Team members (with emojis), pallets, cartons, total points
- Search (by product, worker or race) and line filter
- One-click **CSV export**

---

## 4. Admin — ניהול

### עובדים (Workers)

- Add a worker: full name (any language), employee ID and a **unique emoji**
  (greyed-out emojis are already taken; the server enforces uniqueness too).
- Edit details inline, deactivate/reactivate, or delete.
- A worker with recorded history is **deactivated** instead of deleted,
  so leaderboards and logs stay intact.

### מוצרים (Products)

- Define name, bottle/gallon size, units per carton,
  **predefined pallet sizes** (comma separated, e.g. `28, 32`),
  and the **point multiplier** per carton.
- Custom pallet counts can always be typed manually on the station screen.

### מירוצים (Races)

- Edit the active race: name, prize text, minimum-hours threshold.
- **"סיים מירוץ"** closes it (runner stats preserved).
- **Opening a new race** closes the current one and resets all points to 0 —
  history is never lost.

### דוחות וייצוא (Reports & CSV)

Three Excel-ready exports (UTF-8 Hebrew, regular digits):

1. **יומן אצוות מלא** — complete batch ledger for payroll & reviews.
2. **סיכום נקודות עובדים** — per-worker points, hours, PPH and eligibility.
3. **דוח השבתות** — downtime analysis by reason.

---

## 5. Daily cheat-sheet for supervisors

| When          | Do this                                                         |
| ------------- | --------------------------------------------------------------- |
| Shift start   | Open עמדת ייצור → start batches on lines A & B                   |
| Pallet done   | Worker taps **+ הוסף משטח** and picks the size                  |
| Worker in/out | Use the team **+ / ✕** on the live card — splits auto-adjust    |
| Downtime      | Press **השהה** and choose the real reason (it feeds the reports)|
| End of batch  | **סיים אצווה** — check the line in History                      |
| Wall screen   | Hit **מצב טלוויזיה** (or just leave it idle for 10 s)           |
| Month end     | סיים מירוץ → open a new race → export the 3 CSV reports         |
