# File Uploader

A full-stack file management application built as part of [The Odin Project](https://www.theodinproject.com/) Node.js curriculum. Users can sign up, log in, and organize files into nested folders — similar to a simplified Google Drive / Dropbox.

## Features

- **User authentication** — sign up and log in with hashed passwords (bcrypt), session-based auth persisted in PostgreSQL
- **Nested folders** — create folders inside folders with unlimited depth, via a self-referencing relation
- **File upload** — upload files of any type (images, PDFs, archives, etc.), stored on Cloudinary
- **File & folder management** — rename, browse, and delete files and folders (including recursive deletion of subfolders and their contents, both in the database and on Cloudinary)
- **Per-user isolation** — every user only has access to their own files and folders

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Server | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| File storage | Cloudinary |
| Auth | express-session + prisma-session-store, bcryptjs |
| Templating | EJS |
| Styling | Tailwind CSS |
| Validation | express-validator |

## Project Structure

```
file_uploader/
├── lib/            # Prisma client, Cloudinary config
├── middleware/      # Auth guards (isAuthenticated, isGuest)
├── prisma/           # schema.prisma and migrations
├── public/           # Static assets (compiled CSS, etc.)
├── routers/          # Express route handlers
├── utils/             # Helper functions (recursive folder deletion, path resolution)
├── validators/       # express-validator field validators
├── views/             # EJS templates
├── index.js           # App entry point
└── prisma7.config.js  # Prisma configuration
```

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL running locally (or a hosted instance, e.g. [Neon](https://neon.tech))
- A [Cloudinary](https://cloudinary.com) account (free tier is enough)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/jormaedes/file_uploader.git
   cd file_uploader
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create the database
   ```sql
   CREATE DATABASE file_uploader_db;
   ```

4. Configure environment variables — create a `.env` file:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/file_uploader_db"
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   SESSION_SECRET=your_session_secret
   ```

5. Run migrations
   ```bash
   npx prisma migrate dev
   ```

6. Start the server
   ```bash
   node index.js
   ```

The app should now be running on `http://localhost:3000`.

## Deployment

For production (e.g. Vercel + Neon):

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy"
  }
}
```

Set the environment variables above in your hosting provider's dashboard. If using Neon, use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL` (used by migrations).

## Future Improvements

- [ ] Support for additional languages (i18n)
- [ ] Dark mode
- [ ] File preview (images, PDFs) before download
- [ ] Drag-and-drop upload
- [ ] File/folder sharing via public links
- [ ] Search across files and folders
- [ ] Storage usage indicator per user
- [ ] Move files/folders between directories (drag-and-drop or cut/paste)
- [ ] Automated tests

## Acknowledgements

Built as a project for [The Odin Project](https://www.theodinproject.com/lessons/nodejs-file-uploader) Node.js path.