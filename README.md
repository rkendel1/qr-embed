# QR-Embed: Self-Hostable Authentication & RBAC Studio

This is a full-stack Next.js application that provides a complete, self-hostable solution for user authentication, role-based access control (RBAC), and embeddable UI components.

You can deploy your own instance of this studio to manage users, roles, and permissions for all of your applications from a single, centralized dashboard.

## Features

*   **One-Click Setup:** A guided process to initialize your database and seed default data.
*   **Embeddable Components:** Drop-in auth components for QR codes, magic links, social logins, and more.
*   **Role-Based Access Control (RBAC):** Define roles (e.g., "Admin", "Editor") and assign fine-grained permissions.
*   **User Management:** A complete UI for managing users and assigning them to roles.
*   **Route Protection:** Lock down pages and API routes in your external applications based on user roles.
*   **Developer Kit:** Download a pre-configured auth provider to easily integrate the RBAC system into any React application.
*   **Self-Hostable:** Deploy your own private instance on services like Vercel, Netlify, or any Node.js hosting provider.

---

## Deploy Your Own Instance (Supabase)

Follow these steps to deploy your own instance of the QR-Embed studio using Supabase as the backend.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [Git](https://git-scm.com/)
*   A free [Supabase](https://supabase.com/) account

### Step 1: Clone the Repository

Clone this project to your local machine.

```bash
git clone https://github.com/your-repo/qr-embed.git # Replace with the actual repo URL
cd qr-embed
```

### Step 2: Create a Supabase Project

1.  Go to [supabase.com](https://supabase.com/) and create a new project.
2.  Once the project is created, navigate to **Project Settings** > **API**.
3.  You will need the following information from this page for the next step:
    *   Project URL
    *   Project API Keys (`anon` `public` key)
    *   Project API Keys (`service_role` `secret` key)

### Step 3: Configure Environment Variables

1.  In the project's root directory, copy the example environment file:

    ```bash
    cp .env.example .env.local
    ```

2.  Open the `.env.local` file and fill in the required values from your Supabase project. At a minimum, you need:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY`
    *   `OTP_JWT_SECRET` (generate one with `openssl rand -hex 32`)
    *   `NEXT_PUBLIC_APP_URL` (use `http://localhost:32100` for local development)

### Step 4: Install Dependencies and Run

Now you can install the project dependencies and start the development server.

```bash
npm install
npm run dev
```

### Step 5: One-Click Database Setup

1.  With the application running, open your browser and navigate to [http://localhost:3000/setup](http://localhost:3000/setup).
2.  Click the **"Initialize Database"** button.
3.  This will automatically run all the necessary database migrations and seed your database with default roles.
4.  Once complete, you'll be redirected to the dashboard, and your application is ready to use!

---

## Deploy on Vercel

The easiest way to deploy your instance is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

1.  Push your cloned repository to your own GitHub account.
2.  Import the project into Vercel.
3.  Configure the Environment Variables in the Vercel project settings (copy them from your `.env.local` file).
4.  Deploy! After deployment, navigate to `https://your-vercel-url.com/setup` to initialize the database.