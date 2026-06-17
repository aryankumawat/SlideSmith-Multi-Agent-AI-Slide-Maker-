import { BaseAgent, AgentConfig } from '../base-agent';

export type RepurposeFormat = 'linkedin' | 'twitter_thread' | 'blog' | 'email';

export interface ContentRepurposerInput {
  deck: {
    title: string;
    slides: Array<{
      title: string;
      bullets?: string[];
      paragraph?: string;
      notes?: string;
      stat_blocks?: Array<{ value: string; label: string }> | null;
    }>;
  };
  formats: RepurposeFormat[];
  tone?: string;
}

export interface ContentRepurposerOutput {
  linkedin?: string;
  twitter_thread?: string[];
  blog?: string;
  email?: string;
}

export class ContentRepurposerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'content-repurposer',
      description: 'Transforms finished decks into LinkedIn posts, Twitter threads, blog articles, and email newsletters',
      capabilities: ['content-generation', 'format-conversion'],
      maxRetries: 2,
      timeout: 60000,
    };
    super(config);
  }

  async execute(input: ContentRepurposerInput): Promise<ContentRepurposerOutput> {
    const summary = this.buildDeckSummary(input.deck);
    const tone = input.tone || 'professional';

    // Run all requested formats in parallel
    const results = await Promise.allSettled(
      input.formats.map(fmt => this.generateFormat(fmt, summary, input.deck.title, tone))
    );

    const output: ContentRepurposerOutput = {};
    input.formats.forEach((fmt, i) => {
      const r = results[i];
      if (r.status === 'fulfilled') {
        (output as any)[fmt] = r.value;
      }
    });

    return output;
  }

  private buildDeckSummary(deck: ContentRepurposerInput['deck']): string {
    return deck.slides.map(s => {
      const content = [
        s.paragraph,
        ...(s.bullets || []).map(b => b.replace(/\*\*/g, '')),
        ...(s.stat_blocks || []).map(sb => `${sb.value}: ${sb.label}`),
        s.notes,
      ].filter(Boolean).join(' ');
      return `${s.title}: ${content.slice(0, 300)}`;
    }).join('\n\n');
  }

  private async generateFormat(fmt: RepurposeFormat, summary: string, title: string, tone: string): Promise<any> {
    switch (fmt) {
      case 'linkedin': return this.generateLinkedIn(summary, title, tone);
      case 'twitter_thread': return this.generateTwitterThread(summary, title, tone);
      case 'blog': return this.generateBlog(summary, title, tone);
      case 'email': return this.generateEmail(summary, title, tone);
    }
  }

  private async generateLinkedIn(summary: string, title: string, tone: string): Promise<string> {
    const prompt = `Write a LinkedIn post based on this presentation: "${title}"

Presentation content:
${summary.slice(0, 1500)}

Tone: ${tone}

Rules:
- 150-300 words total
- Start with a strong hook sentence (no "I'm excited to share" or "Thrilled to announce")
- 3-5 key takeaways as short lines (not a bulleted list — just line breaks)
- End with a specific question to drive engagement
- No more than 2-3 hashtags, at the very end, only if genuinely relevant
- Write in first person, confident and direct
- No em-dashes

Return ONLY the post text, no explanation:`;

    const result = await this.callLLM(prompt);
    return result.content.trim();
  }

  private async generateTwitterThread(summary: string, title: string, tone: string): Promise<string[]> {
    const prompt = `Write a Twitter/X thread based on this presentation: "${title}"

Presentation content:
${summary.slice(0, 1500)}

Tone: ${tone}

Return ONLY valid JSON:
{
  "tweets": [
    "Hook tweet that makes people want to read the thread (≤280 chars)",
    "Tweet 2 with key point 1 (≤280 chars)",
    "Tweet 3 with key point 2 (≤280 chars)",
    "Tweet 4 with key point 3 (≤280 chars)",
    "Tweet 5 with key point 4 (≤280 chars)",
    "Tweet 6 with key point 5 (≤280 chars)",
    "Final tweet with the big takeaway and a CTA (≤280 chars)"
  ]
}

Rules:
- 7-10 tweets
- Number each tweet: "1/ Hook...", "2/ ...", etc.
- Each tweet ≤280 characters
- First tweet must stand alone as a hook
- No filler tweets
JSON:`;

    const result = await this.callLLM(prompt);
    const parsed = this.parseJSON(result.content);
    return parsed.tweets || [];
  }

  private async generateBlog(summary: string, title: string, tone: string): Promise<string> {
    const prompt = `Write a blog article based on this presentation: "${title}"

Presentation content:
${summary.slice(0, 2000)}

Tone: ${tone}

Rules:
- 600-900 words
- Start with a compelling lede (first paragraph, no heading)
- Use H2 headings (## Heading) that match the presentation's sections
- Write in flowing paragraphs, not bullet lists
- Include specific statistics or facts from the content
- End with a clear conclusion and one call to action
- No "In conclusion" or "In summary" openers for the last section
- Sentence case for all headings

Return ONLY the article in Markdown, no explanation:`;

    const result = await this.callLLM(prompt);
    return result.content.trim();
  }

  private async generateEmail(summary: string, title: string, tone: string): Promise<string> {
    const prompt = `Write an email newsletter based on this presentation: "${title}"

Presentation content:
${summary.slice(0, 1500)}

Tone: ${tone}

Return ONLY valid JSON:
{
  "subject": "Email subject line (max 60 chars, no ALL CAPS)",
  "body": "Full email body (200-250 words). Start with a 1-sentence context setter. Then 3 key points as short paragraphs. End with a clear CTA. Sign off as 'The SlideSmith Team'."
}
JSON:`;

    const result = await this.callLLM(prompt);
    const parsed = this.parseJSON(result.content);
    return `Subject: ${parsed.subject}\n\n${parsed.body}`;
  }

  private parseJSON(raw: string): any {
    let s = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const start = s.indexOf('{'), end = s.lastIndexOf('}');
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    try { return JSON.parse(s); } catch { return {}; }
  }
}
