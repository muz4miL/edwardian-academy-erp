# Implementation Plan

- [ ] 1. Write bug condition exploration tests (run BEFORE any fixes)
  - **Property 1: Bug Condition** - Database Empty, Student Portal 400, Font Build Failure
  - **CRITICAL**: Run these checks BEFORE applying any fix — failure confirms each bug exists
  - **DO NOT attempt to fix anything when these fail — that is the expected outcome**
  - **GOAL**: Surface counterexamples that prove each bug condition holds on the unfixed system

  **Issue 1 — Database empty (run on server via SSH):**
  ```bash
  mongosh -u mongoAdmin -p 'Edw@rdian_Admin_992!xK' --authenticationDatabase admin \
    --eval "use('edwardian-erp'); db.students.countDocuments()"
  ```
  - **EXPECTED OUTCOME**: Returns `0` — confirms isBugCondition_DataMigration holds
  - Document counterexample: e.g. "students.countDocuments() = 0 on edwardian-erp"

  **Issue 3 — Student portal 400 (run on laptop):**
  ```bash
  curl -I https://edwardiansacademy.com/student-portal
  ```
  - **EXPECTED OUTCOME**: `HTTP/2 400` — confirms isBugCondition_StudentPortal holds
  - Document counterexample: e.g. "GET /student-portal returns 400"

  **Issue 5 — Font build failure (run on server via SSH):**
  ```bash
  cd /tmp && cp -r /var/www/edwardian-academy-erp/frontend /tmp/frontend-test
  cd /tmp/frontend-test && npm ci && npm run build 2>&1 | grep -i "fontsource\|cannot find"
  ```
  - **EXPECTED OUTCOME**: Error lines mentioning `@fontsource/inter` or `@fontsource/playfair-display` — confirms isBugCondition_FontPackages holds
  - Document counterexample: e.g. "Cannot find module '@fontsource/inter'"
  - Mark task complete when all three checks are run and failures are documented
  - _Requirements: 1.1, 1.4, 1.8_

- [ ] 2. Write preservation property tests (run BEFORE any fixes)
  - **Property 2: Preservation** - Existing Routing and Auth Behavior
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed system behavior for non-buggy inputs
  - These inputs do NOT satisfy any bug condition — they should pass now and continue to pass after all fixes

  **Observe: Root redirect still works (run on laptop):**
  ```bash
  curl -I https://edwardiansacademy.com/
  ```
  - Observe and record: should return `HTTP/2 302` with `location: /public-home`

  **Observe: API proxy still works (run on laptop):**
  ```bash
  curl -I https://api.edwardiansacademy.com/api/health
  ```
  - Observe and record: should return `HTTP/2 200`

  **Observe: ERP login endpoint reachable (run on laptop):**
  ```bash
  curl -I https://erp.edwardiansacademy.com/login
  ```
  - Observe and record: should return `HTTP/2 200`

  **Observe: Existing font package unaffected (run on laptop):**
  - Confirm `@fontsource/plus-jakarta-sans` is present in `frontend/package.json` (it is — already verified)

  - Write down all observed values — these are the baseline to preserve
  - **EXPECTED OUTCOME**: All four checks PASS on unfixed code (confirms baseline behavior)
  - Mark task complete when all checks are run and baseline is recorded
  - _Requirements: 3.1, 3.2, 3.3, 3.8_

