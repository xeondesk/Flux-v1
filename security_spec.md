# Security Specification: Flux Agentic IDE (Zero-Trust Security Blueprint)

This document maps out the logical data invariants and access controls for the Flux Agentic IDE application of users' development sandboxes. This is a multi-tenant platform where files, credential vaults, and permission policies are governed synchronously on a lease-bound permission structure.

---

## 1. Core Data Invariants & Zero-Trust Architecture

1. **Isolation Invariant**: A user (`userId`) is the sole trustee of their sandboxed IDE workspace. All workspace configurations (including files, planning boards, credential secrets, and agent toggles) are rooted under parent `/users/{userId}/`. Access is denied when requesting paths containing other user IDs or un-authenticated reads.
2. **Immutable Timestamp Invariant**: Creation fields (`createdAt`) must exactly equal Firestore's transaction server-timestamp (`request.time`). Inbound updates on original creator IDs (`ownerId`, `userId`) or static properties are structurally forbidden.
3. **Vault Security Invariant**: Credential secrets (`credentials` collection) storing developer access keys must strictly prevent reads from third-party agents or other clients. Writing active permissions requires verification of email and tenant binding.
4. **Policy Switch Integrity**: Active policies that restrict network dial-out or CLI executions cannot be bypassed by client scripts pushing arbitrary keys or metadata. Schema rules must exact-match key arrays.

---

## 2. The "Dirty Dozen" Privilege-Escalation Payloads

The following payloads define structural attacks on the system's security boundaries. All payloads must return `PERMISSION_DENIED` back to the client.

### Case 1: Identity Spoofing (Write to another user's files)
An authenticated attacker (`attacker_uid`) attempts to write or edit a file in a different developer's index.
* **Path**: `/users/victim_uid/files/src_index_js`
* **Payload**:
```json
{
  "path": "src/index.js",
  "content": "恶意修改的内容",
  "language5": "javascript"
}
```

### Case 2: Shadow Field Injection ("isVerified: true" on Register)
Attempting to register a custom privilege level, bypass schema boundaries, or write additional metadata inside the user's workspace config.
* **Path**: `/users/user_123/permissions/file-agent`
* **Payload**:
```json
{
  "id": "file-agent",
  "name": "File Workspace Architect",
  "role": "I/O Specialist",
  "description": "Exploited Workspace privilege",
  "fileSystemAccess": true,
  "terminalAccess": true,
  "externalAPIAccess": true,
  "isCoreRootSuperuser": true,
  "bypassPolicyChecks": true
}
```

### Case 3: Invariant Key Mismatch / Orphan Creation on Credentials
Inserting an active API credential token with an owner parameter linking it to a different agent domain on create.
* **Path**: `/users/user_123/credentials/cred-spoof`
* **Payload**:
```json
{
  "id": "cred-spoof",
  "agentId": "different-scammer-agent",
  "agentName": "Malicious Spoofer",
  "serviceName": "Spoofed Gemini Router Key",
  "tokenValue": "flx_gemini_api_victim_auth_key",
  "status": "active",
  "lastVerified": "2026-05-20 16:30"
}
```

### Case 4: Timestamp Hijack (Client-side Spoofed Temporal History)
Injecting a historic timestamps object during an execution log register event rather than conforming to server transaction bounds.
* **Path**: `/users/user_123/logs/log_item_456`
* **Payload**:
```json
{
  "id": "log_item_456",
  "message": "Orchestrated backdoor build.",
  "createdAt": "2010-01-01T00:00:00Z"
}
```

### Case 5: Resource Poisoning (1.5MB Overflow attack on Document Paths)
Using extended string character sets to over-allocate index storage, creating recursive denial-of-wallet resource depletion.
* **Path**: `/users/user_123/files/OVERFLOW_PATH_AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRSSTTUUVVWWXXYYZZ` (Length > 128 characters or containing illegal characters)
* **Payload**:
```json
{
  "path": "test.js",
  "content": "const foo = 'something';",
  "language": "javascript"
}
```

### Case 6: PII Leak Blanket Reads
Attempting to read user profiles or information records belonging to another developer workspace via a list or collection group query.
* **Path**: `/users/victim_user_id/private/info`
* **Read Attempt**: Standard listing queries from `attacker_uid`.

### Case 7: Terminal State Lock-Bypass
An update operation attempting to edit a step inside the planner sequence after the step has marked itself with a `status: "completed"` or terminal status.
* **Path**: `/users/user_123/plan/item_completed`
* **Payload**:
```json
{
  "id": "item_completed",
  "label": "Inject arbitrary updates",
  "priority": "high",
  "completed": false,
  "createdAt": "2026-05-20T16:30:00Z"
}
```

### Case 8: Privileged User Email Spoofing
Authenticated spoofing where user sets custom scopes inside an auth token context but lacks verified status inside auth provider.
* **Read Attempt**: Requesting keys from the key vault while `request.auth.token.email_verified == false`.

### Case 9: Multi-Writer Concurrent Hijack (Concurrency Field update)
Updating the absolute status fields inside the agent config to gain high privilege keys without checking original schema constraint maps.
* **Path**: `/users/user_123/credentials/cred-1`
* **Payload**:
```json
{
  "id": "cred-1",
  "serviceName": "Injected OAuth bypass token",
  "tokenValue": "flx_vfs_io_auth_spoofed",
  "status": "active",
  "lastVerified": "2026-05-20 16:30"
}
```

### Case 10: Array Guard Overload
Writing unlimited nested tags lists or memory arrays under search configurations to slow down workspace reads.
* **Path**: `/users/user_123/vectors/item_1`
* **Payload**:
```json
{
  "id": "item_1",
  "text": "Memory embedding record",
  "timestamp": "2026-05-20 16:30",
  "score": 0.99,
  "agentId": "memory-agent",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"]
}
```

### Case 11: Insecure Client Delegation Scraping
Reading the whole collection of other people's credential keys via unbounded collection queries without specific filtering.
* **Collection Path**: `/users/victim_uid/credentials`
* **Action**: listing query from `attacker_uid`.

### Case 12: Superuser / Admin Escaping
Attacking the administrative collection `/admins/attacker_uid` by writing self-assigned admin keys directly.
* **Path**: `/admins/attacker_uid`
* **Payload**:
```json
{
  "role": "admin",
  "expiresAt": "2029-01-01 12:00"
}
```

---

## 3. The Security Assertion Test Runner Configuration (Summary)

```typescript
// firestore.rules.test.ts Configuration Model
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("Flux Security Fortress", () => {
  it("rejects unauthorized multi-user reading", async () => {
    // Assert case 1, 6, and 11
  });
  it("rejects invalid key arrays or shadow configurations", async () => {
    // Assert case 2, 3, and 10
  });
  it("forbids temporal modifications post-creation", async () => {
    // Assert case 4, 7 and 12
  });
});
```
