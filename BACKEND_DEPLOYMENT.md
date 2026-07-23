# CommTrack backend deployment

## Required deployment order

1. Back up the Apps Script project and the `Credentials` spreadsheet.
2. Replace the Apps Script project's backend source with the updated `Code.gs`.
3. Create a new web-app deployment version in Apps Script.
4. Keep the existing `/exec` URL when updating the current deployment. If Google
   gives you a new URL, update `VITE_SHEET_API_URL` before building the frontend.
5. Deploy the frontend after the backend.
6. Sign out and sign in again. Sessions created by the previous backend do not
   contain the new server-issued token.

## Apps Script deployment settings

- Execute the web app as the account that owns the required Sheet, Gmail, and
  Drive resources.
- Prefer organization-only access when every CommTrack user belongs to the same
  Google Workspace domain. Otherwise, the custom CommTrack login is protected
  by the signed server session implemented in `Code.gs`.
- Never expose editor access to the Apps Script project or its Script
  Properties to ordinary application users.

## Credential migration

Existing plaintext password cells remain usable for one successful login. On
that login, the backend automatically replaces the plaintext value with a
salted, server-peppered `v1$...` password record. No manual spreadsheet
conversion is required.

The session signing secret and password pepper are created automatically in
Apps Script Script Properties. Keep those properties intact between
deployments. Deleting the password pepper would make migrated password records
unusable.

## Smoke test after deployment

1. Confirm a valid user can sign in and receives the dashboard.
2. Confirm an invalid password is rejected.
3. Confirm the migrated password cell begins with `v1$`.
4. Open Dashboard, Replies, Reports, Create Email, and assignment/forward lists.
5. Test one status update and confirm its timeline actor is the signed-in user.
6. Test one email only with a safe internal recipient.
7. Open the `/exec?action=getRecords` URL without a token and confirm it returns
   `AUTH_REQUIRED`.
8. Try `/exec?sheet=Credentials` and confirm it cannot return sheet data.

## Operational notes

- Email-producing actions are limited per signed-in user.
- Mutation operations use a script lock to prevent overlapping sheet writes.
- Sessions expire at midnight or after the configured maximum duration.
- Apps Script and Gmail quotas still apply and should be monitored in the
  associated Google Cloud/Apps Script project.
