# Techy BillBook Firestore Security Specification

## 1. Data Invariants
1. A `/users/{userId}` document may only be read or written by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. `uid` inside the document must match `request.auth.uid` and is immutable after creation.
3. `email` inside the document must match `request.auth.token.email` and is immutable after creation.
4. `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` is immutable on update and `updatedAt` must equal `request.time`.
5. No blanket reads (`allow list`) are permitted on `/users`.
6. Optional `shopPhone` must be empty or a valid 10-digit Indian mobile number (`^[0-9]{10}$`).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write**: `request.auth == null` on `/users/uid1`.
2. **Cross-user read**: Authenticated as `uid2`, attempting `get /users/uid1`.
3. **Collection scraping**: Attempting `list /users` as any user.
4. **Unverified email write**: `request.auth.token.email_verified == false` attempting `create /users/uid1`.
5. **Identity spoofing (`uid`)**: Authenticated as `uid1`, writing `uid: "uid2"` inside `/users/uid1`.
6. **Email spoofing**: Authenticated as `a@gmail.com`, writing `email: "b@gmail.com"`.
7. **Ghost / Shadow field**: Sending `{ ..., isAdmin: true }` on `create` or `update`.
8. **Oversized string injection**: Sending `shopName` with 500 characters (`> 160`).
9. **Path ID poisoning**: Writing to `/users/bad$id!@#` failing `isValidId()`.
10. **Client-forged timestamp**: Sending `createdAt` not equal to `request.time`.
11. **Immutable field mutation**: Updating `uid`, `email`, or `createdAt` via `update`.
12. **Invalid phone format**: Sending `shopPhone: "123-abc"` failing regex `^(|[0-9]{10})$`.