- [ ] 3. Fix 1 — Database Migration (Issues 1 + 2)

  - [ ] 3.1 Re-dump database from laptop with compatibility flag (run on laptop)
    - Run from your project root (the folder containing `backend/` and `frontend/`):
    ```bash
    mongodump \
      --db=edwardianDB \
      --forceCompatibleOptions \
      --archive=edwardian-live-seed-compat.gz \
      --gzip
    ```
    - _Bug_Condition: isBugCondition_DataMigration — sourceDbName ≠ targetDbName AND sourceMongodVersion (8.2.4) > targetMongodVersion (8.0.20)_
    - _Expected_Behavior: documentsRestored > 0 AND collectionsPopulated >= 30 in edwardian-erp_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Transfer compatible archive to server (run on laptop)
    ```bash
    scp edwardian-live-seed-compat.gz root@187.127.108.180:/var/www/edwardian-academy-erp/backend/
    ```
    - _Requirements: 2.1_

  - [ ] 3.3 Restore database on server with namespace mapping (run on server via SSH)
    ```bash
    mongorestore \
      --authenticationDatabase=admin \
      -u mongoAdmin \
      -p 'Edw@rdian_Admin_992!xK' \
      --archive=/var/www/edwardian-academy-erp/backend/edwardian-live-seed-compat.gz \
      --gzip \
      --nsFrom='edwardianDB.*' \
      --nsTo='edwardian-erp.*' \
      --drop
    ```
    - `--drop` is safe — all collections are currently empty
    - _Bug_Condition: isBugCondition_DataMigration_
    - _Preservation: --drop is scoped to edwardian-erp only; no other databases are affected_
    - _Requirements: 2.1, 2.2, 3.6, 3.7_

  - [ ] 3.4 Checkpoint 1 — Verify database is populated (run on server via SSH)
    - **Property 1: Expected Behavior** - All Collections Populated
    - **IMPORTANT**: Re-run the same check from task 1 — do NOT write a new test
    ```bash
    mongosh \
      -u mongoAdmin \
      -p 'Edw@rdian_Admin_992!xK' \
      --authenticationDatabase admin \
      --eval "
        use('edwardian-erp');
        db.getCollectionNames().forEach(c => print(c, db[c].countDocuments()));
      "
    ```
    - **EXPECTED OUTCOME**: ~30 collections each showing a count > 0 (e.g. `students 142`)
    - If all zeros: fallback — upgrade MongoDB tools on laptop to 8.0.x and re-dump without `--forceCompatibleOptions`
    - _Requirements: 2.1, 2.2_

  - [ ] 3.5 Checkpoint 2 — Verify dashboard loads data (run on laptop — browser)
    - Open `https://erp.edwardiansacademy.com` and log in with owner credentials
    - **EXPECTED OUTCOME**: Student count, teacher count, and fee collection % all show non-zero values; revenue and analytics widgets render charts
    - If still showing zeros: `pm2 restart edwardian-api && pm2 logs edwardian-api --lines 20`
    - _Requirements: 2.3_

