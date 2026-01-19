# Data Science Chatbot Frontend

React-based frontend for the Data Science & ML Chatbot.

## Features

- **Modern Chat Interface**: Clean, responsive design with gradient styling
- **File Upload**: Upload CSV, Excel, or PDF files for analysis
- **Real-time Analysis**: Get instant insights from your data
- **Markdown Support**: Agent responses formatted with markdown
- **Quick Actions**: Pre-defined prompts for common tasks
- **Session Management**: Maintains conversation context

## Setup

### Prerequisites

- Node.js 16+ and npm
- Backend API running on `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
```

Builds the app for production to the `build/` folder.

## Configuration

### API URL

By default, the frontend connects to `http://localhost:8000`. To change this:

1. Create a `.env` file in the `frontend/` directory:
   ```
   REACT_APP_API_URL=https://your-api-url.com
   ```

2. Restart the development server

### Proxy Setup

The `package.json` includes a proxy configuration for development:
```json
"proxy": "http://localhost:8000"
```

This allows relative API calls during development.

## Usage

### Starting a Chat

1. The app automatically creates a session on load
2. Upload a file using the "Upload File" button (optional)
3. Type your question or click a quick action
4. Press "Send" or hit Enter

### Quick Actions

- **Perform comprehensive EDA with insights**: Full exploratory data analysis
- **Generate insights about data quality**: Focus on data quality issues
- **What patterns can you detect?**: Pattern detection
- **Create visualizations for key findings**: Generate charts

### Example Queries

```
- "Analyze this CSV file and provide insights"
- "What is the correlation between age and salary?"
- "Generate a data story from this dataset"
- "Is there evidence that X is related to Y?"
- "Recommend ML algorithms for classification"
- "Create a correlation heatmap"
```

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ChatMessage.js      # Individual message component
│   │   ├── ChatMessage.css
│   │   ├── FileUpload.js       # File upload component
│   │   └── FileUpload.css
│   ├── App.js                  # Main app component
│   ├── App.css
│   ├── index.js                # Entry point
│   └── index.css
├── package.json
└── README.md
```

## Components

### App.js

Main application component that handles:
- Session creation
- Message state management
- API communication
- File uploads

### ChatMessage.js

Displays individual messages with:
- Role-based styling (user/agent/system)
- Markdown rendering for agent responses
- Timestamps
- Error handling

### FileUpload.js

File upload component supporting:
- CSV files
- Excel files (.xlsx, .xls)
- PDF files
- Drag-and-drop (future enhancement)

## Styling

The frontend uses a modern gradient theme:
- Primary: Purple gradient (`#667eea` to `#764ba2`)
- Background: White with shadows
- Accents: Light gray backgrounds
- Responsive design for mobile devices

## API Integration

The frontend communicates with the backend using axios:

```javascript
// Create session
POST /sessions

// Upload file
POST /upload?session_id={id}

// Send message
POST /analyze
{
  session_id: string,
  message: string,
  file_paths: string[]
}
```

## Deployment

### Netlify/Vercel

1. Build the app: `npm run build`
2. Deploy the `build/` folder
3. Set environment variable: `REACT_APP_API_URL=your-api-url`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "build", "-l", "3000"]
EXPOSE 3000
```

### Nginx

Serve the `build/` folder with nginx:

```nginx
server {
    listen 80;
    root /var/www/html/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
    }
}
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors:
1. Ensure the backend has CORS middleware enabled
2. Check that `allow_origins` includes your frontend URL

### Connection Errors

If the frontend can't connect to the API:
1. Verify the backend is running on the correct port
2. Check the `REACT_APP_API_URL` environment variable
3. Look for firewall or network issues

### File Upload Failures

If file uploads fail:
1. Check file size limits (default: 100MB)
2. Verify file format is supported
3. Check backend logs for errors

## Future Enhancements

- [ ] Drag-and-drop file upload
- [ ] Chart visualization display
- [ ] Export conversation history
- [ ] Dark mode toggle
- [ ] Multi-file upload
- [ ] Real-time streaming responses
- [ ] Voice input
- [ ] Code syntax highlighting
