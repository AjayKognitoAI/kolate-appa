# Data Science Agent API

FastAPI-based REST API for the Data Science & ML Chatbot.

## Quick Start

### Running the API

```bash
# Using uvicorn directly
poetry run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Or using the run script
poetry run python api/main.py
```

The API will be available at: `http://localhost:8000`

API Documentation (Swagger UI): `http://localhost:8000/docs`

## API Endpoints

### Core Endpoints

#### `GET /`
Root endpoint with API information.

#### `GET /health`
Health check endpoint.

#### `GET /tools`
List all available analysis tools.

### Session Management

#### `POST /sessions`
Create a new analysis session.

**Request Body:**
```json
{
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "user_id": "optional_user_id",
  "created_at": "2024-11-23T12:00:00"
}
```

#### `GET /sessions/{session_id}`
Get session information.

#### `DELETE /sessions/{session_id}`
Deactivate a session.

### Analysis

#### `POST /analyze`
Analyze data or answer questions.

**Request Body:**
```json
{
  "session_id": "your_session_id",
  "message": "Analyze this CSV file and show correlations",
  "file_paths": ["data/uploads/file.csv"]
}
```

**Response:**
```json
{
  "response": "Detailed analysis response from the agent",
  "session_id": "your_session_id",
  "timestamp": "2024-11-23T12:00:00"
}
```

### File Management

#### `POST /upload`
Upload a file for analysis.

**Form Data:**
- `session_id`: Session ID
- `file`: File to upload (CSV, Excel, PDF)

**Response:**
```json
{
  "file_id": 1,
  "filename": "data.csv",
  "file_path": "data/uploads/session_id_timestamp_data.csv",
  "file_type": "csv",
  "file_size_bytes": 12345,
  "upload_timestamp": "2024-11-23T12:00:00",
  "message": "File uploaded successfully"
}
```

#### `GET /sessions/{session_id}/files`
List all files uploaded in a session.

### History and Results

#### `GET /sessions/{session_id}/history`
Get conversation history.

**Query Parameters:**
- `limit` (optional): Number of recent turns to retrieve

#### `GET /sessions/{session_id}/analyses`
Get analysis results.

**Query Parameters:**
- `analysis_type` (optional): Filter by analysis type

### Visualizations

#### `GET /visualizations/{filename}`
Download a generated visualization.

## Usage Examples

### Python Client

```python
import requests

BASE_URL = "http://localhost:8000"

# Create session
response = requests.post(f"{BASE_URL}/sessions", json={"user_id": "user123"})
session_id = response.json()["session_id"]

# Upload file
with open("data.csv", "rb") as f:
    files = {"file": f}
    data = {"session_id": session_id}
    response = requests.post(f"{BASE_URL}/upload", files=files, params=data)
    file_path = response.json()["file_path"]

# Analyze
response = requests.post(f"{BASE_URL}/analyze", json={
    "session_id": session_id,
    "message": "Provide descriptive statistics for all numeric columns",
    "file_paths": [file_path]
})
print(response.json()["response"])

# Get history
response = requests.get(f"{BASE_URL}/sessions/{session_id}/history")
history = response.json()
```

### JavaScript Client

```javascript
const BASE_URL = 'http://localhost:8000';

// Create session
const sessionResponse = await fetch(`${BASE_URL}/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'user123' })
});
const { session_id } = await sessionResponse.json();

// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const uploadResponse = await fetch(`${BASE_URL}/upload?session_id=${session_id}`, {
  method: 'POST',
  body: formData
});
const { file_path } = await uploadResponse.json();

// Analyze
const analyzeResponse = await fetch(`${BASE_URL}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: session_id,
    message: 'Analyze this data',
    file_paths: [file_path]
  })
});
const result = await analyzeResponse.json();
console.log(result.response);
```

### cURL Examples

```bash
# Create session
curl -X POST http://localhost:8000/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123"}'

# Upload file
curl -X POST "http://localhost:8000/upload?session_id=YOUR_SESSION_ID" \
  -F "file=@data.csv"

# Analyze
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "YOUR_SESSION_ID",
    "message": "Show descriptive statistics",
    "file_paths": ["data/uploads/file.csv"]
  }'

# Get history
curl http://localhost:8000/sessions/YOUR_SESSION_ID/history
```

## Frontend Integration

### React Example

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const DataScienceChat = () => {
  const [sessionId, setSessionId] = useState(null);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const createSession = async () => {
    const res = await axios.post('http://localhost:8000/sessions', {
      user_id: 'react_user'
    });
    setSessionId(res.data.session_id);
  };

  const sendMessage = async () => {
    const res = await axios.post('http://localhost:8000/analyze', {
      session_id: sessionId,
      message: message,
      file_paths: []
    });
    setResponse(res.data.response);
  };

  return (
    <div>
      {!sessionId ? (
        <button onClick={createSession}>Start Session</button>
      ) : (
        <>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question..."
          />
          <button onClick={sendMessage}>Send</button>
          <div>{response}</div>
        </>
      )}
    </div>
  );
};
```

## Deployment

### Development
```bash
poetry run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
poetry run uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker
```bash
docker build -t data-science-api .
docker run -p 8000:8000 -e GOOGLE_API_KEY=your_key data-science-api
```

## Security Considerations

For production:
1. Update CORS settings to allow only specific origins
2. Add authentication middleware
3. Implement rate limiting
4. Add input validation and sanitization
5. Use HTTPS
6. Set up proper logging and monitoring

## Error Handling

The API returns standard HTTP status codes:
- `200`: Success
- `400`: Bad request
- `404`: Resource not found
- `500`: Internal server error

Error responses include a detail message:
```json
{
  "detail": "Error description"
}
```
