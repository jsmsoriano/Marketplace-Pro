# ResumeMatch AI

Upload a resume, add a job description, and get an ATS-oriented rewrite from Claude.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`
3. Start the app: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Supported resume formats

PDF, DOCX, and TXT, up to 10MB. Legacy `.doc` files are not supported — export them as PDF or DOCX first.

## Privacy

Resumes are parsed in memory and are not saved on this server. The extracted resume text and job description are sent to Anthropic to generate the rewrite. Do not upload information you cannot share with Anthropic.

## Job URLs

You can paste a public job-posting URL. The fetcher only allows `http`/`https` pages on public addresses — localhost, private networks, and cloud metadata hosts are blocked. Many boards require login or block scrapers; if fetch fails, paste the description instead.

## Scripts

```bash
npm run dev    # development server
npm run build  # production build
npm run lint   # eslint
npm test       # unit tests
```