- [ ] 4. Fix 2 — Student Portal Nginx (Issue 3)

  - [ ] 4.1 View current Nginx config (run on server via SSH)
    ```bash
    cat /etc/nginx/sites-available/edwardian
    ```
    - Locate the `server` block for `edwardiansacademy.com` and confirm the `location = /` exact-match block is present
    - _Requirements: 1.4, 1.5_

  - [ ] 4.2 Add SPA catch-all try_files block (run on server via SSH)
    ```bash
    nano /etc/nginx/sites-available/edwardian
    ```
    - Find the `location = / { return 302 /public-home; }` block
    - Add the following immediately after it (if not already present):
    ```nginx
    location / {
        try_files $uri $uri/ /index.html;
    }
    ```
    - The relevant section should look like:
    ```nginx
    root /var/www/edwardian-frontend;
    index index.html;

    location = / {
        return 302 /public-home;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
    ```
    - _Bug_Condition: isBugCondition_StudentPortal — requestPath starts with /student-portal AND no try_files fallback_
    - _Expected_Behavior: HTTP 200 + index.html body for all /student-portal/* paths_
    - _Preservation: location = / redirect to /public-home must remain intact_
    - _Requirements: 2.4, 2.5, 3.3_

  - [ ] 4.3 Test and reload Nginx (run on server via SSH)
    ```bash
    nginx -t && systemctl reload nginx
    ```
    - **EXPECTED OUTCOME**: `nginx: configuration file /etc/nginx/nginx.conf test is successful`
    - _Requirements: 2.4, 2.5_

  - [ ] 4.4 Checkpoint 3 — Verify student portal returns 200 and root redirect preserved (run on laptop)
    - **Property 1: Expected Behavior** - Student Portal Returns 200
    - **Property 2: Preservation** - Root Redirect Still Returns 302
    - **IMPORTANT**: Re-run the same checks from tasks 1 and 2
    ```bash
    curl -I https://edwardiansacademy.com/student-portal
    ```
    - **EXPECTED OUTCOME**: `HTTP/2 200`
    ```bash
    curl -I https://edwardiansacademy.com/
    ```
    - **EXPECTED OUTCOME**: `HTTP/2 302` with `location: /public-home` (preservation confirmed)
    - If `/student-portal` still returns 400: run `nginx -T | grep -A5 "server_name edwardiansacademy"` to inspect resolved config
    - _Requirements: 2.4, 2.5, 3.3_

- [ ] 5. Fix 3 — Uploads Folder Transfer (Issue 4)

  - [ ] 5.1 Transfer uploads directory from laptop to server (run on laptop)
    - Run from your project root (the folder containing `backend/` and `frontend/`):
    ```bash
    scp -r backend/uploads/ root@187.127.108.180:/var/www/edwardian-academy-erp/backend/
    ```
    - _Bug_Condition: uploads/ was never transferred — scp was run from wrong directory_
    - _Requirements: 2.6, 2.7_

  - [ ] 5.2 Set correct ownership and permissions (run on server via SSH)
    ```bash
    chown -R www-data:www-data /var/www/edwardian-academy-erp/backend/uploads/
    chmod -R 755 /var/www/edwardian-academy-erp/backend/uploads/
    ```
    - _Preservation: Express static middleware already configured — no backend code change needed_
    - _Requirements: 2.6, 3.4_

  - [ ] 5.3 Checkpoint 4 — Verify uploads are served (run on laptop)
    - First, list available files on the server:
    ```bash
    # Run on server via SSH
    ls /var/www/edwardian-academy-erp/backend/uploads/students/ | head -5
    ```
    - Then test serving a real file (replace `<filename>` with an actual filename from above):
    ```bash
    # Run on laptop
    curl -I https://api.edwardiansacademy.com/uploads/students/<filename>
    ```
    - **EXPECTED OUTCOME**: `HTTP/2 200` with `content-type: image/jpeg` or `image/png`
    - If uploads directory was empty on laptop (no photos yet):
    ```bash
    curl -I https://api.edwardiansacademy.com/uploads/students/nonexistent.jpg
    ```
    - **EXPECTED OUTCOME**: `HTTP/2 404` (not 500 — a 404 confirms the `/uploads` route is working)
    - _Requirements: 2.6, 2.7_

- [ ] 6. Fix 4 — Font Packages in package.json (Issue 5)
  - **NOTE**: This is the only automated task — Kiro will edit `frontend/package.json` directly

  - [x] 6.1 Add missing font packages to frontend/package.json (automated — Kiro executes this)
    - Add `@fontsource/inter` and `@fontsource/playfair-display` to the `dependencies` section of `frontend/package.json`
    - _Bug_Condition: isBugCondition_FontPackages — both packages imported in source but absent from package.json_
    - _Expected_Behavior: npm run build exits 0 with no font-related errors on fresh npm install_
    - _Preservation: @fontsource/plus-jakarta-sans already present — must remain unchanged_
    - _Requirements: 2.8, 2.9, 3.3_

  - [ ] 6.2 Commit and push the package.json change (run on laptop)
    ```bash
    git add frontend/package.json frontend/package-lock.json
    git commit -m "fix: add missing @fontsource/inter and @fontsource/playfair-display to package.json"
    git push
    ```
    - _Requirements: 2.8, 2.9_

  - [ ] 6.3 Pull, install, and rebuild on server (run on server via SSH)
    ```bash
    cd /var/www/edwardian-academy-erp/frontend
    git pull
    npm install
    npm run build
    ```
    - _Requirements: 2.8, 2.9_

  - [ ] 6.4 Copy dist output to web root if needed (run on server via SSH)
    ```bash
    # Only run this if the build output directory is separate from the served directory
    cp -r /var/www/edwardian-academy-erp/frontend/dist/* /var/www/edwardian-frontend/
    ```
    - Verify the output is in place:
    ```bash
    ls -la /var/www/edwardian-frontend/
    ```
    - _Requirements: 2.8, 2.9_

  - [ ] 6.5 Checkpoint 5 — Verify clean build and verify preservation tests still pass (run on laptop)
    - **Property 1: Expected Behavior** - Frontend Builds Without Font Errors
    - **Property 2: Preservation** - All Three Domains Still Respond Correctly
    - **IMPORTANT**: Re-run the same checks from tasks 1 and 2
    - Confirm `npm run build` output (from step 6.3) contains no lines with `Cannot find module '@fontsource/inter'` or `@fontsource/playfair-display`
    - **EXPECTED OUTCOME**: Build output shows `✓ built in Xs` with no font errors
    - Final smoke test — run all three (run on laptop):
    ```bash
    curl -I https://edwardiansacademy.com
    curl -I https://erp.edwardiansacademy.com
    curl -I https://api.edwardiansacademy.com/api/health
    ```
    - **EXPECTED OUTCOME**: All three return `HTTP/2 200` (or `302` for the public root)
    - _Requirements: 2.8, 2.9, 3.1, 3.2, 3.3, 3.8_

- [ ] 7. Final end-to-end verification checkpoint
  - Ensure all five checkpoints have passed before marking this task complete
  - Run the full preservation suite one final time to confirm no regressions (run on laptop):
  ```bash
  # Root redirect preserved
  curl -I https://edwardiansacademy.com/

  # Student portal now works
  curl -I https://edwardiansacademy.com/student-portal

  # API proxy preserved
  curl -I https://api.edwardiansacademy.com/api/health

  # ERP accessible
  curl -I https://erp.edwardiansacademy.com
  ```
  - **EXPECTED OUTCOME**:
    - `edwardiansacademy.com/` → `302 /public-home`
    - `edwardiansacademy.com/student-portal` → `200`
    - `api.edwardiansacademy.com/api/health` → `200`
    - `erp.edwardiansacademy.com` → `200`
  - Log in to the ERP dashboard and confirm student/teacher counts are non-zero
  - Ask the user if any questions arise before closing the spec
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 3.1, 3.2, 3.3, 3.8_
