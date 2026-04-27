'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import PublicFooter from '@/components/PublicFooter';

const REVIEWER_EMAIL = 'reviewer@admitra.io';

const insightCards = [
  {
    title: 'Study & career potential',
    description:
      'Understand natural strengths, growth pace, and the kinds of academic environments that support better long-term results.',
  },
  {
    title: 'Thinking pattern',
    description:
      'See whether a learner tends to be more logical, imaginative, analytical, or balanced while solving problems.',
  },
  {
    title: 'Performance strategy',
    description:
      'Identify how the student performs best under pressure, structure, deadlines, and different forms of evaluation.',
  },
  {
    title: 'Performance methods',
    description:
      'Pinpoint the study methods, routines, and reinforcement styles that improve consistency and retention.',
  },
  {
    title: 'Study & expression style',
    description:
      'Map whether the learner expresses best through visual, verbal, written, or action-based formats.',
  },
  {
    title: 'Personality orientation',
    description:
      'Discover everyday motivators, blockers, confidence patterns, and support needs that influence educational choices.',
  },
];

const methodologyPoints = [
  'Structured input collection with quality checks.',
  'Pattern analysis aligned with student benchmarks.',
  'Cross-mapping to streams, subjects, and career clusters.',
  'Practical guidance with confidence-led recommendations.',
];

const planningBenefits = [
  'Faster decisions with less confusion at home.',
  'A study routine aligned to how the learner naturally works.',
  'A subject strategy connected to future academic goals.',
  'Career pathways with clearer entry routes and next steps.',
  'Lower stress, stronger consistency, and better momentum.',
];

const howItWorks = [
  'Speak with an advisor to understand the student context and current challenges.',
  'Complete the assessment process and expert review.',
  'Receive a potential profile with stream and career-fit direction.',
  'Build an education roadmap with actionable next steps.',
  'Continue with one-to-one guidance for implementation and review.',
];

const planningStages = [
  {
    step: '01',
    title: 'Potential intelligence assessment',
    description:
      'Measure learning behaviour, preparedness, and alignment between current effort and future aspirations.',
  },
  {
    step: '02',
    title: 'Education portfolio design',
    description:
      'Turn assessment insight into a focused plan covering subjects, habits, milestones, and opportunity pathways.',
  },
  {
    step: '03',
    title: 'Daily activity management',
    description:
      'Convert the plan into manageable routines, reflection points, and progress checkpoints students can sustain.',
  },
];

