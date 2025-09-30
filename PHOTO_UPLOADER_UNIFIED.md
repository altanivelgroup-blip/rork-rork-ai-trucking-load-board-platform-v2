# Unified PhotoUploader Component

## Summary

Both **drivers** and **shippers** now use the **same PhotoUploader component** (`components/PhotoUploader.tsx`). The component is role-aware and automatically organizes photos based on the user's role.

## What Changed

### ✅ Enhanced PhotoUploader
- **Role-aware storage paths**: Photos are now stored in `loads/{loadId}/{role}/{userId}/{photoId}`
  - Driver photos: `loads/load-123/driver/user-abc/photo_xyz.jpg`
  - Shipper photos: `loads/load-123/shipper/user-def/photo_xyz.jpg`
- **Context support**: Added optional `context` prop for future use (load, vehicle, document, other)
- **Automatic role detection**: Uses `useAuth()` hook to detect user role
- **Same great features**: Progress indicators, compression, error handling, multiple selection

### ✅ Updated Storage Rules
- Added new path pattern to support role-based organization
- Maintains backward compatibility with old path structure
- Public read access, authenticated write/delete with user ownership validation

## Usage

### For Drivers (in post-load.tsx)
```tsx
<PhotoUploader
  draftId={draftId}
  photos={photos}
  onPhotosChange={setPhotos}
  maxPhotos={20}
  disabled={isPosting}
/>
```

### For Shippers (same component!)
```tsx
<PhotoUploader
  draftId={draftId}
  photos={photos}
  onPhotosChange={setPhotos}
  maxPhotos={20}
  disabled={isPosting}
/>
```

## Benefits

1. **Single Source of Truth**: One component to maintain, update, and improve
2. **Role-Based Organization**: Photos are automatically organized by role in Firebase Storage
3. **Better Audit Trail**: Easy to see who uploaded what (driver vs shipper)
4. **Consistent UX**: Both roles get the same great upload experience
5. **Future-Proof**: Easy to add new contexts (vehicle photos, documents, etc.)

## Storage Structure

```
Firebase Storage
└── loads/
    └── {loadId}/
        ├── driver/
        │   └── {userId}/
        │       ├── photo_1234_abc.jpg
        │       └── photo_5678_def.jpg
        └── shipper/
            └── {userId}/
                ├── photo_9012_ghi.jpg
                └── photo_3456_jkl.jpg
```

## Features

- ✅ **Progress indicators** - Real-time upload progress for each photo
- ✅ **Image compression** - Automatic compression to 1920x1080 @ 80% quality
- ✅ **Multiple selection** - Upload multiple photos at once
- ✅ **Camera support** - Take photos directly (mobile only)
- ✅ **Error handling** - User-friendly error messages
- ✅ **Photo deletion** - Remove photos with automatic storage cleanup
- ✅ **Photo limits** - Configurable max photos (default 20)
- ✅ **Cross-platform** - Works on iOS, Android, and Web

## Next Steps (Optional Enhancements)

1. **Add metadata tracking**: Store upload metadata in Firestore subcollection
2. **Photo captions**: Allow users to add captions to photos
3. **Photo reordering**: Drag and drop to reorder photos
4. **Photo preview**: Full-screen photo viewer
5. **Batch operations**: Select multiple photos for deletion

## Migration Notes

- **No breaking changes**: Existing photos continue to work
- **New uploads**: Use new role-based path structure
- **Storage rules**: Updated to support both old and new paths
- **Backward compatible**: Old path structure still supported
