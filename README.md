# Fathima Mufliha: data analytics portfolio

A personal portfolio site built with plain HTML, CSS and JavaScript. There is no build step: the files in this repository are the website, exactly as GitHub Pages will serve them.

**Live address (once GitHub Pages is switched on):** https://fathimamuflihagit.github.io/Portfolio/

Everything you see on the site is read from two data files, so you can update it without touching any HTML:

| To change | Edit this file |
|---|---|
| Your name, links, about text, skills, timeline, certifications, notes list | `data/site.json` |
| Your projects | `data/projects.json` |

---

## Contents

1. [Checklist: what to replace first](#1-checklist-what-to-replace-first)
2. [What is in this repository](#2-what-is-in-this-repository)
3. [Switch on GitHub Pages](#3-switch-on-github-pages)
4. [Preview the site on your own computer](#4-preview-the-site-on-your-own-computer)
5. [How to make a change](#5-how-to-make-a-change)
6. [Edit your details (site.json)](#6-edit-your-details-sitejson)
7. [Add or edit a project (projects.json)](#7-add-or-edit-a-project-projectsjson)
8. [Embed a Tableau or Power BI dashboard](#8-embed-a-tableau-or-power-bi-dashboard)
9. [Set up the contact form (Formspree)](#9-set-up-the-contact-form-formspree)
10. [Write a note (Markdown)](#10-write-a-note-markdown)
11. [Connect a custom domain later](#11-connect-a-custom-domain-later)
12. [Optional extras](#12-optional-extras)
13. [If something goes wrong](#13-if-something-goes-wrong)
14. [Credits](#14-credits)

---

## 1. Checklist: what to replace first

The site was written to be honest about where you are. Nothing on it claims a result you have not produced yet. These are the placeholders to replace, most important first.

| # | What | Where | Notes |
|---|---|---|---|
| 1 | **Resume** | `assets/resume.pdf` | The current file is a one-page placeholder that points to your LinkedIn. Replace it with your real one-page resume, keeping the same file name. |
| 2 | **Your name** | `data/site.json` → `person.name` | Check the spelling. If you change it, also update the `<head>` of `index.html` and `project.html`, and remake `assets/img/og-image.png` (see section 12). |
| 3 | **Email** | `data/site.json` → `links.email` | Empty for now, so the email row and copy button are hidden. Add your address to show them. |
| 4 | **Location** | `data/site.json` → `person.location` | Set to "Greater Toronto Area, Ontario, Canada". Change it to your city if you prefer. |
| 5 | **Work authorization** | `data/site.json` → `recruiter.work_authorization` | Hidden until you replace the `TODO:` text. |
| 6 | **About text** | `data/site.json` → `about.paragraphs` | Rewrite the first three paragraphs in your own voice. The fourth (your background before Sheridan) is a `TODO:` and is hidden until you fill it in. |
| 7 | **Photo** | `assets/img/profile.webp`, then `person.photo` | Until you add one, the site shows your initials. |
| 8 | **Project statuses** | `data/projects.json` → `status` | Four projects are marked "In progress" as a starting guess. Set each to `Planned`, `In progress` or `Completed` to match reality. The "Projects underway" counter updates itself. |
| 9 | **Insights, recommendations, improvements** | `data/projects.json` | Every `TODO:` line shows as "coming soon" on the site. Replace them as you finish each analysis. |
| 10 | **Chart numbers** | `data/projects.json` → `chart` | The small charts use placeholder values and are labelled "Sample data". Put in real values, then set `"sample": false`. |
| 11 | **Project links** | `data/projects.json` → `github_url`, `live_dashboard_url` | Empty for now. The buttons appear when you add the links. |
| 12 | **Tableau Public profile** | `data/site.json` → `links.tableau_public` | Empty for now. |
| 13 | **Contact form** | `data/site.json` → `site.formspree_id` | See section 9. Until then, the form tells visitors to use LinkedIn. |
| 14 | **Cover images** | `assets/img/projects/` | The covers are abstract illustrations. Swap in real dashboard screenshots when you have them. |
| 15 | **"Currently learning"** | `data/site.json` → `about.currently_learning` | Update once a month. |
| 16 | **Last updated date** | `data/site.json` → `site.last_updated` | Shown in the footer. Use the format `2026-11-16`. |

Tip: search the two JSON files for `TODO` to find everything that is still a placeholder.

One thing to check: the timeline shows Semester 1, Semester 2, expected graduation (April 2027), then co-op from May 2027, in date order. If your program counts the co-op term before graduation, change the dates under `journey` in `data/site.json`.

---

## 2. What is in this repository

```
index.html              The home page (all sections)
project.html            The case-study page. It shows one project, chosen by ?id= in the address
404.html                Shown when someone opens an address that does not exist
css/style.css           All styling. Colours and fonts are set at the top of the file
js/main.js              Builds the home page from the data files; theme, menu, form, timeline
js/projects.js          Project cards, filters, charts and the case-study page
data/site.json          Your details and all page text            <- you edit this
data/projects.json      Your projects                             <- you edit this
notes/                  Short posts written in Markdown
assets/img/             Images: favicon, social preview image, project covers
assets/fonts/           The two fonts used by the site
assets/resume.pdf       Your resume                               <- you replace this
templates/              A GitHub profile README and a project-repo README to copy
sitemap.xml, robots.txt Help search engines find the pages
CNAME.example           Used only if you add a custom domain (section 11)
.nojekyll               Tells GitHub Pages to serve the files as they are
```

---

## 3. Switch on GitHub Pages

The files are already in this repository. GitHub Pages only needs to be turned on once.

1. Open the repository on GitHub: https://github.com/fathimamuflihagit/Portfolio
2. Select **Settings** (top right of the repository menu).
3. In the left sidebar, select **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Under **Branch**, choose the branch that holds the files, keep the folder as **/ (root)**, and select **Save**.
   In this repository the branch is called **`DATA-SCIENCE`**, because that is the default branch name on your GitHub account. (See the note below if you would rather call it `main`.)
6. Wait one or two minutes, then refresh the Pages settings screen. It shows the address of your site:
   **https://fathimamuflihagit.github.io/Portfolio/**

Every time you change a file in this branch, GitHub rebuilds the site by itself. It usually takes about a minute.

> **About the branch name.** Most tutorials call the main branch `main`. Yours is `DATA-SCIENCE`. Both work. If you want to rename it: Settings → General → Default branch → the pencil icon → type `main` → Rename. Then go back to Settings → Pages and pick `main`. To change the name used for future repositories, see github.com → your photo → Settings → Repositories → Repository default branch.

> **About the address.** Because the repository is named `Portfolio`, the site lives at `/Portfolio/`. If you would like the shorter address `https://fathimamuflihagit.github.io/`, create a repository named exactly `fathimamuflihagit.github.io`, put these same files in it, and turn on Pages there. Then update the address in the five places listed in section 11, step 6.

---

## 4. Preview the site on your own computer

You can check changes before publishing them. The site loads its data files with JavaScript, and browsers block that when you open `index.html` by double-clicking it, so you need a small local server. Either option below works.

**Option A: VS Code (easiest)**

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Open the site folder in it (File → Open Folder).
3. Install the extension called **Live Server**.
4. Right-click `index.html` and choose **Open with Live Server**.

**Option B: Python (already installed if you use Python for your coursework)**

1. Open a terminal in the site folder.
2. Run `python -m http.server 8000`
3. Visit http://localhost:8000 in your browser.
4. Press Ctrl+C in the terminal to stop.

---

## 5. How to make a change

**In the browser (no tools needed)**

1. On GitHub, open the file you want to change, for example `data/site.json`.
2. Select the pencil icon (**Edit this file**).
3. Make your change.
4. Select **Commit changes**, type a short description such as "Update about text", and confirm.
5. Wait about a minute and refresh your site.

To add an image or replace your resume: open the folder on GitHub, then **Add file → Upload files**.

**With Git on your computer**

```bash
git clone https://github.com/fathimamuflihagit/Portfolio.git
cd Portfolio
# ... edit files, preview locally (section 4) ...
git add .
git commit -m "Describe what you changed"
git push
```

**Two rules for the JSON files**

- Text goes inside straight double quotes: `"like this"`.
- Items in a list are separated by commas, with **no comma after the last one**.

If the site shows "The site data could not be loaded", a comma or quote is almost always the cause. Paste the file into https://jsonlint.com to find the line.

---

## 6. Edit your details (site.json)

`data/site.json` is organised in blocks. Keys that begin with an underscore, such as `_help`, are notes to you and are ignored by the site.

| Block | What it controls |
|---|---|
| `person` | Name, headline, location, photo, resume file |
| `site` | Site address, "last updated" date, Formspree form ID |
| `links` | Email, LinkedIn, GitHub, Tableau Public |
| `availability` | The "Available for Co-op" pill and the availability sentence |
| `hero` | The rotating job titles and the two button labels |
| `education` | Program, school, expected graduation |
| `stats` | The four counters under the hero |
| `about` | About paragraphs, the three "What I bring" columns, "Currently learning" |
| `recruiter` | The 30-second summary, top skills, work authorization |
| `skills` | Tool chips, grouped by category. Each tool has a brand `color` for its tile and an `ink` colour for the logo or letters on it |
| `role_labels` | Short role tags and the full job titles they stand for |
| `process` | The six "How I work" steps |
| `journey` | The timeline chart: semesters, courses, milestones |
| `certifications` | Certification cards |
| `notes` | The list of notes |
| `sections` | The short intro line under each section heading |
| `contact` | The closing line and the form intro |

**Two helpful behaviours**

- Any text that starts with `TODO:` is hidden on the live site, or shown as "coming soon" on project pages. You can leave reminders for yourself without them going public.
- An empty value (`""`) hides the matching link or button.

**The counters are honest by design.** Each one is counted from your data. For example, `"source": "projects_active"` counts projects whose status is "In progress" or "Completed". The sources you can use are listed in `_stats_help` inside the file. To type a number yourself, use `"value": 5` in place of `"source"`.

**Adding a photo**

1. Crop your photo to a portrait shape, about 800 × 1000 pixels.
2. Convert it to WebP at https://squoosh.app (free, runs in your browser). Aim for under 150 KB.
3. Upload it as `assets/img/profile.webp`.
4. In `site.json`, set `"photo": "assets/img/profile.webp"`.

**When you earn a certification**

Change its `"status"` to `"Earned"`, add `"date": "March 2027"`, and paste the credential link into `"credential_url"`.

---

## 7. Add or edit a project (projects.json)

### Add a project in five steps

1. Open `data/projects.json`.
2. Copy one whole project, from its opening `{` to its closing `}`, and paste it after another project. Make sure there is a comma between projects.
3. Give it a new `id`. Use lowercase letters and hyphens only, for example `airbnb-pricing-analysis`. The id becomes the page address: `project.html?id=airbnb-pricing-analysis`.
4. Edit the text.
5. Add a cover image (see below), then commit.

The new project appears in the grid, the filters and the counters automatically. To have it show up in search engines sooner, also add its address to `sitemap.xml` by copying one of the existing `<url>` blocks.

### What each field means

| Field | Meaning |
|---|---|
| `id` | Unique short name used in the page address |
| `title`, `tagline` | Shown on cards and at the top of the case study |
| `role_tags` | Which roles the project suits. Use the short tags from `role_labels` in `site.json`: `BI`, `Data`, `Marketing`, `Finance`, `AI`, `Business Analyst`, `Operations & HR` |
| `tools` | Tools used. Spell them exactly as in the skills list: `Excel`, `Python`, `R`, `MySQL`, `AWS`, `Power BI`, `Tableau`, `MS Project` |
| `course_code` | The related course code, for example `DBAS56663`. Leave as `""` if there is none |
| `status` | `Completed`, `In progress` or `Planned`. The site lists projects in that order automatically; within each status they keep the order of this file |
| `dataset` | `name`, `url` and a one-sentence `note`. Always link a real public dataset |
| `cover_image` | Path to the cover image. Optional `cover_alt` describes it for screen readers |
| `featured` | `true` shows the project in the large "Featured projects" rows |
| `github_url`, `live_dashboard_url` | Links. Leave as `""` until they exist |
| `business_problem` | One short paragraph: who needs to decide what? |
| `approach` | The steps you took, in order |
| `subprojects` | The tabs on the case-study page (see below). Each tab can also have `steps` (a short list) and its own `chart` |
| `chart` | The small chart on the card (see below). Use `null` for no chart; the cover image is shown |
| `insights`, `recommendations`, `improvements` | Lists of sentences. Leave the `TODO:` lines until you have real findings |
| `artifacts` | Optional. Downloadable documents with previews (used by the project management case study) |
| `context` | Optional. Shown in place of the course line, for example "Statistics course project, Sheridan College" |
| `highlights` | Optional. Headline numbers shown under the title of a finished project: `value`, `label` and an optional `note` |
| `charts` | Optional. Several interactive charts shown together in the visuals section (see the coffee chain project). Types: `bar` (add `"horizontal": true` for sideways bars), `line` and `scatter` (with an optional `trendline`) |
| `comparison` | Optional. Two groups side by side, one row per measure, with small bars |
| `request` | Optional. Adds a button that opens the contact form with a question about this project already filled in |
| `section_order` | Optional. The order of the case-study sections, for example results first for a finished project |
| `hide_cover` | Optional. `true` keeps the cover image on cards but hides it on the case-study page |
| `hide_sections` | Optional. Section ids to leave out of the case-study page, for example `["dataset", "approach"]` |
| `story` | Optional. A told-as-a-story walkthrough shown first on the case-study page, told in numbered chapters with animated visuals. See "Story blocks" below |

### Subprojects (the tabs)

Each project has two to four subprojects, for example "SQL cleaning", "Pivot analysis" and "Dashboard".

```json
{
  "title": "Dashboard",
  "tool": "Power BI",
  "description": "What this part is, in one or two sentences.",
  "embed_url": "",
  "image": "assets/img/projects/retail-dashboard.webp",
  "key_insight": "TODO: the one thing this part showed."
}
```

- `embed_url` is for a live Tableau Public or Power BI dashboard (section 8).
- `image` is for a screenshot. Add `"image_alt"` to describe it.
- Use one or the other. If both are empty, the tab shows a "coming soon" note.

### The small chart

```json
"chart": {
  "type": "bar",
  "title": "Sales by region",
  "unit": "",
  "labels": ["West", "East", "Central", "South"],
  "series": [{ "name": "Sales ($ thousands)", "values": [120, 95, 80, 60] }],
  "sample": false
}
```

(The numbers above are only an example of the format. Use the values from your own analysis.)

- `type` is `bar` or `line`.
- `unit` is added after each number, for example `"%"`.
- You can have one or two series. Two series get a legend automatically.
- Keep `"sample": true` while the numbers are placeholders. The chart is then labelled "Sample data" so nobody mistakes it for a finding.
- Every chart also has a "View as table" button on the case-study page, so the values are readable without the chart.

### Cover images and screenshots

1. Take a screenshot of your dashboard or chart.
2. Crop it to a 16:9 shape. 1200 × 675 pixels is ideal.
3. Convert it to WebP at https://squoosh.app and aim for under 150 KB.
4. Upload it to `assets/img/projects/`.
5. Point `cover_image` at it, and add a `cover_alt` sentence that describes what the image shows.

### Downloadable documents (project management case study)

Save each file (PDF is best) in a new folder `assets/docs/`, save a screenshot of its first page in `assets/img/projects/`, then fill in `file` and `preview_image` for that item under `artifacts`. Items with an empty `file` show as "Coming soon".

---

## 8. Embed a Tableau or Power BI dashboard

Dashboards load only when a visitor selects "Load interactive dashboard", which keeps the page fast.

### Tableau Public

1. Publish your workbook to [Tableau Public](https://public.tableau.com/) (in Tableau: File → Save to Tableau Public).
2. Open the dashboard on Tableau Public and select the **Share** icon.
3. Copy the **Link**. It looks like `https://public.tableau.com/views/WorkbookName/DashboardName`.
4. Remove anything after the dashboard name (from the `?` onwards), then add this to the end:
   `?:showVizHome=no&:embed=true`
5. Paste the result into the subproject's `embed_url`:

```json
"embed_url": "https://public.tableau.com/views/WorkbookName/DashboardName?:showVizHome=no&:embed=true"
```

6. Paste the normal link (step 3) into the project's `live_dashboard_url` so the "Open live dashboard" button appears.

### Power BI

1. Publish the report to the Power BI service.
2. Open the report, then **File → Embed report → Publish to web (public)**.
3. Copy the link. It looks like `https://app.powerbi.com/view?r=...`.
4. Paste it into the subproject's `embed_url`.

Two things to know about "Publish to web":

- It makes the report public to anyone with the link. Only use it with public datasets, which is what every project here uses.
- Some school and work accounts have this option switched off by their administrator. If you cannot see it, export a screenshot instead and use the `image` field.

Addresses must start with `https://`. Anything else is ignored for safety.

---

## 9. Set up the contact form (Formspree)

GitHub Pages cannot receive form submissions by itself. [Formspree](https://formspree.io) is a service that receives the message and emails it to you. It has a free plan with a monthly limit on messages.

1. Create an account at https://formspree.io with the email address where you want to receive messages.
2. Create a **new form** and give it a name, such as "Portfolio contact".
3. Formspree shows the form's endpoint. It looks like `https://formspree.io/f/abcdwxyz`.
4. Copy only the last part (`abcdwxyz`) into `data/site.json`:

```json
"formspree_id": "abcdwxyz"
```

5. Commit, wait a minute, then send yourself a test message from the live site.
6. Check your inbox. The first time, Formspree may ask you to confirm the address.

**What happens before you set it up?** The form still appears. If you have added your email to `links.email`, pressing Send opens the visitor's email app with the message filled in. If not, it tells them to message you on LinkedIn.

The form includes a hidden "honeypot" field that catches most spam bots.

---

## 10. Write a note (Markdown)

Notes are short posts, such as "What I learned about window functions". Each one is a Markdown file.

1. Copy `notes/note-template.md` and rename the copy, for example `notes/window-functions.md`.
2. Write your note. The first line, starting with `#`, is the title.
3. Add it to the list in `data/site.json` under `notes.items`:

```json
{
  "slug": "window-functions",
  "title": "What I learned about window functions",
  "date": "2026-12-05",
  "summary": "One sentence that says what the note covers.",
  "file": "notes/window-functions.md",
  "published": true
}
```

Set `"published": false` to keep a draft off the site. If no note is published, the whole Notes section hides itself.

Supported formatting: headings (`#`, `##`, `###`), paragraphs, bullet and numbered lists, `**bold**`, `*italic*`, `` `code` ``, code blocks between lines of three backticks, quotes starting with `>`, and `[links](https://example.com)`.

---

## 11. Connect a custom domain later

You can move the site to your own address, such as `www.fathimamufliha.com`, at any time. Nothing in the site depends on the `github.io` address, because every internal link is relative.

1. **Buy a domain** from any registrar (Namecheap, Porkbun, Cloudflare and GoDaddy are common choices).

2. **Tell GitHub about it.** Repository → Settings → Pages → **Custom domain** → type `www.yourdomain.com` → Save.
   GitHub adds a file named `CNAME` to the repository that contains your domain. (You can also do this by hand: rename `CNAME.example` to `CNAME` and replace its one line with your domain. The file must contain only the domain, with no comments, which is why the placeholder has a different name.)

3. **Add DNS records** in your registrar's DNS settings.

   For the `www` address:

   | Type | Name / Host | Value |
   |---|---|---|
   | CNAME | `www` | `fathimamuflihagit.github.io` |

   For the bare address (`yourdomain.com`), so that it also works and redirects to `www`:

   | Type | Name / Host | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |

   The A records are for IPv4 and the AAAA records are for IPv6. These addresses come from GitHub's documentation: [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Check that page when you set this up, in case GitHub has changed them.

4. **Wait for DNS.** It can take from a few minutes up to a day. The Pages settings screen shows a green tick when the check passes.

5. **Turn on HTTPS.** On the same screen, tick **Enforce HTTPS**. If the box is greyed out, GitHub is still issuing the certificate. Try again in an hour.

6. **Update the site address** in these five places, replacing `https://fathimamuflihagit.github.io/Portfolio/` with your new address:

   - `data/site.json` → `site.url`
   - `index.html` → the `canonical`, `og:url`, `og:image` and `twitter:image` lines in the `<head>`
   - `project.html` → the same lines in the `<head>`
   - `sitemap.xml` → every `<loc>` line
   - `robots.txt` → the `Sitemap:` line

7. Recommended: [verify your domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages) in your GitHub account settings, so nobody else can claim it.

---

## 12. Optional extras

### Change the colours

Open `css/style.css`. Section 2, "Design tokens", lists every colour as a variable, once for light mode and once for dark mode. To change the accent from teal to another colour, edit `--accent`, `--accent-hover`, `--accent-soft` and `--series-1` in both blocks. Check your choice with a contrast checker such as https://webaim.org/resources/contrastchecker/: body text needs a ratio of at least 4.5 to 1.

### Social preview image

`assets/img/og-image.png` is the picture shown when you share the site on LinkedIn or in a message. It has your name on it. To remake it, create a 1200 × 630 pixel image in Canva, Figma or PowerPoint, export it as PNG, and save it with the same file name.

### Analytics without cookies

At the bottom of `index.html` and `project.html` there is a commented-out snippet for [GoatCounter](https://www.goatcounter.com), a privacy-friendly visitor counter. Create a free account, replace `YOURCODE` in the snippet, and remove the `<!--` and `-->` around the `<script>` line.

### GitHub profile README

`templates/github-profile-README.md` is a profile page written in the same voice as this site. To use it, create a public repository with the same name as your username (`fathimamuflihagit`), add a `README.md`, and paste the template in. It then appears at the top of your GitHub profile.

### A standard layout for each project repository

`templates/project-repo-README.md` is a README to copy into each project's own repository. It follows the same outline as the case-study pages and suggests this folder layout:

```
project-name/
├── data/         Raw and cleaned data, or a link to it if the files are large
├── sql/          SQL scripts, numbered in the order they run
├── notebooks/    Jupyter or R Markdown notebooks
├── dashboards/   .pbix or .twbx files and exported screenshots
└── README.md     The write-up, with screenshots
```

### Keep the momentum visible

- Update "Currently learning" at the start of each month.
- Change `site.last_updated` whenever you publish something.
- Move a project from Planned to In progress the day you start it.

---

## 13. If something goes wrong

| What you see | Likely cause and fix |
|---|---|
| "The site data could not be loaded" | A typo in one of the JSON files. Paste the file into https://jsonlint.com. The usual cause is a missing or extra comma. |
| "Open this site through a local server" | You opened `index.html` by double-clicking it. See section 4. |
| Changes do not appear on the live site | GitHub needs about a minute to rebuild. Then hard-refresh the page (Ctrl+Shift+R, or Cmd+Shift+R on a Mac). Check the **Actions** tab of the repository for a failed build. |
| "That project isn't here" | The `id` in the address does not match any `id` in `projects.json`. |
| A tool chip shows 0, or a filter is missing | The tool name in a project's `tools` list is spelled differently from the name in `site.json` → `skills`. They must match exactly. |
| Charts do not appear | Chart.js loads from a public CDN (jsDelivr). Without an internet connection the cards fall back to the cover image. |
| The form says it is not connected | `site.formspree_id` is empty. See section 9. |
| The site works at `/Portfolio/` but not at another address | The repository was renamed. The address always follows the repository name, including capital letters. |

---

## 14. Credits

- Fonts: [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) and [Geist Mono](https://github.com/vercel/geist-font), both under the SIL Open Font License. The licence files are in `assets/fonts/`.
- Charts: [Chart.js](https://www.chartjs.org/) (MIT licence), loaded from the jsDelivr CDN.
- Tool logos (Python, R): [Simple Icons](https://simpleicons.org/) (CC0), stored in `assets/img/icons/`. Tools without a Simple Icons logo show a letter tile in the brand colour. Brand names and colours belong to their owners.
- Datasets belong to their publishers and are linked from each project page.


## Story blocks

A project can tell its case study as a story (see `retailco-aws-analytics-architecture` in `data/projects.json`). Add `"story": { "title": "...", "blocks": [ ... ] }` and put `"story"` in `section_order`. The blocks are drawn by `js/story.js`.

Text is normally one string. Optionally, any text can have two versions, `{ "plain": "for anyone", "tech": "for technical readers" }`; the "In plain words / Under the hood" switch then appears at the top of the story. With one string everywhere, there is no switch.

| Block `type` | What it shows | Main fields |
|---|---|---|
| `chapter` | A numbered chapter | `number`, `kicker`, `title`, `text`, optional `stats` (value + label), `chips` (icon + text), `visual` (`{"kind": "files"}`: stores sending files into one place) |
| `flow` | An animated, clickable step-by-step journey with a play button | `title`, `intro`, `steps` (`n`, `icon`, `name`, `service`, `text`), `region` (`from`, `to`, `label`: the steps inside the dashed frame), `guard` (a security bar under the steps) |
| `decisions` | "Chose X over Y" cards | `items` (`chose`, `over`, `title`, `why`, optional `number` + `number_label`) |
| `budget` | A cost gauge against a budget, a cost breakdown and an optional comparison | `currency`, `spend`, `limit`, `verdict`, `parts` (`name`, `value`), `parts_note`, `compare` |
| `matrix` | A who-can-access-what table | `columns`, `rows` (`who`, `note`, `cells`: `true`, `false` or a short word such as `"Read"`) |
| `split` | Two side-by-side columns | `columns` (two of `label`, `title`, `items`) |
| `checklist` | Requirements, each ticked with how it was met | `items` (`need`, `how`) |
| `evidence` | Original images that open full size | `items` (`image`, `alt`, `caption`, `wide`) |

Icons available for `icon` fields: store, file, upload, bucket, gear, catalog, search, chart, people, shield, key, log, lock, maple, dollar, clock, check.

Only put numbers in a story that come from your own work, and label estimates as estimates.
