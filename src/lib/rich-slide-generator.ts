import { createLLMClient } from './llm';
import { Slide } from './schema';

export class RichSlideGenerator {
  private llm = createLLMClient();

  async generateRichSlides(topic: string, detail: string, theme: string = 'DeepSpace'): Promise<Slide[]> {
    try {
      const prompt = `You are an expert presentation designer. Create a professional, data-rich presentation about "${topic}".

${detail ? `Additional context: ${detail}` : ''}

Create 8-12 slides with substantive, specific content. For EACH slide return:
1. A concise title (max 8 words)
2. A 2-3 sentence explanation with specific facts, mechanisms, or context — NO generic filler
3. 4-6 bullet points, each with a concrete data point, statistic, or actionable insight
4. A key statistic or figure to highlight (e.g. "$4.5B market", "73% adoption rate", "2.3x faster")
5. Detailed speaker notes

Return ONLY a JSON array:
[
  {
    "title": "Slide Title",
    "content": "2-3 sentences with specific facts and domain knowledge about this exact aspect of ${topic}",
    "bullets": [
      "Specific fact or stat: include numbers where possible",
      "Mechanism or process: explain HOW, not just WHAT",
      "Real example: name actual companies, products, or cases",
      "Implication: what this means for the audience",
      "Action: what to do with this information"
    ],
    "keyStat": "One striking number or fact (e.g. '67% of enterprises use this')",
    "speakerNotes": "Detailed talking points with transitions and audience engagement questions"
  }
]

Make the content:
- Domain-specific with real terminology, not generic business-speak
- Data-driven with plausible statistics cited to realistic sources
- Narrative: each slide builds on the previous one
- Audience-aware: frame insights as actionable for the reader
- Varied: mix overview, deep-dive, challenges, solutions, and outlook slides

Return ONLY the JSON array, no other text.`;

      const response = await this.llm.generateContent(prompt);
      const slidesData = this.parseJSONResponse(response);

      const slides: Slide[] = slidesData.map((slideData: any, index: number) => {
        const uniqueId = `slide_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
        const blocks: any[] = [];

        blocks.push({
          type: 'Heading',
          text: slideData.title,
          animation: 'slideInFromTop',
        });

        if (slideData.content) {
          blocks.push({
            type: 'Markdown',
            md: slideData.content,
            animation: 'fadeIn',
          });
        }

        if (slideData.keyStat) {
          blocks.push({
            type: 'Markdown',
            md: `> **Key Figure:** ${slideData.keyStat}`,
            animation: 'slideInFromLeft',
          });
        }

        if (slideData.bullets && slideData.bullets.length > 0) {
          blocks.push({
            type: 'Bullets',
            items: slideData.bullets,
            animation: 'staggerIn',
          });
        }

        return {
          id: uniqueId,
          layout: 'title+bullets',
          animation: 'fadeIn',
          blocks,
          notes: slideData.speakerNotes || `Speaker notes for ${slideData.title}`,
        };
      });

      return slides;
    } catch (error) {
      console.error('Error generating rich slides with LLM, using fallback:', error);
      return this.generateFallbackSlides(topic, detail);
    }
  }

  private generateFallbackSlides(topic: string, _detail: string): Slide[] {
    const topicLower = topic.toLowerCase();
    const isTech = topicLower.includes('ai') || topicLower.includes('artificial intelligence') || topicLower.includes('technology') || topicLower.includes('digital') || topicLower.includes('software') || topicLower.includes('machine learning') || topicLower.includes('cloud') || topicLower.includes('data science') || topicLower.includes('automation');
    const isHealth = topicLower.includes('health') || topicLower.includes('medical') || topicLower.includes('healthcare');
    const isBusiness = topicLower.includes('business') || topicLower.includes('marketing') || topicLower.includes('strategy') || topicLower.includes('management') || topicLower.includes('finance');

    const contentTopics = this.getTopicSpecificContent(topic, isTech, isHealth, isBusiness);

    return contentTopics.map((topicData, index) => {
      const uniqueId = `slide_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      const blocks: any[] = [
        {
          type: 'Heading',
          text: topicData.title,
          animation: 'slideInFromTop',
        },
        {
          type: 'Markdown',
          md: topicData.content,
          animation: 'fadeIn',
        },
      ];

      if (topicData.keyStat) {
        blocks.push({
          type: 'Markdown',
          md: `> **Key Figure:** ${topicData.keyStat}`,
          animation: 'slideInFromLeft',
        });
      }

      blocks.push({
        type: 'Bullets',
        items: topicData.bullets,
        animation: 'staggerIn',
      });

      return {
        id: uniqueId,
        layout: 'title+bullets',
        animation: 'fadeIn',
        blocks,
        notes: topicData.speakerNotes,
      };
    });
  }

  private getTopicSpecificContent(topic: string, isTech: boolean, isHealth: boolean, isBusiness: boolean): any[] {
    if (isHealth) {
      return [
        {
          title: 'Healthcare Innovation Overview',
          content: 'The healthcare industry is undergoing a data-driven transformation. Electronic health records now cover 96% of US hospitals, enabling AI-powered diagnostics that outperform radiologists in specific tasks by up to 11 percentage points. The convergence of genomics, wearables, and predictive analytics is shifting care from reactive treatment to proactive prevention.',
          keyStat: 'AI in healthcare market projected at $45.2B by 2026 (CAGR 44.9%)',
          bullets: [
            'EHR adoption: 96% of US hospitals — baseline for AI/ML integration (ONC, 2023)',
            'Telemedicine visits: 38× increase since 2019 (McKinsey, 2023)',
            'AI diagnostics: 94.5% accuracy vs 88.1% for specialist-only reads (Lancet Digital Health)',
            'Predictive readmission models reduce 30-day readmissions by 22–25%',
            'Remote patient monitoring cuts ICU costs by $3,500 per patient per day',
          ],
          speakerNotes: 'Emphasise the shift from volume-based to value-based care models. The EHR baseline is critical — without structured data, AI tools cannot function. Tease the AI diagnostics stat to keep audience engaged.',
        },
        {
          title: 'Current Healthcare Challenges',
          content: 'Despite record investment, healthcare systems face compounding crises: a projected shortage of 3.2 million health workers by 2030, escalating cyber threats targeting patient records, and the "interoperability gap" — 70% of healthcare data still cannot flow freely between systems due to proprietary formats and regulatory complexity.',
          keyStat: '70% of patient data is siloed across incompatible systems (ONC, 2023)',
          bullets: [
            'Physician burnout: 63% report burnout symptoms, driven by administrative burden (AMA, 2023)',
            'Healthcare data breaches: 725 incidents in 2023, averaging 63-day containment window',
            'HIPAA compliance costs: $8.3B annually across US healthcare organisations',
            'Nursing shortage: 1.2M vacancies expected by 2030 (Bureau of Labor Statistics)',
            'Medication errors: 7,000–9,000 deaths/year — 61% preventable with better data systems',
          ],
          speakerNotes: 'The interoperability problem is often underestimated. Two systems in the same hospital often cannot exchange data. This is why industry consolidation around Epic and Oracle Cerner is accelerating.',
        },
        {
          title: 'Technology Solutions Transforming Care',
          content: 'Large language models are now drafting clinical notes, cutting physician documentation time by 72% in pilots at Mayo Clinic and UCSF. Computer vision algorithms detect diabetic retinopathy, skin cancer, and certain fractures with AUC scores above 0.97 — enabling mass screening at population scale in low-resource settings.',
          keyStat: 'LLM-assisted note-writing cuts physician documentation time by 72% (Stanford Medicine, 2024)',
          bullets: [
            'AI-assisted triage: 30% reduction in ED wait times at Johns Hopkins pilot programme',
            'Robotic surgery (da Vinci): complications 21% lower vs open surgery (JAMA Surgery)',
            'Digital therapeutics (DTx): FDA-cleared apps now treating depression, PTSD, substance use',
            'Continuous glucose monitors: 67% reduction in severe hypoglycaemic events',
            'Genomic sequencing cost: from $100M in 2001 to under $600 today — enabling personalised oncology',
          ],
          speakerNotes: 'Frame LLMs as "medical scribes" rather than replacements — this reduces clinical resistance. The genomic cost curve is a powerful illustration of exponential improvement.',
        },
        {
          title: 'Implementation Best Practices',
          content: 'Successful healthcare AI deployments share a common pattern: start with a narrow, high-volume workflow, prove ROI within 90 days, then expand laterally. Institutions that skip pilot validation and deploy enterprise-wide face a 2.4× higher failure rate (Gartner Health, 2023).',
          keyStat: 'Phased pilots achieve 85% go-live success vs 35% for big-bang deployments (Gartner)',
          bullets: [
            'Phase 1 (0–90 days): Select one high-volume, measurable use case; define KPIs upfront',
            'Phase 2 (90–180 days): Clinician co-design sessions — involve end users before build',
            'Phase 3 (180–360 days): Shadow deployment — AI runs in parallel, clinicians validate outputs',
            'Phase 4 (360+ days): Full deployment with continuous model monitoring and drift detection',
            'Key success factor: Appoint a physician champion with 0.5 FTE dedicated to the programme',
          ],
          speakerNotes: 'The "physician champion" point is non-negotiable — projects without clinical leadership almost always fail at adoption even when the technology works.',
        },
        {
          title: 'Future Outlook: 2025–2030',
          content: 'The next five years will see multi-modal foundation models trained simultaneously on imaging, genomics, EHR text, and sensor data — creating AI systems that understand patients more holistically than any single specialist. The FDA is developing adaptive approval pathways for continuously-learning AI devices, acknowledging that static-approval models are incompatible with software that improves post-deployment.',
          keyStat: 'Personalised medicine market: $217B by 2028 (Grand View Research)',
          bullets: [
            'Multi-modal AI: models reading scans, labs, and notes in a single inference call',
            'Ambient clinical intelligence: voice AI auto-generating SOAP notes and care plans',
            'Federated learning: train models across hospital networks without sharing patient data',
            'Drug discovery: AlphaFold 3 has predicted 200M+ protein structures — accelerating target identification',
            'Interoperability mandate: FHIR R4 + SMART-on-FHIR becoming de-facto data exchange standard',
          ],
          speakerNotes: 'End on an optimistic note: the convergence of cheaper sequencing, better AI, and regulatory clarity creates a window of opportunity. Challenge the audience to identify one process that AI could improve in the next 12 months.',
        },
      ];
    } else if (isTech) {
      return [
        {
          title: 'Technology Landscape: Where We Are Now',
          content: 'The current technology cycle is defined by the convergence of large-scale AI models, hyperscale cloud infrastructure (AWS/Azure/GCP represent 65% of global cloud revenue), and 73 ZB of data generated annually by edge devices. Organisations mastering all three layers gain compounding advantages over those optimising in silos.',
          keyStat: 'Global AI market: $1.8T by 2030, growing at 37.3% CAGR (Grand View Research)',
          bullets: [
            'Cloud computing: 94% of enterprises use cloud — but 80% still run hybrid or multi-cloud architectures',
            'LLM adoption: GPT-4-class models reduce software development time by 55% in controlled studies',
            'Cybersecurity spending: $215B globally in 2024 — ransomware losses average $4.45M per incident',
            'Edge computing: latency requirements for real-time AI driving $61B market by 2028',
            'Open-source AI: Llama 3, Mistral, Gemma have democratised model access — 70% of AI workloads by 2026',
          ],
          speakerNotes: 'Frame this as a convergence, not a single trend. Companies winning in tech are mastering the interconnections between AI, cloud, and edge — not just individual components.',
        },
        {
          title: 'AI & Machine Learning: Practical Realities',
          content: 'Beyond the hype, AI\'s real-world impact is concentrated in narrow, high-value workflows: code generation, document processing, anomaly detection, and demand forecasting. GitHub Copilot users write code 55% faster. But 87% of AI projects stall at pilot stage due to data quality problems, not model quality.',
          keyStat: '87% of AI projects fail to reach production — data quality is the #1 blocker (Gartner)',
          bullets: [
            'Code generation (Copilot/Cursor): 55% faster coding, 46% reduction in code churn (GitHub, 2024)',
            'Document intelligence: GPT-4 processes contracts 75× faster than legal associates at 93% accuracy',
            'Demand forecasting: ML models outperform statistical methods by 20–50% for volatile SKUs',
            'Computer vision: defect detection above 99.2% in semiconductor manufacturing vs 96% human accuracy',
            'MLOps maturity: only 13% of organisations have production-grade ML pipelines (McKinsey)',
          ],
          speakerNotes: 'Ask the audience: "How many of you have seen AI projects die in the proof-of-concept phase?" Then explain it\'s a data-plumbing problem, not an algorithm problem.',
        },
        {
          title: 'Cloud Architecture & Infrastructure',
          content: 'Modern cloud architecture has evolved from lift-and-shift migrations to cloud-native patterns: microservices, event-driven architectures, and serverless functions. FinOps has emerged to combat "cloud sprawl" — the average enterprise wastes 32% of its cloud spend on idle or oversized resources.',
          keyStat: '32% of enterprise cloud spend is wasted on idle/oversized resources (Flexera, 2024)',
          bullets: [
            'Serverless (Lambda/Cloud Functions): eliminates 80% of infrastructure management overhead',
            'Multi-cloud strategy: 87% of enterprises use 2+ cloud providers to avoid vendor lock-in',
            'Infrastructure-as-Code (Terraform/Pulumi): reduces configuration drift incidents by 74%',
            'Cloud-native security (zero-trust): reduces lateral movement in breaches by 60%',
            'FinOps adoption: companies with mature FinOps save $900K/year per $10M cloud spend',
          ],
          speakerNotes: 'Waste reduction is the fastest ROI conversation for executives. A 32% savings number is compelling. Pivot to FinOps as "free money" before discussing architectural investments.',
        },
        {
          title: 'Cybersecurity: The Threat Landscape',
          content: 'Ransomware-as-a-Service has industrialised cybercrime. In 2023, 66% of organisations were hit by ransomware — up from 51% in 2022 — with average ransom payments reaching $1.54M. AI-powered phishing generates convincing, personalised spear-phishing emails at scale, achieving 37% higher click rates than template-based attacks.',
          keyStat: '66% of organisations experienced ransomware attacks in 2023 — up 15pp YoY (Sophos)',
          bullets: [
            'Mean time to detect a breach: 207 days — SIEM+AI reduces this to 15–30 days',
            'AI-generated phishing: 37% higher click rate vs template-based attacks (IBM X-Force, 2024)',
            'Supply-chain attacks: 45% increase in 2023 — SolarWinds-type attacks now a standard tactic',
            'Zero-trust adoption: organisations with ZTA experience 50% fewer data breach impacts',
            'Cyber insurance premiums: up 28% in 2023 — underwriters now require MFA as a baseline',
          ],
          speakerNotes: 'The 207-day detection stat is crucial — reframe security investment as "dwell-time reduction" not "perimeter hardening." The perimeter is already breached in most enterprises.',
        },
        {
          title: 'Emerging Technologies: 2025–2030 Horizon',
          content: 'Quantum computing is approaching "quantum advantage" for optimisation and cryptography. IBM\'s 1,121-qubit Condor chip and Google\'s Willow processor signal that post-quantum cryptography (PQC) migration must begin now — NIST finalised three PQC standards in 2024 with a 2030 migration deadline for federal systems.',
          keyStat: 'Quantum computing market: $65B by 2030 — PQC migration costs $3.5B for US federal systems alone',
          bullets: [
            'Post-quantum cryptography: NIST standards finalised August 2024 — migration is mandatory by 2030',
            '5G coverage: now reaching 40% of global population; 6G targeting 1 Tbps by 2030',
            'Augmented Reality: Apple Vision Pro opened enterprise use cases in surgery, training, and maintenance',
            'IoT: 75B connected devices by 2025 — each an attack surface requiring identity management',
            'Sustainable tech: data centres consume 2% of global electricity; Green-AI reducing training costs 10×',
          ],
          speakerNotes: 'Close with urgency on PQC: "harvest now, decrypt later" attacks mean adversaries are stealing encrypted data today to decrypt once quantum computers mature. This is one concrete action audiences can take immediately.',
        },
      ];
    } else if (isBusiness) {
      return [
        {
          title: 'Business Environment: Macro Forces Shaping Strategy',
          content: 'Three macro forces are simultaneously reshaping competitive dynamics: AI-driven productivity compression narrowing the cost gap between large and small firms, geopolitical fragmentation creating "friend-shoring" pressure on supply chains, and the demographic shift as Gen Z becomes the largest workforce cohort.',
          keyStat: 'AI tools compress SME vs enterprise productivity gap by estimated 40% by 2027 (McKinsey Global Institute)',
          bullets: [
            'Global GDP growth: 3.1% forecast for 2025, masking 7–8% growth in AI-adjacent sectors',
            'Supply chain reorientation: 83% of CEOs restructuring sourcing due to geopolitical risk (PwC, 2024)',
            'Gen Z workforce: 27% of global workers by 2025 — demanding purpose-aligned employers',
            'Inflation persistence: "last mile" inflation in services requires pricing power, not just cost-cutting',
            'ESG regulation: EU CSRD requires 50,000+ companies to report scope 3 emissions by 2026',
          ],
          speakerNotes: 'Frame this as a "VUCA 2.0" environment where volatility is structural, not cyclical. Companies waiting for stability before making strategic bets will cede ground to those acting under uncertainty.',
        },
        {
          title: 'Customer Strategy: From Segments to Individuals',
          content: '73% of consumers expect companies to understand their individual needs, while 66% will switch brands after a single bad experience. AI-powered personalisation is closing the gap — Netflix estimates its recommendation engine saves $1B annually in churn reduction, while Amazon attributes 35% of revenue to its recommendation algorithms.',
          keyStat: '35% of Amazon revenue driven by ML-powered recommendation engine (McKinsey)',
          bullets: [
            'Net Promoter Score leaders outperform laggards by 2.5× in revenue growth (Bain, 2023)',
            'Customer lifetime value modelling: ML improves CLV prediction accuracy by 30–40%',
            'Personalisation ROI: 1-to-1 personalisation delivers 5–8× marketing spend ROI (McKinsey)',
            'First-party data imperative: cookie deprecation requires CRM-driven audience activation by 2025',
            'AI chatbots: handle 80% of routine inquiries, reducing CX cost by 30% while freeing agents for complexity',
          ],
          speakerNotes: 'Position personalisation not as a "nice to have" but as a structural revenue driver. Ask: "What percentage of your company\'s revenue is attributable to personalised recommendations?"',
        },
        {
          title: 'Operational Excellence in the AI Era',
          content: 'AI is creating a new operations paradigm: "intelligent automation" goes beyond RPA to systems that reason, adapt, and self-optimise. JPMorgan\'s COIN system reviews 12,000 commercial credit agreements per year in seconds — work that previously took lawyers 360,000 hours annually.',
          keyStat: 'JPMorgan COIN: replaces 360,000 hours of annual legal review with seconds of AI processing',
          bullets: [
            'Process mining (Celonis): identifies hidden inefficiencies — average client finds $10M in recoverable waste',
            'Generative AI in supply chain: 15–20% reduction in inventory holding costs via demand-signal processing',
            'Predictive maintenance: 25–30% reduction in unplanned downtime across industrial sectors',
            'Robotic Process Automation market: $30.9B by 2030 — but AI agents are superseding pure RPA',
            'Digital twins: $110B market by 2028 — enabling simulation before physical deployment',
          ],
          speakerNotes: 'The COIN stat is memorable and well-documented. Bridge to the broader point: every professional service — legal, accounting, consulting — faces similar disruption to routine cognitive work.',
        },
        {
          title: 'Financial Performance: Metrics That Matter',
          content: 'Companies investing in digital capabilities grow revenue 5× faster than industry peers and generate 50% higher operating margins over a 5-year horizon (BCG, 2023). Yet only 22% of digital transformations meet their financial targets — execution risk remains the critical variable.',
          keyStat: 'Digital leaders grow revenue 5× faster and achieve 50% higher margins vs industry peers (BCG)',
          bullets: [
            'Rule of 40 (SaaS): revenue growth % + FCF margin must exceed 40 to signal business health',
            'Working capital optimisation: dynamic discounting and supply chain finance free 2–4% of revenue',
            'Pricing power measurement: track price realisation separately from volume to isolate inflationary gains',
            'Customer acquisition cost vs LTV: healthy SaaS businesses target LTV:CAC ratio > 3:1',
            'CapEx-to-OpEx shift: cloud and SaaS converting fixed infrastructure to variable spend, improving flexibility',
          ],
          speakerNotes: 'Connect strategy to the CFO\'s language — margin expansion, working capital, and free cash flow. Digital transformation only survives budget cycles if expressed in financial, not capability terms.',
        },
        {
          title: 'Strategic Priorities for 2025–2027',
          content: 'Three strategic bets separate companies positioned for the next cycle: building proprietary AI capabilities on top of foundation models, constructing data assets that AI cannot replicate from public sources, and developing AI-native talent pipelines where every function has practitioners who can evaluate and deploy models.',
          keyStat: 'Companies building proprietary AI on foundation models achieve 3.5× higher returns than SaaS-only adopters (a16z, 2024)',
          bullets: [
            'Priority 1: Data moat — identify proprietary data that AI cannot access elsewhere',
            'Priority 2: AI governance — model risk frameworks, audit trails, and explainability requirements',
            'Priority 3: Talent flywheel — upskill 20% of workforce in AI/ML literacy within 18 months',
            'Priority 4: Ecosystem positioning — identify partnership vs build vs buy decisions for each capability',
            'Priority 5: Scenario planning — build strategy resilience for both AI acceleration and AI regulation futures',
          ],
          speakerNotes: 'Close with the "proprietary data" insight — the most defensible competitive moat in an AI-saturated market. Challenge the audience to map their unique data assets before the next planning cycle.',
        },
      ];
    } else {
      return this.getGenericFallback(topic);
    }
  }

  private parseJSONResponse(response: string): any {
    let cleaned = response.trim();

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    // Find first '[' (start of array)
    const arrayStart = cleaned.indexOf('[');
    if (arrayStart > 0) {
      cleaned = cleaned.substring(arrayStart);
    }

    // Find the matching closing ']'
    let depth = 0;
    let endIndex = -1;
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '[') depth++;
      else if (cleaned[i] === ']') {
        depth--;
        if (depth === 0) { endIndex = i; break; }
      }
    }

