# Deployment Data Migration Fix — Bugfix Design

## Overview

The Edwardian Academy ERP is deployed on a Hostinger VPS (Ubuntu 24.04.4 LTS, Node.js v20.20.2, MongoDB 8.0.20) but is non-functional due to five issues introduced during the initial deployment. The primary failure is a MongoDB data migration that restored 0 documents because the dump was created on MongoDB 8.2.4 (laptop) and the server runs 8.0.20 — a minor-version incompatibility that blocks direct restore. Four secondary issues cascade from this or were caused by deployment-time omissions.

This design is structured as a sequential runbook. Each fix section contains exact copy-paste shell commands followed by a verification checkpoint. The user MUST confirm each checkpoint passes before proceeding to the next fix.

---

## Glossary

- **Bug_Condition (C)**: The specific condition that causes each issue to manifest
- **Property (P)**: The desired correct behavior once the fix is applied
- **Preservation**: Existing behaviors that must remain unchanged after each fix
- **isBugCondition**: Pseudocode function that identifies whether a given input triggers the bug
- **edwardianDB**: The local development MongoDB database name (on the laptop)
- **edwardian-erp**: The production MongoDB database name (on the server)
- **mongorestore'**: The fixed restore command (with `--forceCompatibleOptions` re-dump or correct flags)
- **nsMapping**: The `--nsFrom / --nsTo` namespace remapping flags for mongorestore
- **SPA catch-all**: The Nginx `try_files $uri $uri/ /index.html` directive that enables React Router
- **PM2**: Process manager running the backend as `edwardian-api` on port 5000

---

## Bug Details

### Bug Condition — Issue 1: Database Migration Failure

The bug manifests when `mongorestore` is run against an archive created by a newer MongoDB version (8.2.4) on a server running an older version (8.0.20). Even with correct namespace mapping, the wire protocol difference causes 0 documents to be restored.

**Formal Specification:**
```
FUNCTION isBugCondition_DataMigration(X)
  INPUT: X = { archivePath, sourceDbName, targetDbName, sourceMongodVersion, targetMongodVersion }
  OUTPUT: boolean

  RETURN X.sourceDbName ≠ X.targetDbName
      AND X.sourceMongodVersion > X.targetMongodVersion
      AND (nsMapping NOT applied
           OR nsMapping applied but wire protocol incompatible)
END FUNCTION
```

**Examples:**
- `mongodump` on laptop (8.2.4) → `mongorestore` on server (8.0.20) with `--nsFrom='edwardianDB.*' --nsTo='edwardian-erp.*'` → **0 documents restored** (bug)
- `mongodump --forceCompatibleOptions` on laptop (8.2.4) → `mongorestore` on server (8.0.20) with namespace mapping → **all documents restored** (fixed)
- `mongodump` on server (8.0.20) → `mongorestore` on same server (8.0.20) → **all documents restored** (no bug condition)

### Bug Condition — Issue 3: Student Portal HTTP 400

The bug manifests when Nginx has an exact-match `location = /` block that redirects to `/public-home`, and a request arrives for `/student-portal`. The exact-match block does not intercept `/student-portal` directly, but the absence of a proper SPA catch-all `try_files` in the non-exact location block means the request falls through to a 400 response.

**Formal Specification:**
```
FUNCTION isBugCondition_StudentPortal(X)
  INPUT: X = { requestPath, nginxConfig }
  OUTPUT: boolean

  RETURN X.requestPath STARTS WITH "/student-portal"
      AND nginxConfig HAS NO location block WITH try_files fallback to /index.html
      AND nginxConfig HAS location = "/" WITH return 302 /public-home
END FUNCTION
```

**Examples:**
- `GET /student-portal` with missing `try_files` → **HTTP 400** (bug)
- `GET /student-portal` with `try_files $uri $uri/ /index.html` in place → **HTTP 200 + index.html** (fixed)
- `GET /` → redirects to `/public-home` → **HTTP 302** (unchanged, preserved)

### Bug Condition — Issue 5: Missing Font Packages

The bug manifests when `npm run build` is executed after a fresh `npm install` because `@fontsource/inter` and `@fontsource/playfair-display` are imported in `frontend/src/index.css` but are absent from `frontend/package.json` dependencies.

