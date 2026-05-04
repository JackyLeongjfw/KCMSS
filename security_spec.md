# Security Specification - Vocab Battle Arena

## 1. Data Invariants
- Users can only edit their own profiles.
- Any user can read other users' basic stats for the leaderboard.
- Battle rooms are created by any signed-in user.
- A user can only join a battle room if it's in 'waiting' status and has fewer than 2 players.
- Only players in the room can update their own progress and score.
- The `winnerId` can only be set when the status is changing to 'finished'.
- Bot rooms (`bot_ai` uid) follow the same update rules, but the client updates for the bot are allowed if the user is the other player in that room.

## 2. Dirty Dozen Payloads (Target: Rejection)
1. **Identity Spoofing**: User A updates User B's profile.
2. **XP Hack**: User updates their own XP by +1,000,000 in one go.
3. **Room Hijack**: User A (not in room) updates room status to 'finished' and sets themselves as winner.
4. **Multi-Vote**: Player in room updates opponent's score.
5. **Ghost Field**: Adding `isAdmin: true` to a user profile.
6. **Toxic ID**: Creating a room with a 1MB string as ID.
7. **Premature Victory**: Setting `winnerId` while status is still 'active'.
8. **Stat Tamper**: Overwriting `createdAt` to a date in the past.
9. **Illegal Join**: Joining a room that already has 2 players.
10. **State Shortcut**: Moving from 'waiting' directly to 'finished' without 'active'.
11. **PII Leak**: Reading private user info (if any existed, though we focus on EnglishName).
12. **Anonymous Chaos**: Non-signed-in user trying to write to `users` (we allow guests in `battle_rooms` but not `users` profile persistence).

## 3. Test Runner
We will implement logic in `firestore.rules` to prevent these.
