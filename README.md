# FileSmile - Email to Priority ERP Integration

FileSmile provides seamless integration between email clients (Outlook and Gmail) and Priority ERP, allowing users to attach emails and email attachments directly to Priority documents.

## Project Structure

```
FileSmileJS/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/  # API route handlers
│   │   ├── core/           # Configuration and authentication
│   │   ├── models/         # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── requirements.txt
│   └── .env.example
├── outlook-addin/          # Microsoft Outlook Office.js add-in
│   ├── src/
│   ├── manifest.xml
│   └── taskpane.html
└── gmail-addon/            # Google Gmail add-on
    ├── src/
    └── appsscript.json
```

## Features

### Backend API (Python FastAPI)
- ✅ API key authentication
- ✅ Search Priority documents across configured forms
- ✅ Upload emails and attachments to Priority documents
- ✅ Export attachments staging (temporary file sharing)
- ✅ Optimized Priority OData integration with connection pooling
- ✅ Async/await for concurrent operations

### Outlook Add-in (Office.js)
- ✅ Search Priority documents by type and term
- ✅ Attach entire email as .eml file
- ✅ Select and attach specific email attachments
- ✅ User-friendly task pane interface
- ✅ Secure API key storage

### Gmail Add-on (Apps Script)
- ✅ Card-based UI for Gmail integration
- ✅ Search and attach to Priority documents
- ✅ Email and attachment upload
- ✅ Organization-wide deployment support

## Setup Instructions

### 1. Backend Setup

#### Prerequisites
- Python 3.9+
- Priority ERP with OData API enabled
- Admin Priority credentials for metadata operations

#### Installation

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configuration

Copy `.env.example` to `.env` and configure:

```env
# API Configuration
API_TITLE=FileSmile API
API_VERSION=2.0.0
DEBUG=False
ALLOWED_ORIGINS=https://your-outlook-server.com,https://script.google.com

# Priority ERP Configuration
PRIORITY_BASE_URL=https://your-priority-server.com/odata/Priority
PRIORITY_TABULA_INI=tabula.ini
PRIORITY_COMPANY=your_company
PRIORITY_LANGUAGE=ENG

# Priority API Headers (from your Priority system)
PRIORITY_APP_ID=APP044
PRIORITY_APP_KEY=your_priority_app_key

# Authentication
SECRET_KEY=generate-with-openssl-rand-hex-32
API_KEY_EXPIRE_DAYS=365

# Admin Priority Credentials
PRIORITY_ADMIN_USER=admin_user
PRIORITY_ADMIN_PASSWORD=admin_password
```

#### Run the API

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production (with gunicorn)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### API Documentation

Once running, access the interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 2. Outlook Add-in Setup

#### Prerequisites
- Microsoft 365 subscription with Outlook
- Web server to host the add-in files (HTTPS required)

#### Deployment Steps

1. **Configure the Backend URL**

   Edit `outlook-addin/src/config.js`:
   ```javascript
   const CONFIG = {
       API_BASE_URL: 'https://your-api-server.com/api/v1',
       // ...
   };
   ```