**Formal Specification:**
```
FUNCTION isBugCondition_FontPackages(X)
  INPUT: X = { packageJsonDeps, sourceImports }
  OUTPUT: boolean

  RETURN ("@fontsource/inter" ∈ X.sourceImports
          AND "@fontsource/inter" ∉ X.packageJsonDeps)
      OR ("@fontsource/playfair-display" ∈ X.sourceImports
          AND "@fontsource/playfair-display" ∉ X.packageJsonDeps)
END FUNCTION
```

**Examples:**
- `index.css` imports `@fontsource/inter/400.css` but `package.json` has no `@fontsource/inter` entry → **build fails** (bug)
- Both packages added to `package.json` → `npm install && npm run build` → **exit code 0** (fixed)
- `@fontsource/plus-jakarta-sans` is already in `package.json` → **unaffected** (preserved)

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors (must not regress after any fix):**
- Admin login at `erp.edwardiansacademy.com/login` continues to authenticate and issue JWT cookies
- CORS enforcement continues to allow only origins in `CORS_ALLOWED_ORIGINS`
- Public homepage at `edwardiansacademy.com` continues to serve the static frontend with SSL
- The `location = /` redirect to `/public-home` on the public site continues to work
- Student photo upload continues to validate JPEG/PNG only and enforce 5MB limit
- PM2 `edwardian-api` continues to auto-restart on reboot
- MongoDB backup cron continues to run without interference
- `edwardianApp` credentials continue to authenticate against `edwardian-erp` with `authSource=edwardian-erp`
- All `/api/` routes continue to be proxied from `api.edwardiansacademy.com` to `127.0.0.1:5000`

**Scope:** All fixes are targeted and minimal. The database restore only writes to `edwardian-erp`. The Nginx fix only adds a `try_files` directive to the public site block. The font fix only adds two entries to `package.json`. No application logic is changed.

---

## Hypothesized Root Cause

1. **MongoDB Version Mismatch (Issue 1)**: The `mongodump` archive was created with MongoDB 8.2.4 tools on the laptop. The server runs MongoDB 8.0.20. The BSON wire format between minor versions can include features not understood by the older restore tool, causing silent 0-document restores. The fix is to re-dump from the laptop using `--forceCompatibleOptions` which downgrades the dump format to be compatible with older versions.

2. **Empty Database Cascade (Issue 2)**: The dashboard failure is entirely caused by Issue 1. No independent fix is needed — it resolves automatically once the database is populated.

3. **Missing SPA Catch-All in Nginx (Issue 3)**: The public site Nginx config has `location = / { return 302 /public-home; }` (exact match, only fires for `/`). However, there is likely no `location / { try_files $uri $uri/ /index.html; }` block, so requests to `/student-portal` hit Nginx's default behavior and return 400. The fix is to ensure a non-exact `location /` block with `try_files` exists.

4. **Wrong Working Directory for SCP (Issue 4)**: The `scp -r backend/uploads/` command was run from inside the `backend/` directory instead of the project root, so the path resolved incorrectly and no files were transferred. The fix is to run the command from the correct project root on the laptop.

5. **Font Packages Installed Manually, Not Declared (Issue 5)**: During development, `@fontsource/inter` and `@fontsource/playfair-display` were installed with `npm install` but the `--save` flag was omitted (or the `package.json` was not committed after install). The packages exist in `node_modules` locally but are not in `package.json`, so a fresh `npm install` on the server skips them.

---

## Correctness Properties

Property 1: Bug Condition — Database Restore Succeeds

_For any_ archive where `isBugCondition_DataMigration` holds (source version > target version, namespace mismatch), the fixed restore process (re-dump with `--forceCompatibleOptions` + namespace mapping) SHALL restore all documents such that `documentsRestored > 0` and all 30 collections are populated in `edwardian-erp`.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Student Portal Returns 200

_For any_ HTTP request where `isBugCondition_StudentPortal` holds (path starts with `/student-portal`, no `try_files` fallback), the fixed Nginx config SHALL return HTTP 200 with the React SPA `index.html` body, allowing React Router to render the student portal.

