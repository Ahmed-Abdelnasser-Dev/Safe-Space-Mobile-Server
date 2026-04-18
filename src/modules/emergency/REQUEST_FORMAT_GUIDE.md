# Emergency Request API - Headers & Body Reference

This document provides detailed information about request headers and body formats for the `/emergency/request` endpoint.

---

## JSON Request (Without Photo)

### Headers

```http
POST /emergency/request HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Accept: application/json
Content-Length: 234
```

### Body (Raw JSON)

```json
{
  "emergencyTypes": ["CAR_ACCIDENT", "MEDICAL_EMERGENCY"],
  "emergencyServices": ["POLICE", "AMBULANCE"],
  "description": "Multi-vehicle collision on Highway 101. Multiple injuries reported. Need immediate assistance.",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "timestamp": "2026-02-02T15:30:00.000Z"
}
```

### Complete cURL Example

```bash
curl -X POST http://localhost:3000/emergency/request \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "emergencyTypes": ["CAR_ACCIDENT"],
    "emergencyServices": ["POLICE", "AMBULANCE"],
    "description": "Accident on Main Street. Two cars involved.",
    "location": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  }'
```

---

## Multipart/Form-Data Request (With Photo)

### Headers

```http
POST /emergency/request HTTP/1.1
Host: localhost:3000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
Accept: application/json
Content-Length: 45678
```

**Important:** When using `multipart/form-data`, the browser/client automatically sets the `boundary` parameter. Don't set it manually.

### Body Structure

```
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="emergencyTypes"

["CAR_ACCIDENT","MEDICAL_EMERGENCY"]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="emergencyServices"

["POLICE","AMBULANCE"]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="description"

Multi-vehicle collision on Highway 101. Multiple injuries reported.
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="location"

{"lat":37.7749,"lng":-122.4194}
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="timestamp"

2026-02-02T15:30:00.000Z
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="photo"; filename="emergency.jpg"
Content-Type: image/jpeg

[Binary image data]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

### Complete cURL Example with Photo

```bash
curl -X POST http://localhost:3000/emergency/request \
  -H "Accept: application/json" \
  -F 'emergencyTypes=["CAR_ACCIDENT"]' \
  -F 'emergencyServices=["POLICE","AMBULANCE"]' \
  -F 'description=Accident on Main Street with injuries' \
  -F 'location={"lat":37.7749,"lng":-122.4194}' \
  -F 'photo=@/path/to/emergency-photo.jpg'
```

---

## JavaScript/Fetch Examples

### 1. JSON Request (No Photo)

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

const body = JSON.stringify({
  emergencyTypes: ['CAR_ACCIDENT', 'MEDICAL_EMERGENCY'],
  emergencyServices: ['POLICE', 'AMBULANCE'],
  description: 'Multi-vehicle collision. Multiple injuries.',
  location: {
    lat: 37.7749,
    lng: -122.4194
  },
  timestamp: new Date().toISOString()
});

const response = await fetch('http://localhost:3000/emergency/request', {
  method: 'POST',
  headers: headers,
  body: body
});

const result = await response.json();
console.log(result);
```

### 2. FormData Request (With Photo)

```javascript
const formData = new FormData();

// Add fields as JSON strings
formData.append('emergencyTypes', JSON.stringify(['CAR_ACCIDENT']));
formData.append('emergencyServices', JSON.stringify(['POLICE', 'AMBULANCE']));
formData.append('description', 'Accident with photo evidence');
formData.append('location', JSON.stringify({ lat: 37.7749, lng: -122.4194 }));
formData.append('timestamp', new Date().toISOString());

// Add photo file
const photoFile = document.getElementById('photoInput').files[0];
formData.append('photo', photoFile, 'emergency-photo.jpg');

// Headers - DO NOT set Content-Type manually!
// Fetch will set it automatically with the correct boundary
const headers = {
  'Accept': 'application/json',
  // NO Content-Type header!
};

const response = await fetch('http://localhost:3000/emergency/request', {
  method: 'POST',
  headers: headers,
  body: formData
});

const result = await response.json();
console.log(result);
```

### 3. React Native Example (No Photo)

