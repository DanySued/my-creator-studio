'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { SlideCard, type Slide } from '@/components/carousel/SlideCard';
import { getTheme } from '@/lib/carouselThemes';

// ─── Template data ────────────────────────────────────────────────────────────

type Category = 'all' | 'educational' | 'motivational' | 'marketing' | 'lifestyle' | 'tech';

interface Template {
  id: string;
  name: string;
  category: Exclude<Category, 'all'>;
  themeId: string;
  slides: Array<{ type: 'cover' | 'content' | 'cta'; title: string; body: string; numberLabel: string }>;
}

const TEMPLATES: Template[] = [
  // ── Thread theme ──────────────────────────────────────────────────────────
  {
    id: 'morning-habits',
    name: '5 Morning Habits',
    category: 'lifestyle',
    themeId: 'thread',
    slides: [
      { type: 'cover', title: '5 Morning Habits That Changed My Life', body: 'A quiet revolution before 8am', numberLabel: '01' },
      { type: 'content', title: 'Wake Up Before the World', body: 'Rising at 5:30am gives you uninterrupted time to think, plan, and prepare before the noise begins.', numberLabel: '02' },
      { type: 'cta', title: 'Follow for more life upgrades', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'journal-prompts',
    name: 'Daily Journal Prompts',
    category: 'lifestyle',
    themeId: 'thread',
    slides: [
      { type: 'cover', title: '7 Journal Prompts to Start Your Day', body: 'Five minutes of reflection, lifetime of clarity', numberLabel: '01' },
      { type: 'content', title: 'What Am I Grateful For?', body: 'Name three specific things — not generic "health and family" but real, vivid moments from yesterday.', numberLabel: '02' },
      { type: 'cta', title: 'Save this for tomorrow morning', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'slow-living',
    name: 'The Art of Slow Living',
    category: 'lifestyle',
    themeId: 'thread',
    slides: [
      { type: 'cover', title: 'The Art of Slow Living', body: 'Why less is truly more', numberLabel: '01' },
      { type: 'content', title: 'Say No With Confidence', body: 'Every yes to something is a no to something else. Guard your calendar like you guard your bank account.', numberLabel: '02' },
      { type: 'cta', title: 'Share with someone who needs this', body: '', numberLabel: '03' },
    ],
  },

  // ── Plasma theme ──────────────────────────────────────────────────────────
  {
    id: 'js-in-5',
    name: 'JavaScript in 5 Steps',
    category: 'tech',
    themeId: 'plasma',
    slides: [
      { type: 'cover', title: 'Learn JavaScript in 5 Steps', body: 'From zero to functional developer', numberLabel: '01' },
      { type: 'content', title: 'Step 1 — Understand Variables', body: 'const, let, and var define how data is stored. Master these first and everything else becomes clearer.', numberLabel: '02' },
      { type: 'cta', title: 'Save this roadmap for your journey', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'ai-tools',
    name: '10 AI Tools You Need',
    category: 'tech',
    themeId: 'plasma',
    slides: [
      { type: 'cover', title: '10 AI Tools That Will 10× Your Output', body: 'The creator toolkit of 2025', numberLabel: '01' },
      { type: 'content', title: 'Claude — Your Thinking Partner', body: 'Use it to draft, critique, and refine. The best results come from treating AI as a collaborator, not a vending machine.', numberLabel: '02' },
      { type: 'cta', title: 'Which tool are you trying first?', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'web-dev-tips',
    name: 'Web Dev Tips',
    category: 'educational',
    themeId: 'plasma',
    slides: [
      { type: 'cover', title: '8 Web Dev Habits of Senior Developers', body: 'What they do differently', numberLabel: '01' },
      { type: 'content', title: 'Write Code for Humans First', body: 'Code is read far more often than it is written. Prioritize clarity over cleverness every single time.', numberLabel: '02' },
      { type: 'cta', title: 'Drop your best dev tip below', body: '', numberLabel: '03' },
    ],
  },

  // ── Navy theme ────────────────────────────────────────────────────────────
  {
    id: 'sales-funnel',
    name: 'Sales Funnel Explained',
    category: 'marketing',
    themeId: 'navy',
    slides: [
      { type: 'cover', title: 'The Sales Funnel Explained', body: 'Turn strangers into loyal customers', numberLabel: '01' },
      { type: 'content', title: 'Awareness Is Everything', body: 'Nobody buys from brands they have never heard of. Your content is your first handshake — make it count.', numberLabel: '02' },
      { type: 'cta', title: 'Ready to build your funnel?', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'personal-brand',
    name: 'Build Your Personal Brand',
    category: 'marketing',
    themeId: 'navy',
    slides: [
      { type: 'cover', title: 'Build a Personal Brand in 90 Days', body: 'A practical roadmap for creators', numberLabel: '01' },
      { type: 'content', title: 'Pick One Platform First', body: 'Master Instagram before expanding to YouTube or LinkedIn. Depth beats breadth in year one. Go all-in.', numberLabel: '02' },
      { type: 'cta', title: 'Follow for the full 90-day plan', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar Setup',
    category: 'marketing',
    themeId: 'navy',
    slides: [
      { type: 'cover', title: 'How to Plan a Month of Content in 2 Hours', body: 'Batch, batch, batch', numberLabel: '01' },
      { type: 'content', title: 'Start With Pillars', body: 'Pick 3–5 content themes you return to weekly. Pillars give your audience a reason to stay and your brain a framework.', numberLabel: '02' },
      { type: 'cta', title: 'Save this content planning guide', body: '', numberLabel: '03' },
    ],
  },

  // ── Noir theme ────────────────────────────────────────────────────────────
  {
    id: 'growth-mindset',
    name: 'Growth Mindset',
    category: 'motivational',
    themeId: 'noir',
    slides: [
      { type: 'cover', title: 'The Growth Mindset Shift That Changes Everything', body: 'Your beliefs shape your results', numberLabel: '01' },
      { type: 'content', title: 'Failure Is Feedback', body: 'Every mistake contains a lesson. The only way to truly fail is to stop extracting what went wrong and trying again.', numberLabel: '02' },
      { type: 'cta', title: 'Share this with someone growing', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'discipline-wins',
    name: 'Discipline Over Motivation',
    category: 'motivational',
    themeId: 'noir',
    slides: [
      { type: 'cover', title: 'Why Discipline Beats Motivation Every Time', body: 'The unglamorous truth about success', numberLabel: '01' },
      { type: 'content', title: 'Motivation Is a Visitor', body: 'It shows up when things feel exciting. Discipline shows up when they feel hard. Build systems, not inspiration.', numberLabel: '02' },
      { type: 'cta', title: 'Save this for your next hard day', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'deep-work',
    name: 'Deep Work Principles',
    category: 'educational',
    themeId: 'noir',
    slides: [
      { type: 'cover', title: '5 Deep Work Principles That Doubled My Output', body: 'Cal Newport was right', numberLabel: '01' },
      { type: 'content', title: 'Schedule Your Depth', body: 'Protect 2–4 hour blocks for your most important work. Treat them like non-negotiable appointments. No exceptions.', numberLabel: '02' },
      { type: 'cta', title: 'What is your deep work ritual?', body: '', numberLabel: '03' },
    ],
  },

  // ── Bloom theme ───────────────────────────────────────────────────────────
  {
    id: 'wellness-reset',
    name: 'Wellness Reset',
    category: 'lifestyle',
    themeId: 'bloom',
    slides: [
      { type: 'cover', title: '7-Day Wellness Reset to Feel Like Yourself Again', body: 'Small steps, real results', numberLabel: '01' },
      { type: 'content', title: 'Day 1 — Hydrate First', body: 'Drink 500ml of water before coffee. Your brain is 73% water. Give it what it needs before you demand anything from it.', numberLabel: '02' },
      { type: 'cta', title: 'Start your reset tomorrow morning', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'mindfulness-101',
    name: 'Mindfulness 101',
    category: 'educational',
    themeId: 'bloom',
    slides: [
      { type: 'cover', title: 'Mindfulness 101 — A Beginner\'s Guide', body: 'You don\'t need to meditate for an hour', numberLabel: '01' },
      { type: 'content', title: 'The 5-4-3-2-1 Technique', body: 'Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste. Instant presence in under 60 seconds.', numberLabel: '02' },
      { type: 'cta', title: 'Try it right now and tell me how it feels', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'social-media-detox',
    name: 'Social Media Detox',
    category: 'lifestyle',
    themeId: 'bloom',
    slides: [
      { type: 'cover', title: 'How a 7-Day Social Media Detox Changed My Brain', body: 'What I noticed after 168 hours offline', numberLabel: '01' },
      { type: 'content', title: 'Boredom Is a Superpower', body: 'Without the scroll reflex, boredom returned. And boredom is where creativity, curiosity, and real thought live.', numberLabel: '02' },
      { type: 'cta', title: 'Would you try a digital detox?', body: '', numberLabel: '03' },
    ],
  },

  // ── Clay theme ────────────────────────────────────────────────────────────
  {
    id: 'creative-block',
    name: 'Beat Creative Block',
    category: 'motivational',
    themeId: 'clay',
    slides: [
      { type: 'cover', title: '5 Ways to Beat Creative Block Today', body: 'When the page is blank and the clock ticks', numberLabel: '01' },
      { type: 'content', title: 'Consume to Create', body: 'Read a book outside your niche. Watch a documentary. Walk without your phone. Input fuels output. Always.', numberLabel: '02' },
      { type: 'cta', title: 'Share your anti-block ritual below', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'storytelling',
    name: 'Storytelling Formula',
    category: 'marketing',
    themeId: 'clay',
    slides: [
      { type: 'cover', title: 'The 3-Part Storytelling Formula for Creators', body: 'Hook. Conflict. Resolution.', numberLabel: '01' },
      { type: 'content', title: 'Start in the Middle', body: 'Skip the backstory. Drop readers into the moment of tension. Then zoom out. The best stories begin where the stakes are highest.', numberLabel: '02' },
      { type: 'cta', title: 'Use this formula in your next post', body: '', numberLabel: '03' },
    ],
  },
  {
    id: 'productivity-system',
    name: 'Productivity System',
    category: 'educational',
    themeId: 'clay',
    slides: [
      { type: 'cover', title: 'Build a Productivity System That Actually Sticks', body: 'No app required', numberLabel: '01' },
      { type: 'content', title: 'The Weekly Review Ritual', body: 'Every Sunday, spend 20 minutes reviewing what got done, what did not, and why. This one habit compounds faster than any tool.', numberLabel: '02' },
      { type: 'cta', title: 'Save this and review it on Sunday', body: '', numberLabel: '03' },
    ],
  },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'educational', label: 'Educational' },
  { id: 'motivational', label: 'Motivational' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'tech', label: 'Tech' },
];

const CATEGORY_COLORS: Record<Exclude<Category, 'all'>, string> = {
  educational: 'bg-blue-500/15 text-blue-400',
  motivational: 'bg-amber-500/15 text-amber-400',
  marketing: 'bg-emerald-500/15 text-emerald-400',
  lifestyle: 'bg-pink-500/15 text-pink-400',
  tech: 'bg-cyan-500/15 text-cyan-400',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const filtered = activeCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  // Map carousel theme IDs to canvas-editor template IDs
  const THEME_TO_CANVAS: Record<string, string> = {
    thread: 'minimal',
    noir: 'noir',
    bloom: 'pastel',
    navy: 'gradient',
    plasma: 'aurora',
    clay: 'studio',
  };

  const handleUseTemplate = (tpl: Template) => {
    const canvasTemplate = THEME_TO_CANVAS[tpl.themeId] ?? 'minimal';
    router.push(`/canvas-editor?template=${canvasTemplate}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Template Library</h1>
        <p className="text-muted-foreground text-sm">
          Choose a template to jumpstart your carousel. Click &ldquo;Use Template&rdquo; to load it into the editor.
        </p>
      </motion.div>

      {/* Category tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex items-center gap-2 mb-8 flex-wrap"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </motion.div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((tpl, i) => {
          const theme = getTheme(tpl.themeId);
          const PREVIEW_SCALE = 0.095;
          const cardW = Math.round(1080 * PREVIEW_SCALE);
          const cardH = Math.round(1350 * PREVIEW_SCALE);

          return (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all"
            >
              {/* Mini carousel preview */}
              <div className="bg-zinc-950 p-4 flex items-center justify-center gap-2">
                {tpl.slides.slice(0, 3).map((slide, si) => {
                  const s: Slide = {
                    id: `preview-${si}`,
                    type: slide.type,
                    numberLabel: slide.numberLabel,
                    title: slide.title,
                    body: slide.body,
                  };
                  return (
                    <div
                      key={si}
                      style={{ width: cardW, height: cardH, flexShrink: 0 }}
                      className="rounded overflow-hidden shadow-md"
                    >
                      <SlideCard slide={s} theme={theme} scale={PREVIEW_SCALE} />
                    </div>
                  );
                })}
              </div>

              {/* Card info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{theme.name} theme</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${CATEGORY_COLORS[tpl.category]}`}>
                    {tpl.category}
                  </span>
                </div>
                <button
                  onClick={() => handleUseTemplate(tpl)}
                  className="w-full py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:brightness-110 transition-all"
                >
                  Edit in Canvas
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
