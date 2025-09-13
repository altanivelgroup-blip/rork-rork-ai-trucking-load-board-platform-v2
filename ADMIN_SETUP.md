# Firebase Admin Setup Guide

## 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

## 2. Login to Firebase

```bash
firebase login
```

## 3. Initialize Firebase Functions (if not already done)

```bash
firebase init functions
```

Select:
- Use an existing project: `rork-prod`
- Language: TypeScript
- Use ESLint: Yes
- Install dependencies: Yes

## 4. Deploy the Admin Function

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:setAdminRole
```

## 5. Assign Admin Role

### Option A: Use the Admin Assignment Screen
1. Navigate to `/admin-assignment` in your app
2. Enter the email address you want to grant admin access to
3. Click "Assign Admin Role"

### Option B: Use Firebase Console (Alternative)
1. Go to Firebase Console > Authentication > Users
2. Find the user and copy their UID
3. Use the Firebase Admin SDK or custom claims API

## 6. Test Admin Access

1. Sign in with the email you granted admin access to
2. Navigate to the Report Analytics page
3. You should now see the admin content instead of the lock screen

## 7. Verify Server-Side Protection

The admin check is enforced both client-side and server-side:
- Client-side: `isAdminClient()` checks Firebase Auth custom claims
- Server-side: API endpoints should verify admin claims in the Authorization header

## Troubleshooting

### Function Deployment Issues
- Make sure you're in the project root directory
- Check that `firebase.json` exists and is properly configured
- Verify your Firebase project ID matches

### Permission Denied
- Only the owner email (`altanivelgroup@gmail.com`) can assign admin roles
- Make sure you're signed in with the correct account

### Claims Not Updating
- Use the "Refresh My Claims" button in the admin assignment screen
- Claims can take a few minutes to propagate
- Try signing out and back in

## Security Notes

- Admin claims are stored in Firebase Auth custom claims
- Server-side validation is required for production security
- The owner email list is hardcoded in the Cloud Function
- Add additional owner emails by updating the `allowed` array in `functions/src/index.ts`