**Validates: Requirements 2.4, 2.5**

Property 3: Bug Condition — Frontend Build Succeeds

_For any_ build environment where `isBugCondition_FontPackages` holds (font packages imported but not in `package.json`), the fixed `package.json` (with both packages declared) SHALL produce `npm run build` exit code 0 with no font-related errors.

**Validates: Requirements 2.8, 2.9**

Property 4: Preservation — Non-Buggy Inputs Unchanged

_For any_ input where none of the bug conditions hold (correct MongoDB versions, correct Nginx config, correct `package.json`), the fixed system SHALL produce exactly the same behavior as the original system, preserving all authentication, routing, upload, and API proxy behaviors.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

---

## Fix Implementation

### Fix 1 — Database Migration (Issue 1 + Issue 2)

**Strategy**: Re-dump from the laptop using `--forceCompatibleOptions` to produce a BSON archive compatible with MongoDB 8.0.x, transfer it to the server, then restore with namespace mapping.

**Files affected**: MongoDB `edwardian-erp` database (data only, no code changes)

**Step 1.1 — Re-dump from laptop** (run on your local machine):
```bash
# Run from your project root on the laptop
mongodump \
  --db=edwardianDB \
  --forceCompatibleOptions \
  --archive=edwardian-live-seed-compat.gz \
  --gzip
```

**Step 1.2 — Transfer to server** (run on your local machine):
```bash
scp edwardian-live-seed-compat.gz root@187.127.108.180:/var/www/edwardian-academy-erp/backend/
```

**Step 1.3 — Restore on server** (run via SSH on the server):
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

> Note: `--drop` clears any existing empty collections before restoring. Safe to use since the database is currently empty.

---

#### ✅ CHECKPOINT 1 — Verify database is populated

Run on the server:
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

**Expected output**: A list of ~30 collection names each followed by a number greater than 0. Example:
```
students 142
teachers 18
users 5
feerecords 310
...
```

**If you see all zeros or fewer than 10 collections**: The `--forceCompatibleOptions` re-dump did not work. Fallback: upgrade MongoDB tools on the laptop to match the server version (8.0.x) and re-dump without `--forceCompatibleOptions`.

---

### Fix 2 — Dashboard Data Load (Issue 2)

No code change required. This resolves automatically once Checkpoint 1 passes.

#### ✅ CHECKPOINT 2 — Verify dashboard loads data

1. Open `https://erp.edwardiansacademy.com` in a browser
2. Log in with owner credentials
3. Navigate to the main dashboard

**Expected output**: Student count, teacher count, and fee collection percentage all show non-zero values. Revenue and analytics widgets render charts instead of loading spinners.

**If dashboard still shows zeros**: Restart the backend to clear any cached empty responses:
```bash
pm2 restart edwardian-api && pm2 logs edwardian-api --lines 20
```

---

### Fix 3 — Student Portal HTTP 400 (Issue 3)

**Strategy**: Edit the Nginx config for the public site to ensure a non-exact `location /` block with `try_files` exists alongside the existing `location = /` exact-match redirect.

**File affected**: `/etc/nginx/sites-available/edwardian`

**Step 3.1 — View current config** (run on server):
```bash
cat /etc/nginx/sites-available/edwardian
```

**Step 3.2 — Edit the public site server block**

Find the `server` block that handles `edwardiansacademy.com` (port 80 or 443). It will contain:
```nginx
location = / {
    return 302 /public-home;
}
```

Add the following block immediately after it (if not already present):
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Full edit command (opens nano):
```bash
nano /etc/nginx/sites-available/edwardian
```

After editing, the relevant section of the public site server block should look like:
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

**Step 3.3 — Test and reload Nginx**:
```bash
nginx -t && systemctl reload nginx
```

---

#### ✅ CHECKPOINT 3 — Verify student portal returns 200

```bash
curl -I https://edwardiansacademy.com/student-portal
```

**Expected output**:
```
HTTP/2 200
content-type: text/html
...
```

Also verify the root redirect is still working:
```bash
curl -I https://edwardiansacademy.com/
```