```typescript
const createEmergencyRequest = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const body = JSON.stringify({
    emergencyTypes: ['MEDICAL_EMERGENCY'],
    emergencyServices: ['AMBULANCE'],
    description: 'Heart attack symptoms - urgent',
    location: {
      lat: 37.7749,
      lng: -122.4194
    },
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch('http://localhost:3000/emergency/request', {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Success:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

### 4. React Native Example (With Photo)

```typescript
const createEmergencyRequestWithPhoto = async (photoUri: string) => {
  const formData = new FormData();

  // Add emergency data
  formData.append('emergencyTypes', JSON.stringify(['CAR_ACCIDENT']));
  formData.append('emergencyServices', JSON.stringify(['POLICE']));
  formData.append('description', 'Accident with photo evidence');
  formData.append('location', JSON.stringify({ lat: 37.7749, lng: -122.4194 }));
  formData.append('timestamp', new Date().toISOString());

  // Add photo - React Native format
  const filename = photoUri.split('/').pop() || 'emergency-photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('photo', {
    uri: photoUri,
    name: filename,
    type: type,
  } as unknown);

  // Headers - don't set Content-Type for FormData
  const headers = {
    'Accept': 'application/json',
  };

  try {
    const response = await fetch('http://localhost:3000/emergency/request', {
      method: 'POST',
      headers: headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create emergency request');
    }

    const result = await response.json();
    console.log('Success:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

---

## Axios Examples

### 1. JSON Request

```javascript
import axios from 'axios';

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

const data = {
  emergencyTypes: ['FIRE'],
  emergencyServices: ['FIRE_DEPARTMENT'],
  description: 'Building fire on Main Street',
  location: {
    lat: 37.7749,
    lng: -122.4194
  },
  timestamp: new Date().toISOString()
};

try {
  const response = await axios.post(
    'http://localhost:3000/emergency/request',
    data,
    { headers }
  );
  console.log('Success:', response.data);
} catch (error) {
  console.error('Error:', error.response?.data || error.message);
}
```

### 2. FormData Request (With Photo)

```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('emergencyTypes', JSON.stringify(['CAR_ACCIDENT']));
formData.append('emergencyServices', JSON.stringify(['POLICE']));
formData.append('description', 'Accident with injuries');
formData.append('location', JSON.stringify({ lat: 37.7749, lng: -122.4194 }));

// Add photo file
const photoFile = document.getElementById('photoInput').files[0];
formData.append('photo', photoFile);

try {
  const response = await axios.post(
    'http://localhost:3000/emergency/request',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      }
    }
  );
  console.log('Success:', response.data);
} catch (error) {
  console.error('Error:', error.response?.data || error.message);
}
```

---

## Request Body Field Details

### Required Fields

| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `emergencyTypes` | `string[]` | JSON array of enums | `["CAR_ACCIDENT"]` | Min 1 item |
| `emergencyServices` | `string[]` | JSON array of enums | `["POLICE", "AMBULANCE"]` | Min 1 item |
| `description` | `string` | Plain text | `"Accident on Main St"` | 1-500 characters |
| `location` | `object` | JSON object | `{"lat": 37.7749, "lng": -122.4194}` | Required |
| `location.lat` | `number` | Float | `37.7749` | -90 to 90 |
| `location.lng` | `number` | Float | `-122.4194` | -180 to 180 |

### Optional Fields

| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `timestamp` | `string` | ISO 8601 DateTime | `"2026-02-02T15:30:00.000Z"` | Auto-generated if not provided |
| `photo` | `File/Blob` | Binary file | - | Multipart/form-data only |

### Important Notes for FormData

When using `multipart/form-data`:

1. **Arrays and Objects must be JSON stringified:**
   ```javascript
   // ✅ Correct
   formData.append('emergencyTypes', JSON.stringify(['CAR_ACCIDENT']));
   formData.append('location', JSON.stringify({ lat: 37.7749, lng: -122.4194 }));
   
   // ❌ Wrong
   formData.append('emergencyTypes', ['CAR_ACCIDENT']);
   formData.append('location', { lat: 37.7749, lng: -122.4194 });
   ```

2. **Don't manually set Content-Type boundary:**
   ```javascript
   // ✅ Correct - let browser/fetch set it
   const headers = {
     'Accept': 'application/json'
   };
   
   // ❌ Wrong - don't set Content-Type for FormData
   const headers = {
     'Content-Type': 'multipart/form-data'
   };
   ```

3. **Photo file format (React Native):**
   ```javascript
   formData.append('photo', {
     uri: photoUri,
     name: 'emergency-photo.jpg',
     type: 'image/jpeg'
   });
   ```

---

## Response Format

### Success Response (201 Created)

**Headers:**
```http
HTTP/1.1 201 Created
Content-Type: application/json
Content-Length: 456
```

**Body:**
```json
{
  "success": true,
  "message": "Emergency request created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "emergencyTypes": ["CAR_ACCIDENT", "MEDICAL_EMERGENCY"],
    "emergencyServices": ["POLICE", "AMBULANCE"],
    "description": "Multi-vehicle collision on Highway 101. Multiple injuries.",
    "photoUri": "/uploads/1643801400-photo.jpg",
    "lat": 37.7749,
    "lng": -122.4194,
    "timestamp": "2026-02-02T15:30:00.000Z",
    "status": "QUEUED",
    "createdAt": "2026-02-02T15:30:05.000Z"
  }
}
```

### Error Response (400 Bad Request)

**Headers:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

**Body:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "description",
      "message": "Description cannot exceed 500 characters"
    }
  ]
}
```

---

## Common Mistakes & Solutions

### ❌ Mistake 1: Not JSON stringifying arrays in FormData

```javascript
// ❌ Wrong
formData.append('emergencyTypes', ['CAR_ACCIDENT']);

