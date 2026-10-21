# People's Choice Awards: Marist Computing Conference (October 30, 2026)

A small, phone-friendly voting site with two awards:

1. **Best Paper Presentation**
2. **Best Lightning Talk**

Everyone scans **one shared QR code**, which opens the home page. Voters pick their 1st, 2nd and 3rd favorite
talks *that they attended* (only 1st is required). Scoring: 1st = 3 points, 2nd = 2, 3rd = 1.
There are no accounts or logins for voters, and their name is optional.

Results are visible only on the password-protected **/admin** page.

---

## Contents

- [How "one vote per person" works (and its limits)](#how-one-vote-per-person-works-and-its-limits)
- [Deploying for free, step by step](#deploying-for-free-step-by-step)
- [On the day of the conference](#on-the-day-of-the-conference)
- [Showing people how it works](#showing-people-how-it-works)
- [Changing the talks](#changing-the-talks)
- [Running it on your own computer (optional)](#running-it-on-your-own-computer-optional)
- [Settings (environment variables)](#settings-environment-variables)
- [What's in this folder](#whats-in-this-folder)
- [Troubleshooting](#troubleshooting)

---

## How "one vote per person" works (and its limits)

When someone opens the site, their phone gets a random **voter ID**. It is stored in two places:

- a **cookie** that is signed (so it can't be faked) and `httpOnly` (page scripts can't read or change it), lasting one year
- the browser's **localStorage**, as a backup copy

Then:

- **One ballot per award per voter ID.** The database itself enforces this with a unique rule
  (`one_ballot_per_voter_per_category`) and a transaction. If someone double-taps "Submit", or two submissions
  arrive at the same instant, only one is saved. This was tested with 25 simultaneous submissions: exactly 1 was saved.
- **Clearing just one of the two doesn't reset the vote.** If the cookie is cleared, it is restored from
  localStorage the next time the page loads (and on submit). If localStorage is cleared, it is restored from the cookie.
- **Already voted?** The voter sees "You've already voted for this award. Thanks!" instead of the ballot,
  and the home page shows a ✓ on that award.
- **Rate limit per network.** At most 300 ballots per 10 minutes from one IP address. This is kept loose on purpose,
  because the whole conference may share campus Wi-Fi (one IP address). You can change it (see `VOTE_RATE_LIMIT`).
- **Suspicious ballots are flagged** on the admin page. Every ballot records a timestamp, a *hash* of the IP address,
  and a *hash* of IP + browser type (raw IP addresses are never stored). Flags appear when the same network and browser
  cast identical picks within 10 minutes, or send 6 or more ballots for one award within 2 minutes.
  You can remove flagged ballots. A removed ballot stops counting, and that device still can't vote again.
- **Deleting a ballot is different from removing it.** The **All ballots** list on the admin page has a **Delete**
  button on every ballot. Delete erases the ballot completely, and the phone that cast it *can* vote again.
  Use it for demo and test votes (see [Showing people how it works](#showing-people-how-it-works)).
- **Everything is checked on the server.** The browser is never trusted: picks must be real talks in that award,
  no repeats, 1 to 3 picks, voting must be open, and so on.

### The honest limits

This **stops casual repeat voting**: pressing back, refreshing, double-tapping, or clearing *either* the cookie *or*
localStorage. It does **not** stop a determined person who:

- uses several phones or laptops,
- uses a private/incognito window, or a different browser on the same phone, or
- clears *both* the cookie and localStorage (all site data).

The flags help you spot some of this. For example, clearing all site data and voting again from the same phone and Wi-Fi
with the same picks will be flagged. But flags are only hints: dozens of identical iPhones on the same campus Wi-Fi
look the same to the server. Stopping repeat voting completely would require voter logins or per-person codes,
which this project deliberately avoids. For a friendly People's Choice award, this is a reasonable trade-off.

---

## Deploying for free, step by step

You will use three free services:

| Service | What it does | Cost |
|---|---|---|
| **GitHub** | Stores your code online | Free |
| **Vercel** | Runs the website | Free "Hobby" plan |
| **Neon** | The Postgres database that stores talks and votes | Free plan |

Plan on 30–45 minutes the first time. Website menus change from time to time, so if a button has a slightly
different name than below, look for the closest match.

### Step 1: Put the code on GitHub

The easiest way is the free **GitHub Desktop** app (no typing commands).

1. Create a free account at <https://github.com> if you don't have one.
2. Download and install **GitHub Desktop** from <https://desktop.github.com>, then sign in with your GitHub account.
3. In GitHub Desktop choose **File → Add Local Repository…** and select this project folder (`peoples-choice`).
4. It will say the folder isn't a Git repository yet. Click **create a repository**, keep the defaults,
   and click **Create Repository**.
5. Click **Publish repository** (top bar). Leave **Keep this code private** ticked and click **Publish Repository**.

Your code is now on GitHub. Secret files like `.env.local` are automatically left out (see `.gitignore`).

<details>
<summary>Prefer the command line? Click here.</summary>

Create an empty **private** repository named `peoples-choice` on github.com (no README), then in a terminal
inside this folder:

```bash
git init
git add .
git commit -m "People's Choice voting site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/peoples-choice.git
git push -u origin main
```
</details>

### Step 2: Make two secrets

You need two values. Keep them somewhere safe, like a password manager.

1. **ADMIN_PASSWORD**: the password for the /admin page. Make it long (16+ characters) and don't reuse a password
   from anywhere else.
2. **COOKIE_SECRET**: a random string of at least 32 characters, used to sign voter IDs. If you have Node.js installed,
   run this in Terminal and copy the output:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Otherwise use your password manager's generator to make a 40+ character random password.

### Step 3: Create the Vercel project

1. Go to <https://vercel.com> → **Sign Up** → choose **Hobby** (free) → **Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find `peoples-choice` in the list and click **Import**.
   (If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to that repository.)
4. **Project Name**: this becomes your web address. For example, `marist-peoples-choice` gives
   `https://marist-peoples-choice.vercel.app`. Leave Framework as **Next.js** and the other settings alone.
5. Open **Environment Variables** and add two entries:
   - Key `ADMIN_PASSWORD`, Value: your admin password
   - Key `COOKIE_SECRET`, Value: your random secret
6. Click **Deploy**.

**The first build will fail** with `DATABASE_URL is not set`. That is expected, because there is no database yet.
Click through to the project dashboard.

### Step 4: Add the free Neon database

1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database** (or **Create**), choose **Neon** (Serverless Postgres), and click **Continue**.
3. Choose the **Free** plan. For **Region**, pick **US East (Washington, D.C. / N. Virginia)**, the one closest to Vercel's
   default servers. Give it a name like `peoples-choice-db` and create it. Accept Neon's terms if asked.
4. When asked which project to connect, choose your `peoples-choice` project with all environments ticked
   (Development, Preview, Production), then click **Connect**.

This automatically adds `DATABASE_URL` (and a few other database settings) to your project.

### Step 5: Deploy again

1. Go to the **Deployments** tab, click the **⋯** menu next to the failed deployment, and choose **Redeploy**.
2. Wait about 1–2 minutes. In the build log you should see:
   ```
   Tables are ready.
   Loaded 46 talks.
   ```
   The build creates the database tables and loads the talks for you. It's safe to repeat: later builds
   never delete anything and never reload talks once they exist.
3. When it says **Ready**, click **Visit**. You should see the home page with the two big buttons.

### Step 6: Lock in your public address (important for the QR code)

Vercel also creates extra preview addresses for each deployment. To make sure the QR code always points to your real
address:

1. **Settings → Environment Variables → Add**:
   Key `NEXT_PUBLIC_SITE_URL`, Value `https://marist-peoples-choice.vercel.app` (your actual address).
2. **Deployments → ⋯ → Redeploy** so the new setting takes effect.

### Step 7: Do a test run

1. Open `https://YOUR-ADDRESS/admin` and sign in with your admin password.
2. Both awards start **CLOSED**. Click **Open voting** for both.
3. On your phone, scan the QR code shown on the admin page and vote in both awards.
4. Try voting again: you should see "You've already voted for this award. Thanks!"
5. Refresh the admin page: your votes appear in the results.
6. **Clean up:** scroll to the bottom of the admin page, type `DELETE ALL`, and click **Delete all ballots**.
   This erases the test votes (talks are kept) and lets every device vote again.
7. Click **Close voting** on both awards until the conference.

### Step 8: Print the QR code

On the admin page, under **Shared QR code**:

- **Download QR (PNG)**: just the QR code, for slides and handouts.
- **Download poster (PNG, letter size)**: big QR + "Vote for People's Choice!" + the address in text.
- **Open printable poster**: the same poster as a web page. Click **Print this poster**.

**Before printing a stack, scan one printed copy with a phone** to make sure it opens your real site.

---

## On the day of the conference

1. Sign in at `/admin`. Open voting for **Best Paper Presentation** when the sessions start. Open
   **Best Lightning Talk** when the lightning talks start, or both at once, as you prefer.
2. Leave the admin page open to watch live results. It refreshes every 15 seconds.
3. Glance at **Flagged ballots** now and then. Remove anything clearly fake.
4. At the end, click **Close voting** on each award. Voters then see "Voting has closed".
5. Click **Download results (CSV)** and **Download all ballots (CSV)** to keep a record. The CSVs open in Excel,
   Numbers or Google Sheets.

Ties are ordered by number of 1st-place votes, then 2nd-place votes. Check the CSV if it's close.

---

## Showing people how it works

You can demo the site live, even after real voting has started, and clean up afterwards:

1. Make sure voting is **open** for the award you're demoing.
2. Vote on your phone (or let someone else vote). On the confirm screen, type **Demo** in the "Your name" box,
   so the demo ballot is easy to find.
3. On the admin page, scroll to **All ballots** (newest first) and click **Delete** next to the "Demo" ballot.
4. That ballot no longer counts, and the phone can vote again. A real vote from that phone later counts normally.

| Button | Where | What it does | Can that phone vote again? |
|---|---|---|---|
| **Delete** | All ballots | Erases one ballot completely | Yes |
| **Remove** | Flagged ballots | Stops a suspicious ballot counting, but keeps a record | No |
| **Delete all ballots** | Bottom of the page | Erases *every* ballot (use before the conference) | Yes, everyone |

---

## Changing the talks

**Use the admin page** (the **Talks** section) at any time:

- **+ Add a talk**: time (like `2:05 PM`), room, title, speakers. Lightning talks also take a talk number.
- **Edit**: fix a title, speaker or time.
- **Remove**: hides the talk from ballots. Any votes it already got are kept and still shown in results
  (marked "removed"). **Restore** puts it back.

The file `db/seed-talks.mjs` holds the original schedule. It is used **only once**, when the database is empty.
After that, edit talks on the admin page.

---

## Running it on your own computer (optional)

You don't need this to deploy. It's for trying changes before they go live.

1. Install **Node.js 22 or newer** from <https://nodejs.org>.
2. In Terminal, inside this folder, run:
   ```bash
   npm install
   ```
3. Copy `.env.example` to a new file named `.env.local` and fill in the values. For `DATABASE_URL`, create a
   **second, separate** free Neon database at <https://neon.tech> for testing, so test votes don't land in the real one.
   Copy its connection string.
4. Create the tables and load the talks:
   ```bash
   npm run db:setup
   ```
5. Start the site:
   ```bash
   npm run dev
   ```
   Then open <http://localhost:3000> (voting) and <http://localhost:3000/admin> (admin).

To start the local test database completely fresh (this deletes all ballots **and** talks, and asks you to type `yes`):

```bash
npm run db:setup -- --wipe
```

Never point that command at the real database.

---

## Settings (environment variables)

| Name | Required? | What it is |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. Filled in automatically by the Neon integration on Vercel. |
| `ADMIN_PASSWORD` | Yes | Password for `/admin` (at least 8 characters; longer is better). Changing it signs everyone out of admin. |
| `COOKIE_SECRET` | Yes | Random secret, 32+ characters. Signs voter IDs and hashes IP addresses. **Don't change it during the conference:** every phone would look like a new voter. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Your public address, used for the QR code. |
| `VOTE_RATE_LIMIT` | No | Max ballots per 10 minutes from one network. Default `300`. |

After changing any setting on Vercel, **redeploy** for it to take effect.

---

## What's in this folder

```
db/schema.sql               Database tables (incl. the one-ballot-per-voter rule)
db/seed-talks.mjs           The original list of talks
scripts/setup-db.mjs        Creates tables + loads talks (runs automatically on every build)
src/app/page.tsx            Home page (two big buttons)
src/app/vote/[category]/    Ballot page for each award
src/components/Ballot.tsx   The ballot: pick 1st/2nd/3rd, search, confirm, thank-you
src/components/VoterSync.tsx  Keeps the cookie and localStorage copies of the voter ID in sync
src/app/api/voter/          Gives each device its ID / restores a cleared copy
src/app/api/vote/           Receives ballots: checks everything, rate-limits, saves
src/app/admin/              Admin page, sign-in, and admin actions
src/app/api/admin/export/   CSV downloads
src/lib/                    Shared server code (database, security, queries)
```

Built with Next.js (App Router), TypeScript, Tailwind CSS and Postgres.

---

## Troubleshooting

- **Build fails with "DATABASE_URL is not set"**: connect the Neon database (Step 4), then redeploy.
- **Pages show an error, and the Vercel logs mention COOKIE_SECRET or ADMIN_PASSWORD**: add or fix those environment
  variables (COOKIE_SECRET needs 32+ characters), then redeploy.
- **Admin says "Wrong password"**: check the `ADMIN_PASSWORD` value in Vercel. After changing it, redeploy.
  After 10 wrong tries, sign-in pauses for 15 minutes.
- **The QR code shows the wrong address**: set `NEXT_PUBLIC_SITE_URL` (Step 6) and redeploy.
- **Voters see "Lots of votes are coming from your network"**: raise `VOTE_RATE_LIMIT` (e.g. to `1000`) and redeploy.
- **The first page load after a quiet period is slow**: the free Neon database "sleeps" after a few minutes without
  use and takes a second or two to wake up. Opening the admin page shortly before voting starts wakes it.
- **Someone says they couldn't vote because "already voted" but they didn't**: they may be sharing a phone with someone
  who voted. Each device gets one vote per award; they can vote from their own phone.

A note on Vercel's free plan: Vercel describes Hobby as being for personal, non-commercial use. A free conference
vote is usually fine, but if your institution has its own Vercel or hosting account, you can deploy there instead.