export default function Home() {
  const [dashboardPath, setDashboardPath] = useState('/dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReviewerUser, setIsReviewerUser] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      setIsLoggedIn(false);
      setIsReviewerUser(false);
      setDashboardPath('/dashboard');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setIsLoggedIn(true);

      const reviewerUser =
        user.role === 'REVIEWER' || user.email?.toLowerCase() === REVIEWER_EMAIL;
      setIsReviewerUser(reviewerUser);

      if (reviewerUser) {
        setDashboardPath('/reviewer/payment');
        return;
      }

      if (user.role === 'SUPER_ADMIN') {
        setDashboardPath('/super-admin/dashboard');
      } else if (user.role === 'ADMIN') {
        setDashboardPath('/admin/dashboard');
      } else if (user.role === 'COUNSELOR') {
        setDashboardPath('/counselor/dashboard');
      } else {
        setDashboardPath('/dashboard');
      }
    } catch {
      setIsLoggedIn(false);
      setIsReviewerUser(false);
      setDashboardPath('/dashboard');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#ffffff_55%,_#f8fafc_100%)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-8 top-24 h-28 w-28 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute right-8 top-12 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute bottom-8 left-1/3 h-32 w-32 rounded-full bg-indigo-300/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="animate-fade-in">
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Take a guided route to education, career, and life decisions.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                IMPACT Brainography helps learners understand how they think, study, perform,
                and express themselves so stream selection, subject choices, and future planning
                stop feeling like guesswork.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
                Designed for school and higher education journeys, the platform translates
                assessment insight into practical planning support that can guide academic
                progress and career readiness.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={isLoggedIn ? dashboardPath : '/login'}
                  className="btn-glow inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/20 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  {isReviewerUser ? 'Make a Payment' : isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
                </Link>
                <Link
                  href="/scanner-download"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-blue-200 hover:text-blue-700 hover:shadow-md"
                >
                  Scanner Download
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { value: '6', label: 'Core insight areas' },
                  { value: '3', label: 'Planning stages' },
                  { value: '1', label: 'Clearer path forward' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                    <div className="text-3xl font-black text-blue-700">{item.value}</div>
                    <div className="mt-1 text-sm font-medium text-slate-600">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-scale-in">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-1 shadow-2xl shadow-slate-300/70">
                <div className="rounded-[calc(2rem-4px)] bg-[linear-gradient(160deg,_#0f172a_0%,_#111827_45%,_#082f49_100%)] p-8 text-white">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                        Potential Intelligence Snapshot
                      </p>
                      <h2 className="mt-3 text-2xl font-bold">Know your potential. Plan your future.</h2>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v4m0 10v4m9-9h-4M7 12H3m15.364 6.364-2.828-2.828M8.464 8.464 5.636 5.636m12.728 0-2.828 2.828M8.464 15.536l-2.828 2.828" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      'Map study style, thinking pattern, and performance strategy.',
                      'Connect strengths to streams, subjects, and career directions.',
                      'Reduce trial-and-error in major education decisions.',
                    ].map((point) => (
                      <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <p className="text-sm leading-6 text-slate-200">{point}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                      <p className="text-sm text-cyan-100">Suitable for</p>
                      <p className="mt-2 text-lg font-semibold">School, UG, and PG learners</p>
                    </div>
                    <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
                      <p className="text-sm text-blue-100">Outcome</p>
                      <p className="mt-2 text-lg font-semibold">A practical learning and career roadmap</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
            Six dimensions that influence study fit and future direction
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Academic marks show outcomes. Brainography goes deeper into the patterns behind those
            outcomes so families and counselors can plan with more clarity.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {insightCards.map((card, index) => (
            <article
              key={card.title}
              className="card-hover rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                <span className="text-lg font-bold">0{index + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">{card.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-600">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-18 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
            <h2 className="mt-4 text-3xl font-black text-slate-950">A structured process, not a vague opinion</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              The assessment approach combines planning logic, educational principles, expert review,
              and benchmark-based interpretation so recommendations stay practical and actionable.
            </p>
            <ul className="mt-8 space-y-4">
              {methodologyPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="leading-7">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] bg-[linear-gradient(180deg,_#0f172a_0%,_#1e293b_100%)] p-8 text-white shadow-xl sm:p-10">
            <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-200">
              Why this matters
            </span>
            <h2 className="mt-4 text-3xl font-black">Marks alone do not explain fit.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Stream selection and career planning become stronger when they reflect how a learner
              actually processes information, stays engaged, and performs over time.
            </p>
            <div className="mt-8 space-y-4">
              {[
                'A mismatched stream can slow confidence and progress early.',
                'Today’s choices shape the options available tomorrow.',
                'Earlier clarity often leads to steadier results and lower stress.',
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
              Insight is the first step. A plan is what creates movement.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Once a student understands how they work best, the next priority is converting that
              awareness into daily habits, project choices, subject direction, and milestone-based
              preparation.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-500">
              This is where Brainography becomes more than an assessment. It becomes a planning
              partner for focused educational growth.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {planningBenefits.map((benefit, index) => (
              <div key={benefit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Benefit {index + 1}</div>
                <p className="mt-3 text-base leading-7 text-slate-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_100%)] py-18 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
              A simple guided journey from assessment to action
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-5">
            {howItWorks.map((step, index) => (
              <div key={step} className="relative rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-lg font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-base leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
              Progress becomes easier when the next stage is visible.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Families often need more than a report. They need a sequence: understand the learner,
              build the plan, and support the routine needed to follow through.
            </p>
          </div>

          <div className="space-y-5">
            {planningStages.map((stage) => (
              <article key={stage.step} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-600">Stage {stage.step}</div>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{stage.title}</h3>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-4 py-2 text-lg font-black text-white">{stage.step}</div>
                </div>
                <p className="mt-4 text-base leading-7 text-slate-600">{stage.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-18 sm:px-6 lg:px-8 lg:pb-24">
        <div className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,_#0f172a_0%,_#1d4ed8_45%,_#06b6d4_100%)] px-6 py-10 text-white shadow-2xl shadow-blue-500/20 sm:px-10 sm:py-14 lg:px-14">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                Give students a clearer route from potential to purposeful action.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-sky-50/90">
                Use IMPACT Brainography to make education planning more informed, more structured,
                and easier to act on.
              </p>
            </div>

            <div className="grid gap-4">
              <Link
                href={isLoggedIn ? dashboardPath : '/login'}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-base font-semibold text-blue-700 shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
              >
                {isReviewerUser ? 'Make a Payment' : isLoggedIn ? 'Open Dashboard' : 'Login to Continue'}
              </Link>
              <a
                href="mailto:hello@admitra.io"
                className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-4 text-base font-semibold text-white transition-colors duration-300 hover:bg-white/15"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
