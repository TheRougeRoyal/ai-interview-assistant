# Database Persistence Configuration

## Issue: Interviews Not Showing in Dashboard

### Problem
Completed interviews were not appearing in the interviewer dashboard because data persistence to the database was disabled.

### Root Cause
The application has two modes of operation controlled by the `NEXT_PUBLIC_PERSIST_TO_API` environment variable:

1. **`PERSIST_TO_API=false`** (Development/Testing Mode)
   - Data stored ONLY in Redux state + localStorage
   - No database persistence
   - Fast for development and testing
   - Data is lost when cache is cleared
   - Interviewer dashboard shows "No candidates yet"

2. **`PERSIST_TO_API=true`** (Production Mode)
   - Data persisted to SQLite database via API routes
   - Candidates visible across sessions and users
   - Interviewer dashboard works correctly
   - Data survives browser refresh and cache clearing

### Solution
Enable database persistence by setting the environment variable in `.env.local`:

```bash
NEXT_PUBLIC_PERSIST_TO_API=true
```

### How It Works

#### Without Persistence (`PERSIST_TO_API=false`)
```
Interview Flow:
1. User uploads resume → Stored in Redux
2. User fills profile → Stored in Redux
3. User completes interview → Stored in Redux
4. Results finalized → Stored in Redux
❌ Interviewer dashboard: Empty (no database records)
```

#### With Persistence (`PERSIST_TO_API=true`)
```
Interview Flow:
1. User uploads resume → Stored in Redux
2. User fills profile → createCandidate() → POST /api/candidates → Database ✅
3. User starts interview → createSession() → POST /api/sessions → Database ✅
4. User answers questions → upsertAnswer() → POST /api/sessions/:id/answers → Database ✅
5. Results finalized → finalizeCandidate() → PATCH /api/candidates/:id → Database ✅
✅ Interviewer dashboard: Shows all completed interviews
```

### Code Reference

The persistence flag is checked in `/lib/http/apiClient.ts`:

```typescript
const PERSIST_TO_API = process.env.NEXT_PUBLIC_PERSIST_TO_API === 'true'

export async function createCandidate(input: CreateCandidateInput) {
  if (!PERSIST_TO_API) {
    // Mock mode - return fake data, no API call
    return { id: `candidate_mock_${Date.now()}`, ...input }
  }
  // Production mode - persist to database
  return fetchAPI('/api/candidates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
```

### When to Use Each Mode

#### Use `PERSIST_TO_API=false` for:
- Unit tests and E2E tests
- Quick UI prototyping
- Offline development
- Testing without database dependencies

#### Use `PERSIST_TO_API=true` for:
- Production deployments
- Staging environments
- Integration testing with real database
- **Testing the interviewer dashboard** (requires real data)
- Multi-user scenarios

### Environment Setup

1. **Development** (with database):
   ```bash
   # .env.local
   NEXT_PUBLIC_PERSIST_TO_API=true
   DATABASE_URL="file:./prisma/dev.db"
   ```

2. **Testing** (no database):
   ```bash
   # .env.test
   NEXT_PUBLIC_PERSIST_TO_API=false
   AI_VENDOR=mock
   ```

3. **Production**:
   ```bash
   # .env.production
   NEXT_PUBLIC_PERSIST_TO_API=true
   DATABASE_URL="postgresql://..."
   ```

### Verification

After enabling persistence, verify it's working:

```bash
# 1. Check environment variable
grep NEXT_PUBLIC_PERSIST_TO_API .env.local

# 2. Restart dev server
npm run dev

# 3. Complete a test interview

# 4. Check database
npx tsx scripts/check-db.ts

# Expected output:
# 📊 Found 1 candidates
# 📝 Found 1 interview sessions
# 💬 Found 6 answers (or however many questions)
```

### Troubleshooting

#### Dashboard Still Empty After Enabling Persistence

1. **Restart the dev server** - Environment variables only load on startup
   ```bash
   # Kill and restart
   npm run dev
   ```

2. **Clear browser cache** - Old localStorage data might interfere
   ```bash
   # In browser DevTools Console:
   localStorage.clear()
   sessionStorage.clear()
   ```

3. **Verify database** - Check if data is actually being saved
   ```bash
   npx tsx scripts/check-db.ts
   ```

4. **Check API logs** - Look for "Creating candidate in database" messages
   ```bash
   # In the interview profile page, watch console for:
   # "🔄 Creating candidate in database..."
   # "✅ Candidate created: candidate_xxx"
   ```

5. **Check for errors** - Look for failed API calls in Network tab
   ```bash
   # Common issues:
   # - 401 Unauthorized: Authentication not working
   # - 500 Server Error: Database connection issue
   # - Network error: Dev server not running
   ```

### Migration Steps

If you have existing test data in localStorage and want to see it in the dashboard:

1. Enable persistence:
   ```bash
   echo "NEXT_PUBLIC_PERSIST_TO_API=true" >> .env.local
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

3. Complete a NEW interview (old localStorage data won't be migrated)

4. Check the interviewer dashboard - you should see the new candidate!

### Related Files
- `/lib/http/apiClient.ts` - Persistence logic
- `/app/(flow)/profile/page.tsx` - Candidate creation
- `/app/(interview)/interviewee/QuestionRunner.tsx` - Session and answer persistence
- `/app/api/candidates/route.ts` - Database write operations
- `/.env.local` - Environment configuration

### Important Note

⚠️ **Always enable persistence for production and demo environments!**

Without persistence enabled, the interviewer dashboard will never show any data, making the application appear broken to interviewers.
