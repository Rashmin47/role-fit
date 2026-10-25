/**
 * Fictional resumes used by the sample screening demo.
 *
 * These are synthetic fixtures, not live candidates. Every entry is structured
 * like a real resume so the offline extractor has to cite actual lines rather
 * than rely on fabricated defaults.
 */

export interface DemoResume {
  name: string;
  text: string;
}

export const DEMO_JOB_DESCRIPTION = `We are looking for a Python Backend Developer with 3+ years of professional experience building scalable web APIs.
Key Requirements:
- Strong proficiency in Python and FastAPI or Django.
- Experience with PostgreSQL schema design, queries, and optimization.
- Containerization with Docker for development and deployment.
- Experience with Redis caching and asynchronous queues is preferred.
- Familiarity with unit testing (PyTest) and CI/CD pipelines.`;

export const DEMO_RESUME_POOL: DemoResume[] = [
  {
    name: "Sanjay Thapa",
    text: `Sanjay Thapa
Kathmandu, Nepal | sanjay.thapa@example.com | +977 9800000001

SUMMARY
Backend engineer focused on payment APIs, relational data, and reliable delivery.

EXPERIENCE
Associate Backend Engineer
Himalaya Payments | Jan 2024 - Present
- Built FastAPI services for merchant onboarding and settlement reconciliation.
- Designed PostgreSQL schemas and tuned slow queries for the transaction ledger.
- Packaged services with Docker and added PyTest coverage for critical paths.

EDUCATION
BSc Computer Science
Tribhuvan University | 2019 - 2023

PROJECTS
- Ledger Reconciliation API — FastAPI service that reconciles merchant settlements with PostgreSQL and Redis.
- Ops Dashboard — React and TypeScript dashboard for failed payments.

SKILLS
Python, FastAPI, PostgreSQL, Docker, Redis, Git, PyTest`,
  },
  {
    name: "Aarav Sharma",
    text: `Aarav Sharma
Lalitpur, Nepal | aarav.sharma@example.com | +977 9800000002

SUMMARY
Backend engineer with production experience in distributed APIs and cloud delivery.

EXPERIENCE
Lead Backend Engineer
Everest Commerce | Jan 2023 - Present
- Architected FastAPI services with PostgreSQL and Redis for high-volume checkout.
- Introduced GitHub Actions CI/CD pipelines and Docker-based deployments.
- Mentored two engineers and led API design reviews.

Backend Engineer
Sagarmatha Tech | Jan 2021 - Dec 2022
- Built Django REST APIs backed by PostgreSQL.
- Wrote PyTest suites and automated release checks.

EDUCATION
BE Computer Engineering
Pulchowk Campus | 2016 - 2020

CERTIFICATIONS
AWS Certified Cloud Practitioner — Amazon Web Services, 2024

SKILLS
Python, FastAPI, Django, PostgreSQL, Redis, Docker, Git, PyTest, CI/CD, GitHub Actions, AWS`,
  },
  {
    name: "Priya Karki",
    text: `Priya Karki
Pokhara, Nepal | priya.karki@example.com | +977 9800000003

SUMMARY
Python developer working across Django APIs and PostgreSQL data models.

EXPERIENCE
Python Developer
Annapurna Retail | Mar 2022 - Present
- Built Django REST endpoints for inventory and order workflows.
- Optimized PostgreSQL queries and reporting views.
- Used Docker for local and staging environments.
- Wrote PyTest tests for order and inventory services.

EDUCATION
BSc Computer Science
Kathmandu University | 2017 - 2021

SKILLS
Python, Django, PostgreSQL, Docker, Git, SQL, PyTest`,
  },
  {
    name: "Bikash Adhikari",
    text: `Bikash Adhikari
Kathmandu, Nepal | bikash.adhikari@example.com | +977 9800000004

SUMMARY
Senior backend specialist with deep experience in API reliability and data performance.

EXPERIENCE
Senior Backend Specialist
Himalayan Cloud Works | Jan 2019 - Present
- Designed FastAPI and Python services for logistics and billing.
- Tuned PostgreSQL clusters and introduced Redis caching.
- Standardized Docker images and CI/CD release pipelines.
- Built PyTest and integration test suites for critical services.
- Deployed workloads on AWS with infrastructure as code.

EDUCATION
MSc Computer Science
Tribhuvan University | 2015 - 2017

PROJECTS
- Route Planner — FastAPI service for delivery route optimization with PostgreSQL.
- Incident Console — Next.js and TypeScript console for on-call engineers.

CERTIFICATIONS
AWS Certified Solutions Architect — Amazon Web Services, 2023

SKILLS
Python, FastAPI, PostgreSQL, Redis, Docker, Kubernetes, CI/CD, PyTest, AWS, Git`,
  },
  {
    name: "Rohan Joshi",
    text: `Rohan Joshi
Bhaktapur, Nepal | rohan.joshi@example.com | +977 9800000005

SUMMARY
Junior backend developer building small Python services and learning production workflows.

EXPERIENCE
Junior Backend Developer
Local Ledger | Jul 2024 - Present
- Built Flask endpoints for internal bookkeeping tools.
- Wrote SQL queries against PostgreSQL.
- Fixed bugs and added basic tests.

EDUCATION
BSc Computer Science
Tribhuvan University | 2020 - 2024

SKILLS
Python, Flask, PostgreSQL, SQL, Git`,
  },
  {
    name: "Anjali Mehta",
    text: `Anjali Mehta
Kathmandu, Nepal | anjali.mehta@example.com | +977 9800000006

SUMMARY
Software engineer focused on asynchronous APIs and containerized delivery.

EXPERIENCE
Software Engineer
Siddhi Health | Feb 2023 - Present
- Built asynchronous FastAPI endpoints for appointment scheduling.
- Modeled PostgreSQL data and added Redis-backed caching.
- Containerized services with Docker and maintained CI/CD checks.

EDUCATION
BSc Software Engineering
Pokhara University | 2018 - 2022

PROJECTS
- Clinic Queue — FastAPI and PostgreSQL service for appointment queues.

SKILLS
Python, FastAPI, PostgreSQL, Redis, Docker, CI/CD, Git`,
  },
];