    if (endIndex > 0) {
      cleaned = cleaned.substring(0, endIndex + 1);
    }

    // Remove trailing commas before } and ]
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1').trim();

    return JSON.parse(cleaned);
  }

  private getGenericFallback(topic: string): any[] {
    return [
      {
        title: `${topic}: Overview & Context`,
        content: `${topic} has become a critical area of focus as organisations navigate accelerating change. Understanding both the structural drivers and operational realities is essential for informed decision-making and competitive positioning.`,
        keyStat: 'Market leaders in adjacent domains outperform peers by 2–3× on key performance metrics',
        bullets: [
          'Core scope: what specifically falls within and outside the domain of this topic',
          'Historical evolution: how the field has changed in the past 5–10 years and why',
          'Current scale: size of the market, adoption rates, or practitioner community',
          'Key stakeholders: decision-makers, implementers, and affected parties',
          'Primary KPIs: the metrics used to measure performance and track progress',
        ],
        speakerNotes: `Open with a grounding definition — audiences often hold different mental models. Establish shared vocabulary before diving into analysis. Invite the audience to share their prior experience with ${topic}.`,
      },
      {
        title: 'Key Challenges & Root Causes',
        content: 'The most persistent challenges in this domain share common root causes: misaligned incentives between stakeholders, insufficient data infrastructure for evidence-based decisions, and change-management friction that slows adoption of proven solutions.',
        keyStat: 'Up to 70% of strategic initiatives fail — most due to implementation gaps, not strategy (Harvard Business Review)',
        bullets: [
          'Challenge 1: Primary bottleneck — where does value get destroyed or delayed in the current system?',
          'Challenge 2: Data gaps — what information is unavailable, unreliable, or systematically underused?',
          'Challenge 3: Capability mismatches — where do skill gaps create execution risk?',
          'Challenge 4: Resource constraints — budget, time, or talent limiting progress toward goals',
          'Challenge 5: Stakeholder misalignment — conflicting incentives between key groups',
        ],
        speakerNotes: 'Invite the audience to map their own experience onto these challenges. Shared recognition of problems builds trust before presenting solutions. Use a show-of-hands or polling for engagement.',
      },
      {
        title: 'Evidence-Based Solutions',
        content: 'Organisations that implement comprehensive, sequenced interventions achieve 3–5× the ROI of those making isolated tactical changes. The evidence consistently points to three foundational requirements: measurement infrastructure, process standardisation, and capability building.',
        keyStat: 'Sequenced, evidence-based implementations deliver 3–5× higher ROI than one-off tactical fixes',
        bullets: [
          'Solution A: Address the primary constraint first — highest leverage point in the system',
          'Solution B: Data foundation — invest in measurement infrastructure before attempting optimisation',
          'Solution C: Process standardisation — reduce variation before applying automation or AI',
          'Solution D: Capability building — training and tools that outlast individual projects',
          'Solution E: Feedback loops — close the gap between action and insight to enable continuous learning',
        ],
        speakerNotes: 'Frame solutions as interconnected, not independent options. The sequence matters — measuring baseline performance before making changes gives you proof of impact.',
      },
      {
        title: 'Implementation Roadmap',
        content: 'Successful implementations follow a consistent pattern: a 30-day diagnostic to quantify baseline performance, a 90-day pilot on the highest-value use case, and a phased expansion based on measured results. Skipping the diagnostic phase is the single biggest predictor of project failure.',
        keyStat: 'Organisations with formal pilot phases achieve 4× higher implementation success rates (Gartner)',
        bullets: [
          'Days 1–30: Diagnostic — measure current state, identify top 3 highest-leverage opportunities',
          'Days 30–90: Pilot — implement highest-value change, track KPIs weekly with defined success criteria',
          'Days 90–180: Review & expand — document lessons learned, refine approach, scale to next use case',
          'Days 180–365: Standardise — codify processes, train teams, hand over to operations',
          'Ongoing: Governance — regular review cycle to capture model drift and evolving business requirements',
        ],
        speakerNotes: 'The "30-day diagnostic" is the single action you want the audience to take. If they leave committing to measure their current state, the rest of the roadmap becomes self-evident.',
      },
      {
        title: 'Future Outlook & Your Next Step',
        content: 'The next 3–5 years will see accelerating change driven by AI automation, regulatory evolution, and shifting stakeholder expectations. Organisations that build adaptive capabilities now — rather than optimising for current conditions — will capture disproportionate value as the landscape shifts.',
        keyStat: 'Early movers in technology-enabled transformation capture 60–70% of available value (BCG)',
        bullets: [
          'Trend 1: AI and automation will compress execution timelines — act faster or fall further behind',
          'Trend 2: Regulatory tightening will raise the bar on data governance and transparency requirements',
          'Trend 3: Talent scarcity requires building internal capability, not just buying external expertise',
          'Trend 4: Ecosystem competition — individual organisations win or lose based on their networks',
          'Your next step: identify ONE metric to baseline, ONE process to improve, ONE partner to engage',
        ],
        speakerNotes: 'Close with the "three ones" call to action — it is specific, achievable, and creates accountability. Ask each person in the room to commit to their three ones before leaving.',
      },
    ];
  }
}
