# 🎓 CampusGig – Student Freelance Marketplace

**U24IT503 – Web Technologies (Project Driven Course) · Project Review 1 · Team 11**
Meenakshi Sundararajan Engineering College (An Autonomous Institution) · Department of Information Technology

| Team member | Reg. no. |
|---|---|
| Santhosh R | 243115205094 |
| Prasanth Rathnam J | 243115205076 |
| Thilak S | 243115205116 |

A simple, student-focused freelance platform that connects student skills with suitable jobs and provides one integrated system for **work, communication and payment**.

## Features (from the project objectives)
- Student & client accounts (login / register)
- Student profiles with skills and portfolio links
- Offer freelance **services** and **post / apply for jobs**
- Client dashboard: review applicants, accept / decline, order, pay
- Student dashboard: earnings, orders, applications, mark work delivered
- Built-in **messaging**
- **Payments** (demo mode – no real money) and **reviews / ratings**
- Search, filtering and sorting · Responsive, accessible, light/dark theme

## Pages
Home · Services · Jobs · Student directory · Student profile · Dashboard · Messages · Payments · Reviews · Login / Register · About (project report)

## Tech stack
HTML5 · CSS3 · vanilla JavaScript (hash-routed SPA). No build step, no dependencies.

`js/app.js` contains an `API` object (`user`, `job`, `service`, `application`, `message`, `payment`, `review`) that mirrors the REST modules in the report. In this static version it stores data in the browser's `localStorage`. To connect a real **Node.js / Express** backend later, replace the bodies of those functions with `fetch()` calls.

```
.
├── index.html
├── css/styles.css
├── js/
│   ├── data.js     # categories + demo seed data
│   └── app.js      # router, views, API layer
├── assets/college-logo.png
└── .nojekyll
```

## Run locally
Just open `index.html` in a browser, or serve the folder:
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Demo accounts
Use the **Demo student / Demo client** buttons on the login page, or:

| Role | Email | Password |
|---|---|---|
| Student | aarav@demo.com | demo123 |
| Client | client@demo.com | demo123 |

"Reset demo data" in the footer restores the sample data.

## Deploy on GitHub Pages
1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose branch `main`, folder `/ (root)`, then **Save**.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## Notes
This is a front-end prototype. Passwords and data are stored in plain text in the browser's localStorage, and payments are simulated – do not use real credentials. A production version needs the Express backend, hashed passwords / JWT auth and a real database & payment gateway, as outlined in the system architecture.

## Sustainability goals
**SDG 8 – Decent Work and Economic Growth** (primary) and **SDG 4 – Quality Education**.
