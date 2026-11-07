NEODEV 2026 REPO!!!

`frontend/` is the site (Vite + React). `backend/` is the API and admin (Django).
The sign-up page (`/signup`) talks to the backend; everything else on the site
is static.

**Local backend setup:**

(powershell)
Start in `root`
> \> python -m venv .venv

> \> .venv/scripts/Activate.ps1

> \> copy .env.example .env

Open `.env` and set `SECRET_KEY` to a long random string. One way to make one:

> \> python -c "import secrets; print(secrets.token_urlsafe(50))"

The other defaults in `.env.example` are already right for running locally.

> \> cd backend

> \> pip install -r requirements.txt

> \> python manage\.py makemigrations

> \> python manage\.py migrate

> \> python manage\.py runserver

Run `migrate` again whenever you pull new migrations.

To add a superuser (admin) account:

(powershell)
Start in `root/backend`

> \> python manage\.py createsuperuser

Follow the prompts, when typing your password it will be invisible.

Applications are reviewed at http://localhost:8000/admin/ under **Entry forms**.
Change an application's status there (Accepted, Waitlist, Denied) and the
applicant sees it in the Status window the next time they open the page.

To run the backend tests (start in `root/backend`, venv active):

> \> $env:THROTTLE_MAX_QUEUE_LENGTH=1000; python manage\.py test apps

**Local frontend setup:**

(powershell)
Start in `root/frontend`

> \> npm install

> \> copy .env.example .env.local

> \> npm run dev

Open http://localhost:5173/signup with the backend running.

Without `VITE_API_URL` the sign-up page still works, but keeps accounts in your
browser only — handy for working on the page's look, useless for real
applicants.