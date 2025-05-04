# MMA Fantasy Rest API

## Requirements
- Node.js v20.11.0
- Supabase account

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env
   ```
4. Update the `.env` file with your Supabase credentials:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon/public key

   The application uses a centralized environment configuration system that validates required variables on startup.

## Development

Run the development server:
```
npm run dev
```

The server will automatically try to use the port specified in the `.env` file (default: 8000). If that port is already in use, it will automatically try the next available port.

## CORS Configuration

The API server is configured to allow cross-origin requests from `http://localhost:3000` with credentials support. This enables the frontend application running on this origin to make authenticated requests to the API.

- **Allowed Origin**: `http://localhost:3000`
- **Credentials**: Enabled (supports cookies, authorization headers, and TLS client certificates)
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, Content-Length, X-Requested-With
- **Options Success Status**: 204 (No Content)

When making requests from the frontend, ensure you include the `credentials: 'include'` option in your fetch or axios requests to send cookies with cross-origin requests.

### Example Frontend Fetch Request

```javascript
fetch('http://localhost:8080/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  }),
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## API Endpoints

### MMA Events

#### Create Event
- **URL**: `/api/events`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "name": "UFC 316: Dvalishvili vs. O'Malley 2",
    "date": "JUNE 7, 2025",
    "location": "Newark, New Jersey",
    "bouts": [
      {
        "left_fighter": "Merab Dvalishvili",
        "left_record": "19-4",
        "right_fighter": "Sean O'Malley",
        "right_record": "18-2"
      },
      // More bouts...
    ]
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: The created event object with its bouts
- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Missing required event data" }`
  - **Code**: 500
    - **Content**: `{ "error": "Failed to create event" }` or `{ "error": "Internal server error" }`

#### Get All Events
- **URL**: `/api/events`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**: Array of event objects
- **Error Response**:
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error" }`

#### Get Event by ID
- **URL**: `/api/events/:id`
- **Method**: `GET`
- **URL Parameters**: `id=[UUID]` - The ID of the event
- **Success Response**:
  - **Code**: 200
  - **Content**: The event object with its bouts
- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Event ID is required" }`
  - **Code**: 404
    - **Content**: `{ "error": "Event not found" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error" }`

#### Update Event
- **URL**: `/api/events/:id`
- **Method**: `PUT`
- **URL Parameters**: `id=[UUID]` - The ID of the event
- **Request Body**: Any event properties to update
  ```json
  {
    "name": "Updated Event Name",
    "location": "Updated Location"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: The updated event object
- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Event ID is required" }`
  - **Code**: 404
    - **Content**: `{ "error": "Event not found or update failed" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error" }`

#### Delete Event
- **URL**: `/api/events/:id`
- **Method**: `DELETE`
- **URL Parameters**: `id=[UUID]` - The ID of the event
- **Success Response**:
  - **Code**: 204
  - **Content**: No content
- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Event ID is required" }`
  - **Code**: 404
    - **Content**: `{ "error": "Event not found or delete failed" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error" }`

### Authentication

#### Login
- **URL**: `/api/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Login successful",
      "user": {
        "id": "user_id",
        "email": "user@example.com",
        ...
      }
    }
    ```
  - **Cookies**:
    - `token`: JWT access token (HTTP-only, secure=false, SameSite=Lax)
    - `is-logged`: "true" (secure=false, SameSite=Lax)

    Note: Cookies are configured with `sameSite: 'lax'` and `secure: false`. This configuration allows cookies to be sent over non-HTTPS connections and works well with most browsers including Chrome.
- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Email and password are required" }`
  - **Code**: 401
    - **Content**: `{ "error": "Invalid login credentials" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error" }`

## Supabase Setup

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Set up authentication:
   - Go to Authentication > Settings
   - Enable Email/Password sign-in method
4. Create users:
   - Go to Authentication > Users
   - Click "Add User" to create test users
5. Get your API credentials:
   - Go to Project Settings > API
   - Copy the URL and anon/public key to your `.env` file
6. Set up the database schema:
   - Go to SQL Editor
   - Copy and paste the SQL from `database/schema.sql`
   - Run the SQL to create the necessary tables

### Database Schema

The application uses the following database schema:

#### Events Table
```sql
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Bouts Table
```sql
CREATE TABLE IF NOT EXISTS bouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  left_fighter TEXT NOT NULL,
  left_record TEXT NOT NULL,
  right_fighter TEXT NOT NULL,
  right_record TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bouts_event_id ON bouts(event_id);
```

## Build

Build the project for production:
```
npm run build
```

## Production

Start the production server:
```
npm start
```

Just like in development mode, the server will automatically try to use the port specified in the `.env` file (default: 8000). If that port is already in use, it will automatically try the next available port and log the new port number to the console.