**Expected output**:
```
HTTP/2 302
location: /public-home
```

**If `/student-portal` still returns 400**: Check whether there is a conflicting `location` block or a `return` statement in the `location /` block. Run `nginx -T | grep -A5 "server_name edwardiansacademy"` to see the full resolved config.

---

### Fix 4 — Uploads Folder Transfer (Issue 4)

**Strategy**: Run `scp` from the correct project root directory on the laptop so the path resolves to `backend/uploads/`.

**Step 4.1 — Transfer uploads from laptop** (run on your local machine from the project root):
```bash
# Make sure you are in the project root (the folder that contains backend/ and frontend/)
scp -r backend/uploads/ root@187.127.108.180:/var/www/edwardian-academy-erp/backend/
```

**Step 4.2 — Verify directory exists on server** (run on server):
```bash
ls -la /var/www/edwardian-academy-erp/backend/uploads/students/ | head -20
```

**Step 4.3 — Set correct permissions** (run on server):
```bash
chown -R www-data:www-data /var/www/edwardian-academy-erp/backend/uploads/
chmod -R 755 /var/www/edwardian-academy-erp/backend/uploads/
```

> Note: The Express static middleware is already configured in `server.js`:
> `app.use("/uploads", express.static(path.join(__dirname, "uploads")));`
> No backend code change is needed.

---

#### ✅ CHECKPOINT 4 — Verify uploads are served

Pick any filename from the uploads directory you just transferred:
```bash
ls /var/www/edwardian-academy-erp/backend/uploads/students/ | head -5
```

Then test serving one of those files:
```bash
# Replace <filename> with an actual file from the listing above
curl -I https://api.edwardiansacademy.com/uploads/students/<filename>
```

**Expected output**: `HTTP/2 200` with a `content-type: image/jpeg` or `image/png` header.

If the uploads directory was empty on the laptop (no student photos yet), test that the directory exists and the route doesn't 500:
```bash
curl -I https://api.edwardiansacademy.com/uploads/students/nonexistent.jpg
```

**Expected output**: `HTTP/2 404` (not 500 — a 404 means Express found the `/uploads` route and correctly reported the file is missing).

---

### Fix 5 — Missing Font Packages (Issue 5)

**Strategy**: Add `@fontsource/inter` and `@fontsource/playfair-display` to `frontend/package.json` dependencies, then rebuild the frontend on the server.

**Step 5.1 — Add packages to package.json** (run on your local machine in the `frontend/` directory):
```bash
cd frontend
npm install @fontsource/inter @fontsource/playfair-display --save
```

This updates `package.json` and `package-lock.json`. Commit and push both files.

**Step 5.2 — Pull and rebuild on server** (run on server):
```bash
cd /var/www/edwardian-academy-erp/frontend
git pull
npm install
npm run build
```

**Step 5.3 — Verify the build output is in place**:
```bash
ls -la /var/www/edwardian-frontend/
```

> If the build output directory is separate from the source directory, copy the dist output:
> ```bash
> cp -r /var/www/edwardian-academy-erp/frontend/dist/* /var/www/edwardian-frontend/
> ```

---

#### ✅ CHECKPOINT 5 — Verify frontend builds without errors

The `npm run build` command in Step 5.2 should complete with output similar to:
```
✓ built in Xs
dist/index.html
dist/assets/index-[hash].js
dist/assets/index-[hash].css
...
```

**Expected**: No lines containing `Cannot find module '@fontsource/inter'` or `@fontsource/playfair-display`.

Also do a final smoke test of the full site:
```bash
curl -I https://edwardiansacademy.com
curl -I https://erp.edwardiansacademy.com
curl -I https://api.edwardiansacademy.com/api/health
```

**Expected**: All three return `HTTP/2 200` (or `302` for the public root redirect).

---

## Testing Strategy

### Validation Approach

Testing follows the bug condition methodology: first confirm the bug exists (exploratory), then verify the fix works (fix checking), then verify nothing else broke (preservation checking). Issues 1, 3, and 5 are independently testable with property-based approaches. Issues 2 and 4 are verified by direct observation.

---

### Exploratory Bug Condition Checking