// ✅ Correct
formData.append('emergencyTypes', JSON.stringify(['CAR_ACCIDENT']));
```

### ❌ Mistake 2: Manually setting Content-Type for FormData

```javascript
// ❌ Wrong
fetch(url, {
  headers: { 'Content-Type': 'multipart/form-data' },
  body: formData
});

// ✅ Correct
fetch(url, {
  headers: { 'Accept': 'application/json' },
  body: formData
});
```

### ❌ Mistake 3: Invalid location coordinates

```javascript
// ❌ Wrong - lat/lng out of range
{
  location: { lat: 200, lng: -300 }
}

// ✅ Correct
{
  location: { lat: 37.7749, lng: -122.4194 }
}
```

### ❌ Mistake 4: Empty arrays

```javascript
// ❌ Wrong - at least 1 required
{
  emergencyTypes: [],
  emergencyServices: []
}

// ✅ Correct
{
  emergencyTypes: ['CAR_ACCIDENT'],
  emergencyServices: ['POLICE']
}
```

### ❌ Mistake 5: Description too long

```javascript
// ❌ Wrong - exceeds 500 characters
{
  description: "Very long description...".repeat(100)
}

// ✅ Correct - max 500 characters
{
  description: "Concise emergency description"
}
```

---

## Testing with Postman

### Setup

1. **Method:** POST
2. **URL:** `http://localhost:3000/emergency/request`
3. **Headers Tab:**
   - For JSON: Add `Content-Type: application/json`
   - For FormData: Don't add Content-Type (Postman handles it)

### JSON Request (Body → raw → JSON)

```json
{
  "emergencyTypes": ["CAR_ACCIDENT"],
  "emergencyServices": ["POLICE", "AMBULANCE"],
  "description": "Test emergency request",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  }
}
```

### FormData Request (Body → form-data)

| Key | Value | Type |
|-----|-------|------|
| emergencyTypes | `["CAR_ACCIDENT"]` | Text |
| emergencyServices | `["POLICE", "AMBULANCE"]` | Text |
| description | `Test emergency with photo` | Text |
| location | `{"lat":37.7749,"lng":-122.4194}` | Text |
| photo | (select file) | File |

---

## Summary

### For JSON Requests (No Photo)
- ✅ Set `Content-Type: application/json`
- ✅ Use `JSON.stringify()` for body
- ✅ All fields in their native format

### For Multipart Requests (With Photo)
- ✅ **Don't** set Content-Type header manually
- ✅ JSON.stringify arrays and objects
- ✅ Use FormData API
- ✅ Append photo as File/Blob

### Field Requirements
- ✅ emergencyTypes: min 1 item
- ✅ emergencyServices: min 1 item
- ✅ description: 1-500 chars
- ✅ location.lat: -90 to 90
- ✅ location.lng: -180 to 180
- ✅ timestamp: optional (auto-generated)
- ✅ photo: optional
