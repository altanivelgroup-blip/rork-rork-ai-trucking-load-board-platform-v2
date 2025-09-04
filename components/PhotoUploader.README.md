# PhotoUploader Component

A comprehensive, reusable photo upload component for React Native with Firebase Storage integration. Designed for the LoadRush app to handle photo uploads for Loads and Vehicles with full CRUD operations, progress tracking, and validation.

## Features

✅ **Upload & Storage**
- Upload photos to Firebase Storage with resumable uploads
- Automatic file validation (MIME type, size, resolution)
- Real-time upload progress tracking
- Support for multiple file selection
- Camera capture support (mobile only)

✅ **Photo Management**
- Set cover/primary photo with star indicator
- Delete photos with confirmation dialog
- View full-size photos in modal
- Automatic thumbnail generation and display
- Photo counter and limits enforcement

✅ **Data Persistence**
- Store photo URLs in Firestore
- Automatic document updates with serverTimestamp
- Support for both Loads and Vehicles collections
- CSV import compatibility

✅ **Validation & Error Handling**
- File type validation (JPG, PNG, WebP, HEIC)
- File size limits (10MB per file)
- Minimum photo requirements (2 for loads, 5 for vehicles)
- Comprehensive error handling with user-friendly messages
- Toast notifications for all operations

✅ **UI/UX**
- Beautiful, responsive grid layout
- Upload progress indicators
- Error state overlays
- Disabled states for limits
- Platform-specific features (camera on mobile only)

## Installation

The component requires these dependencies (already included in the project):

```bash
npm install expo-image-picker firebase react-native-uuid
```

## Basic Usage

```tsx
import { PhotoUploader, useCanPublish } from '@/components/PhotoUploader';

function LoadForm() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string>('');
  
  const canPublish = useCanPublish('load', photos);

  const handlePhotosChange = (photos: string[], primaryPhoto: string) => {
    setPhotos(photos);
    setPrimaryPhoto(primaryPhoto);
  };

  return (
    <View>
      <PhotoUploader
        entityType="load"
        entityId="load-123"
        onChange={handlePhotosChange}
      />
      
      <Button 
        title="Publish Load"
        disabled={!canPublish}
        onPress={handlePublish}
      />
    </View>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityType` | `'load' \| 'vehicle'` | Required | Type of entity for storage path and validation |
| `entityId` | `string` | Required | Unique identifier for the entity |
| `minPhotos` | `number` | `2` for loads, `5` for vehicles | Minimum photos required to publish |
| `maxPhotos` | `number` | `20` | Maximum photos allowed |
| `onChange` | `(photos: string[], primaryPhoto: string) => void` | Optional | Callback when photos change |

## Data Contracts

### Firestore Documents

**Loads Collection (`/loads/{load_id}`)**
```typescript
{
  photos: string[],          // Array of HTTPS URLs
  primaryPhoto: string,      // HTTPS URL of cover photo
  updatedAt: serverTimestamp()
}
```

**Vehicles Collection (`/vehicles/{vehicle_id}`)**
```typescript
{
  photos: string[],          // Array of HTTPS URLs  
  primaryPhoto: string,      // HTTPS URL of cover photo
  updatedAt: serverTimestamp()
}
```

### Firebase Storage Paths

```
/loads/{load_id}/original/{uuid}.{ext}
/vehicles/{vehicle_id}/original/{uuid}.{ext}
```

Future thumbnail support:
```
/loads/{load_id}/thumb/{uuid}_512.jpg
/vehicles/{vehicle_id}/thumb/{uuid}_512.jpg
```

## Validation Rules

### Client-side Validation
- **MIME Types**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/heic`
- **File Size**: Maximum 10MB per file
- **Resolution**: Minimum 1024x768 (warning, not blocking)
- **Count Limits**: Configurable min/max photo counts

### Firebase Storage Rules
```javascript
// Storage rules (already configured)
match /loads/{loadId}/original/{fileName} {
  allow read: if true;
  allow write: if request.auth != null 
    && request.resource.contentType.matches('image/.*')
    && request.resource.size < 10 * 1024 * 1024;
}

match /vehicles/{vehicleId}/original/{fileName} {
  allow read: if true;
  allow write: if request.auth != null 
    && request.resource.contentType.matches('image/.*')
    && request.resource.size < 10 * 1024 * 1024;
}
```

## Helper Functions

### useCanPublish Hook

```tsx
import { useCanPublish } from '@/components/PhotoUploader';

