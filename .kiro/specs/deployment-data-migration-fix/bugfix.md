# Bugfix Requirements Document

## Introduction

The Edwardian Academy ERP has been deployed to a Hostinger VPS (Ubuntu 24.04.4 LTS) but is non-functional in production due to five interconnected issues. The root cause is a failed database migration — a MongoDB dump from the local development machine (edwardianDB, MongoDB 8.2.4) was transferred to the server but never successfully restored into the production database (edwardian-erp, MongoDB 8.0.20). This leaves all 30 collections empty, causing cascading failures across the ERP dashboard, student portal, and file-serving subsystems. Additionally, two deployment-time omissions — missing font packages in package.json and a missing uploads folder transfer — will cause recurring failures on every future redeploy.

---

## Bug Analysis

### Current Behavior (Defect)

**Issue 1 — Database Migration Failure**

1.1 WHEN `mongorestore` is run with `--nsFrom="edwardianDB.*" --nsTo="edwardian-erp.*"` against the archive at `/var/www/edwardian-academy-erp/backend/edwardian-live-seed.gz` THEN the system restores 0 documents and emits a cross-version compatibility warning (dump created with MongoDB 8.2.4, server runs 8.0.20)

1.2 WHEN the production backend connects to the `edwardian-erp` database THEN the system finds all 30 collections present but containing 0 documents

**Issue 2 — Dashboard Data Load Failure**

1.3 WHEN an authenticated owner visits the ERP dashboard at `erp.edwardiansacademy.com` THEN the system displays "Failed to load data from server" across all data panels, shows Students: 0, Teachers: 0, Fee collection: 0%, and leaves analytics/revenue/pool widgets in a perpetual loading state

**Issue 3 — Student Portal Returns HTTP 400**

1.4 WHEN a user navigates to `edwardiansacademy.com/student-portal` THEN the system returns a blank white page with "Error 400 (Bad Request)" instead of rendering the student portal UI

1.5 WHEN the Nginx `location = /` block on the public site receives a request for `/student-portal` THEN the system does not fall through to the SPA catch-all `try_files` rule, preventing React Router from handling the route

**Issue 4 — Uploads Folder Not Transferred**

1.6 WHEN the backend attempts to serve a student or teacher profile image via `/uploads/students/<filename>` THEN the system returns a 404 because the `uploads/` directory was never transferred from the local machine to `/var/www/edwardian-academy-erp/backend/uploads/`

1.7 WHEN the `scp -r backend/uploads` command was executed during deployment THEN the system failed silently because the command was run from the wrong directory, resulting in no files being copied

**Issue 5 — Missing Font Packages in package.json**

1.8 WHEN the frontend is built on the server via `npm run build` after a fresh `npm install` THEN the system fails to compile because `@fontsource/inter` and `@fontsource/playfair-display` are imported in source files but are absent from `package.json` dependencies

1.9 WHEN these font packages are missing from `package.json` THEN the system requires manual `npm install` of the packages on every redeploy, making automated CI/CD and fresh deployments unreliable

---

### Expected Behavior (Correct)

**Issue 1 — Database Migration**

2.1 WHEN `mongorestore` is run against the archive with the correct namespace mapping (or after re-dumping from the laptop with `--forceCompatibleOptions`) THEN the system SHALL successfully restore all documents from `edwardianDB` into the `edwardian-erp` database, with document counts matching the source dump

2.2 WHEN the production backend connects to `edwardian-erp` after a successful restore THEN the system SHALL find all 30 collections populated with the expected seed/live data

**Issue 2 — Dashboard Data Load**

2.3 WHEN an authenticated owner visits the ERP dashboard after the database is populated THEN the system SHALL display correct student counts, teacher counts, fee collection percentages, and fully rendered analytics, revenue, and academy pool widgets

**Issue 3 — Student Portal**

2.4 WHEN a user navigates to `edwardiansacademy.com/student-portal` THEN the system SHALL serve the React SPA `index.html` and allow React Router to render the student portal page without returning a 400 error

2.5 WHEN the Nginx config for the public site is corrected THEN the system SHALL route all non-asset paths (including `/student-portal` and any sub-paths) through the SPA `try_files $uri $uri/ /index.html` fallback

**Issue 4 — Uploads Folder**