2. **Update Manifest**

   Edit `outlook-addin/manifest.xml` and replace placeholders:
   - `<Id>` - Generate a unique GUID
   - `<ProviderName>` - Your organization name
   - All URLs (https://your-server.com/...) with your hosting URL
   - Icon URLs

3. **Host the Files**

   Upload all files to your web server:
   ```
   https://your-server.com/
   ├── taskpane.html
   ├── commands.html
   ├── src/
   │   ├── config.js
   │   ├── api-client.js
   │   ├── taskpane.js
   │   └── taskpane.css
   └── assets/
       ├── icon-16.png
       ├── icon-32.png
       ├── icon-64.png
       ├── icon-80.png
       └── icon-128.png
   ```

4. **Deploy to Organization**

   **Option A: Microsoft 365 Admin Center (Recommended)**
   1. Go to Microsoft 365 Admin Center
   2. Navigate to Settings > Integrated apps
   3. Click "Upload custom apps"
   4. Upload the `manifest.xml` file
   5. Assign to users or groups

   **Option B: Sideload for Testing**
   1. In Outlook, go to Get Add-ins
   2. Select "My add-ins"
   3. Under "Custom add-ins", click "Add from file"
   4. Upload the `manifest.xml` file

#### User Instructions

1. Open an email in Outlook
2. Click the "FileSmile" button in the ribbon
3. First time: Enter API key or create one with Priority credentials
4. Select document type and search for documents
5. Select a document from search results
6. Choose to attach entire email and/or specific attachments
7. Click "Upload Attachments"

### 3. Gmail Add-on Setup

#### Prerequisites
- Google Workspace account
- Google Cloud Project
- Admin access to deploy organization-wide add-ons

#### Deployment Steps

1. **Create Google Cloud Project**
   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project
   3. Enable Gmail API
   4. Configure OAuth consent screen

2. **Create Apps Script Project**
   1. Go to [Apps Script](https://script.google.com/)
   2. Create a new project
   3. Copy files from `gmail-addon/src/` to the project:
      - `Code.gs`
      - `Handlers.gs`
      - `ApiClient.gs`
      - `GmailUtils.gs`
   4. Copy `appsscript.json` content to project settings

3. **Configure Backend URL**

   In `Code.gs`, update:
   ```javascript
   const CONFIG = {
     API_BASE_URL: 'https://your-api-server.com/api/v1',
     // ...
   };
   ```

4. **Deploy the Add-on**

   **For Testing:**
   1. In Apps Script, click Deploy > Test deployments
   2. Select "Install" to test in your Gmail

   **For Organization-wide Deployment:**
   1. In Apps Script, click Deploy > New deployment
   2. Choose "Add-on" as deployment type
   3. Fill in add-on details and OAuth scopes
   4. Get the deployment ID
   5. In Google Workspace Admin Console:
      - Go to Apps > Google Workspace Marketplace apps
      - Click "Add app" > "Add custom app"
      - Enter the deployment ID
      - Assign to organizational units

#### User Instructions

1. Open Gmail
2. Open any email
3. Click the FileSmile icon in the right sidebar
4. First time: Enter API key or create one
5. Search for Priority documents
6. Select a document
7. Choose files to attach
8. Click "Upload"

## API Usage

### Create API Key

```bash
curl -X POST "http://localhost:8000/api/v1/auth/api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "priority_username": "your_user",
    "priority_password": "your_password",
    "priority_company": "your_company"
  }'
```

Response:
```json
{
  "api_key": "eyJhbGc...",
  "username": "your_user",
  "company": "your_company",
  "expires_at": "2025-11-17T12:00:00"
}
```

### Search Documents

```bash
curl -X POST "http://localhost:8000/api/v1/search/documents" \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": 1,
    "search_term": "123456"
  }'
```

### Upload Attachment

```bash
curl -X POST "http://localhost:8000/api/v1/attachments/upload" \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "AINVOICES",
    "form_key": "(IVNUM=123)",
    "ext_files_form": "EXTFILES",
    "file_description": "Email attachment",
    "file_base64": "base64_encoded_data",
    "file_extension": "pdf"
  }'
```

## Priority ERP Configuration

### Required Forms

Ensure these forms exist in Priority:
- `SOF_FSFORMS` - Form metadata
- `SOF_FSCLMNS_SUBFORM` - Field metadata
- `SOF_FSGROUPS` - Search groups
- `SOF_FSGROUPEXEC_SUBFORM` - Group forms mapping
- `EXTFILES_SUBFORM` - Document attachments
- `EXTFILESFILESMILE` - Export attachments staging

### Search Group Configuration

1. Define search groups in `SOF_FSGROUPS`
2. Add forms to groups in `SOF_FSGROUPEXEC_SUBFORM`
3. Configure searchable fields in `SOF_FSCLMNS_SUBFORM`:
   - `SEARCH_FLAG` = 'Y' for primary search fields
   - `SEARCH_FLAG_B` = 'Y' for secondary search fields
   - `DOC_FLAG` = 'Y' for document number field
   - `DATE_FLAG` = 'Y' for date field
   - `CS_FLAG` = 'Y' for customer/supplier field

## Development

### Backend Development

```bash
cd backend

# Install dev dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Format code
black app/

# Lint
flake8 app/
```

### Outlook Add-in Development

```bash
cd outlook-addin

# Serve locally (requires http-server or similar)
npx http-server -p 3000 --ssl

# Update manifest.xml URLs to localhost for testing
```

### Gmail Add-on Development

Use the Apps Script editor for development. Enable logging:
```javascript
Logger.log('Debug message');
```

View logs in Apps Script: View > Logs

## Troubleshooting

### Backend Issues

**Connection to Priority fails:**
- Check Priority URL is accessible
- Verify Priority OData API is enabled
- Check Priority credentials
- Ensure firewall allows connections

**API key validation fails:**
- Check SECRET_KEY is set
- Verify API key hasn't expired
- Ensure X-API-Key header is sent

### Outlook Add-in Issues

**Add-in doesn't load:**
- Check all URLs in manifest use HTTPS
- Verify files are accessible from Outlook
- Check browser console for errors (F12)

**Can't connect to API:**
- Verify API_BASE_URL in config.js
- Check CORS settings in backend
- Ensure API is accessible from client

### Gmail Add-on Issues

**Add-on doesn't appear:**
- Check Apps Script deployment status
- Verify OAuth scopes are approved
- Check add-on is enabled in Gmail settings

**API calls fail:**
- Check API URL in Code.gs
- Verify OAuth consent screen is configured
- Check Apps Script execution logs

## Security Considerations

1. **HTTPS Required**: All production deployments must use HTTPS
2. **API Key Storage**: Keys are stored locally in browser/user properties
3. **Credential Encryption**: API keys use JWT with HS256 encryption
4. **CORS Configuration**: Limit allowed origins in production
5. **File Size Limits**: Configure appropriate limits for email/attachment sizes
6. **Rate Limiting**: Consider adding rate limiting to API endpoints

## License

Copyright © 2024 Your Organization. All rights reserved.

## Support

For issues and questions:
- Email: support@your-organization.com
- Documentation: https://your-docs-site.com
- GitHub Issues: https://github.com/your-org/filesmile/issues