const canPublish = useCanPublish('load', photos, minPhotos);
// Returns boolean indicating if entity can be published
```

## Integration Examples

### Load Creation Form

```tsx
function CreateLoadForm() {
  const [loadData, setLoadData] = useState({...});
  const [photos, setPhotos] = useState<string[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string>('');
  
  const canPublish = useCanPublish('load', photos);

  const handleSubmit = async () => {
    if (!canPublish) {
      alert('Please add at least 2 photos before publishing');
      return;
    }
    
    // Submit load with photos
    await createLoad({
      ...loadData,
      photos,
      primaryPhoto
    });
  };

  return (
    <ScrollView>
      {/* Load form fields */}
      
      <PhotoUploader
        entityType="load"
        entityId={loadData.id}
        onChange={(photos, primaryPhoto) => {
          setPhotos(photos);
          setPrimaryPhoto(primaryPhoto);
        }}
      />
      
      <Button 
        title={canPublish ? "Publish Load" : `Need ${2 - photos.length} more photos`}
        disabled={!canPublish}
        onPress={handleSubmit}
      />
    </ScrollView>
  );
}
```

### Vehicle Listing Form

```tsx
function VehicleListingForm() {
  const [vehicleData, setVehicleData] = useState({...});
  const [photos, setPhotos] = useState<string[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string>('');
  
  const canPublish = useCanPublish('vehicle', photos);

  return (
    <ScrollView>
      {/* Vehicle form fields */}
      
      <PhotoUploader
        entityType="vehicle"
        entityId={vehicleData.id}
        minPhotos={5}
        maxPhotos={15}
        onChange={(photos, primaryPhoto) => {
          setPhotos(photos);
          setPrimaryPhoto(primaryPhoto);
        }}
      />
      
      {!canPublish && (
        <Text style={styles.warning}>
          Vehicle listings require at least 5 photos
        </Text>
      )}
    </ScrollView>
  );
}
```

## CSV Import Integration

When importing data with existing photo URLs:

```tsx
// During CSV import, merge existing URLs into Firestore
const importLoad = async (csvRow: any, loadId: string) => {
  const existingPhotos = csvRow.photo_urls_semicolon?.split(';') || [];
  const primaryPhoto = csvRow.primary_photo_url || '';
  
  await setDoc(doc(db, 'loads', loadId), {
    // ... other load data
    photos: existingPhotos,
    primaryPhoto: primaryPhoto,
    updatedAt: serverTimestamp()
  });
};

// PhotoUploader will load these on first render
<PhotoUploader entityType="load" entityId={loadId} />
```

## Error Handling

The component handles various error scenarios:

- **Upload Failures**: Network issues, storage errors
- **Validation Errors**: Invalid file types, size limits
- **Permission Errors**: Authentication failures
- **Storage Errors**: Quota exceeded, invalid paths
- **Firestore Errors**: Write permission issues

All errors are displayed via toast notifications with user-friendly messages.

## Performance Considerations

- **Resumable Uploads**: Large files can resume if interrupted
- **Progress Tracking**: Real-time upload progress for better UX
- **Lazy Loading**: Photos loaded only when component mounts
- **Optimistic Updates**: UI updates immediately, syncs with server
- **Error Recovery**: Failed uploads can be retried

## Testing

Use the demo page to test all functionality:

```bash
# Navigate to the demo page
/photo-uploader-demo
```

The demo includes:
- Load photo uploader (min 2 photos)
- Vehicle photo uploader (min 5 photos)
- Publish buttons with validation
- Real-time photo count display
- Instructions and usage examples

## Accessibility

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Proper labels and descriptions
- **High Contrast**: Works with system accessibility settings
- **Touch Targets**: Minimum 44px touch targets for mobile

## Browser Compatibility

- **Mobile**: Full camera and gallery support
- **Web**: Gallery selection only (no camera access)
- **File Validation**: Works across all platforms
- **Upload Progress**: Supported on all platforms

## Future Enhancements

- **Drag & Drop Reordering**: Manual photo reordering
- **Thumbnail Generation**: Automatic thumbnail creation
- **Image Compression**: Client-side compression before upload
- **Alt Text Support**: Accessibility descriptions per photo
- **Batch Operations**: Select multiple photos for bulk actions
- **Analytics Integration**: Track upload success rates and errors

## Troubleshooting

### Common Issues

**Photos not loading**
- Check Firebase configuration
- Verify Firestore security rules
- Ensure entity document exists

**Upload failures**
- Check internet connection
- Verify Firebase Storage rules
- Check file size and type limits

**Permission errors**
- Ensure user is authenticated
- Check Firebase Auth configuration
- Verify storage bucket permissions

### Debug Mode

Enable debug logging:

```tsx
// Add to your app's debug configuration
console.log('[PhotoUploader] Debug mode enabled');
```

All operations are logged with `[PhotoUploader]` prefix for easy filtering.