2.6 WHEN the `uploads/` directory is transferred from the local machine to `/var/www/edwardian-academy-erp/backend/uploads/` THEN the system SHALL serve profile images and other uploaded assets correctly via the `/uploads/` Express static route

2.7 WHEN the backend starts THEN the system SHALL have the `uploads/students/` subdirectory present (created automatically by `middleware/upload.js` if missing) so that new uploads do not fail

**Issue 5 — Font Packages**

2.8 WHEN `@fontsource/inter` and `@fontsource/playfair-display` are added to `package.json` dependencies THEN the system SHALL build successfully on a fresh `npm install` without requiring any manual package installation steps

2.9 WHEN a redeploy is performed from a clean environment THEN the system SHALL complete `npm run build` without font-related import errors

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a valid admin user submits correct credentials at `erp.edwardiansacademy.com/login` THEN the system SHALL CONTINUE TO authenticate successfully and issue a JWT cookie

3.2 WHEN the backend receives any API request THEN the system SHALL CONTINUE TO enforce CORS rules, allowing only origins listed in `CORS_ALLOWED_ORIGINS` in production

3.3 WHEN the public homepage at `edwardiansacademy.com` is requested THEN the system SHALL CONTINUE TO serve the static frontend build correctly with SSL

3.4 WHEN a student uploads a profile photo through the student portal THEN the system SHALL CONTINUE TO validate file type (JPEG/PNG only) and enforce the 5MB size limit

3.5 WHEN the PM2 process `edwardian-api` is running THEN the system SHALL CONTINUE TO auto-restart on server reboot as configured

3.6 WHEN the daily MongoDB backup cron runs THEN the system SHALL CONTINUE TO execute without interference from the restored data

3.7 WHEN the backend connects to MongoDB using the `edwardianApp` credentials with `authSource=edwardian-erp` THEN the system SHALL CONTINUE TO authenticate successfully against the `edwardian-erp` database

3.8 WHEN any route under `/api/` is requested THEN the system SHALL CONTINUE TO be proxied correctly by Nginx from `api.edwardiansacademy.com` to `127.0.0.1:5000`

---

## Bug Condition Pseudocode

### Issue 1 — Database Migration

```pascal
FUNCTION isBugCondition_DataMigration(X)
  INPUT: X = { archivePath, sourceDbName, targetDbName, sourceMongodVersion, targetMongodVersion }
  OUTPUT: boolean

  RETURN X.sourceDbName ≠ X.targetDbName
      AND X.sourceMongodVersion > X.targetMongodVersion
      AND nsMapping NOT applied OR nsMapping applied with incompatible wire protocol
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_DataMigration(X) DO
  result ← mongorestore'(X)  // fixed: re-dump with --forceCompatibleOptions OR upgrade server MongoDB
  ASSERT result.documentsRestored > 0
  ASSERT result.collectionsPopulated = 30
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_DataMigration(X) DO
  ASSERT mongorestore(X) = mongorestore'(X)  // existing restore behavior unchanged
END FOR
```

### Issue 3 — Student Portal 400

```pascal
FUNCTION isBugCondition_StudentPortal(X)
  INPUT: X = { requestPath, nginxLocationBlock }
  OUTPUT: boolean

  RETURN X.requestPath STARTS WITH "/student-portal"
      AND X.nginxLocationBlock = "location = /"  // exact-match block intercepts before try_files
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_StudentPortal(X) DO
  result ← nginxRoute'(X)
  ASSERT result.httpStatus = 200
  ASSERT result.body CONTAINS "<div id=\"root\">"
END FOR
```

### Issue 5 — Missing Font Packages

```pascal
FUNCTION isBugCondition_FontPackages(X)
  INPUT: X = { packageJsonDeps, sourceImports }
  OUTPUT: boolean

  RETURN "@fontsource/inter" ∈ X.sourceImports
      AND "@fontsource/inter" ∉ X.packageJsonDeps
      OR "@fontsource/playfair-display" ∈ X.sourceImports
      AND "@fontsource/playfair-display" ∉ X.packageJsonDeps
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_FontPackages(X) DO
  result ← npmBuild'(X)
  ASSERT result.exitCode = 0
  ASSERT result.errors = []
END FOR
```
