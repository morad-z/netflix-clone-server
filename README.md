# Netflix Clone - Server

This is the backend server for the Netflix Clone application. It provides APIs for user authentication, content management, reviews, and more.

## Deployment to Render

### Prerequisites
- A Render account
- MongoDB Atlas account (for database)
- TMDB API key

### Steps to Deploy

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Configure the following settings:
   - **Name**: netflix-clone-server
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

4. Add the following environment variables:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT token generation
   - `TMDB_API_KEY`: Your TMDB API key
   - `NODE_ENV`: Set to `production`
   - `CLIENT_URL`: The URL of your deployed client (e.g., https://your-netflix-clone.netlify.app)

5. Click "Create Web Service"

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables (see above)
4. Start the server: `node index.js`

## API Documentation

The server provides the following API endpoints:

- Authentication: `/api/auth/*`
- User profiles: `/api/profiles/*`
- Content: `/api/content/*`
- Reviews: `/api/reviews/*`
- My List: `/api/mylist/*`
- Admin: `/api/admin/*` (requires admin privileges)