**Goal**: Confirm each bug is reproducible BEFORE applying fixes. This validates the root cause analysis.

**Issue 1 — Database empty:**
```bash
# Run on server BEFORE fix
mongosh -u mongoAdmin -p 'Edw@rdian_Admin_992!xK' --authenticationDatabase admin \
  --eval "use('edwardian-erp'); db.students.countDocuments()"
```
Expected counterexample: `0` (confirms bug condition holds)

**Issue 3 — Student portal 400:**
```bash
# Run BEFORE Nginx fix
curl -I https://edwardiansacademy.com/student-portal
```
Expected counterexample: `HTTP/2 400` (confirms bug condition holds)

**Issue 5 — Font build failure:**
```bash
# Run on server BEFORE fix (in a temp copy to avoid breaking production)
cd /tmp && cp -r /var/www/edwardian-academy-erp/frontend /tmp/frontend-test
cd /tmp/frontend-test && npm ci && npm run build 2>&1 | grep -i "fontsource\|cannot find"
```
Expected counterexample: Error lines mentioning `@fontsource/inter` or `@fontsource/playfair-display`

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode (Issue 1):**
```
FOR ALL X WHERE isBugCondition_DataMigration(X) DO
  result := mongorestore_fixed(X)  // re-dump with --forceCompatibleOptions
  ASSERT result.documentsRestored > 0
  ASSERT result.collectionsPopulated >= 30
END FOR
```

**Pseudocode (Issue 3):**
```
FOR ALL X WHERE isBugCondition_StudentPortal(X) DO
  result := nginxRoute_fixed(X)
  ASSERT result.httpStatus = 200
  ASSERT result.body CONTAINS "<div id=\"root\">"
END FOR
```

**Pseudocode (Issue 5):**
```
FOR ALL X WHERE isBugCondition_FontPackages(X) DO
  result := npmBuild_fixed(X)
  ASSERT result.exitCode = 0
  ASSERT result.stderrLines CONTAINS NO "Cannot find module"
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system behaves identically to the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT system_original(X) = system_fixed(X)
END FOR
```

**Testing approach**: Property-based testing is recommended for Nginx routing and font build preservation because these have large input spaces (many URL paths, many package combinations). Manual spot-checks are sufficient for the database restore preservation since the `--drop` flag is scoped to `edwardian-erp` only.

**Preservation test cases:**
1. `GET /` on public site → still returns `302 /public-home` (Nginx redirect preserved)
2. `GET /public-home` → still returns `200` with SPA content (non-portal routes preserved)
3. `POST /api/auth/login` with valid credentials → still returns `200` with JWT (auth preserved)
4. `GET /api/health` → still returns `200` (API proxy preserved)
5. `npm run build` with `@fontsource/plus-jakarta-sans` (already in `package.json`) → still builds (existing font preserved)

---

### Unit Tests

- Verify `mongosh` collection counts match expected document counts after restore
- Verify `nginx -t` passes (config syntax valid) after Nginx edit
- Verify `package.json` contains all three `@fontsource/*` packages after fix
- Verify `/var/www/edwardian-academy-erp/backend/uploads/students/` directory exists and is non-empty after SCP transfer

### Property-Based Tests

- Generate random URL paths under `edwardiansacademy.com` (e.g., `/student-portal`, `/student-portal/login`, `/public-home`, `/about`) and assert all return `200` except `/` which returns `302` — verifies the SPA catch-all works for the full path space
- Generate random `package.json` dependency sets that include the three `@fontsource/*` packages and assert `npm run build` always exits 0 — verifies font fix is robust to other dependency changes
- Generate random MongoDB collection names and assert `countDocuments()` returns > 0 for all collections in `edwardian-erp` after restore — verifies no collection was silently skipped

### Integration Tests

- Full login flow: `POST /api/auth/login` → receive JWT → `GET /api/dashboard` → verify non-zero data
- Student portal flow: `GET /student-portal` → `200` → React Router renders login form → student logs in → profile page loads with photo served from `/uploads/students/`
- Redeploy simulation: fresh `git clone` + `npm install` + `npm run build` completes without errors (validates font fix is permanent)
