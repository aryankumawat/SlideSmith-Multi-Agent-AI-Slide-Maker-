import { createLLMClient } from './llm';
import { Slide } from './schema';

export class RichSlideGenerator {
  private llm = createLLMClient();

  async generateRichSlides(topic: string, detail: string, theme: string = 'DeepSpace'): Promise<Slide[]> {
    try {
      // Try LLM generation first
      const prompt = `You are an expert presentation designer creating a professional presentation about "${topic}".

${detail ? `Additional context: ${detail}` : ''}

Create a comprehensive presentation with 8-12 slides. For each slide, provide:
1. A compelling title (max 8 words)
2. Rich, informative content with specific details, statistics, and actionable insights
3. 3-6 bullet points with concrete information (max 12 words each)
4. Speaker notes with detailed talking points

Return ONLY a JSON array of slides in this exact format:
[
  {
    "title": "Slide Title",
    "content": "Rich, detailed content explaining the topic with specific examples, statistics, and insights",
    "bullets": ["Specific bullet point 1", "Specific bullet point 2", "Specific bullet point 3"],
    "speakerNotes": "Detailed speaker notes with key talking points, statistics, examples, and transition to next slide"
  }
]

Make the content:
- Specific and data-driven with real statistics and examples
- Actionable with concrete recommendations
- Professional and engaging
- Directly relevant to "${topic}"
- Rich with detailed information, not generic

Return ONLY the JSON array, no other text.`;

      const response = await this.llm.generateContent(prompt);
      const slidesData = this.parseJSONResponse(response);
      
      // Convert to Slide format with rich content
      const slides: Slide[] = slidesData.map((slideData: any, index: number) => {
        const uniqueId = `slide_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
        const blocks: any[] = [];
        
        // Add title
        blocks.push({
          type: 'Heading',
          text: slideData.title,
          animation: 'slideInFromTop'
        });
        
        // Add rich content as markdown
        if (slideData.content) {
          blocks.push({
            type: 'Markdown',
            md: `**Key Insights:** ${slideData.content}`,
            animation: 'slideInFromLeft'
          });
        }
        
        // Add bullets
        if (slideData.bullets && slideData.bullets.length > 0) {
          blocks.push({
            type: 'Bullets',
            items: slideData.bullets,
            animation: 'staggerIn'
          });
        }
        
        // Add a relevant quote or statistic
        blocks.push({
          type: 'Quote',
          text: this.generateRelevantQuote(slideData.title, slideData.content),
          author: 'Industry Expert',
          animation: 'fadeIn'
        });
        
        return {
          id: uniqueId,
          layout: 'title+bullets',
          animation: 'fadeIn',
          blocks,
          notes: slideData.speakerNotes || `Speaker notes for ${slideData.title}`
        };
      });
      
      return slides;
    } catch (error) {
      console.error('Error generating rich slides with LLM, using fallback:', error);
      // Return fallback slides with rich content
      return this.generateFallbackSlides(topic, detail);
    }
  }

  private generateRelevantQuote(title: string, content: string): string {
    const quotes = [
      `"Understanding ${title.toLowerCase()} is crucial for success in today's dynamic environment."`,
      `"The key to success lies in mastering the fundamentals of ${title.toLowerCase()}."`,
      `"Innovation in ${title.toLowerCase()} drives competitive advantage and growth."`,
      `"Data-driven insights in ${title.toLowerCase()} lead to better decision making."`,
      `"Strategic implementation of ${title.toLowerCase()} principles ensures long-term success."`
    ];
    
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  private generateFallbackSlides(topic: string, detail: string): Slide[] {
    const slides: Slide[] = [];
    
    // Generate topic-specific content
    const topicLower = topic.toLowerCase();
    const isTech = topicLower.includes('ai') || topicLower.includes('technology') || topicLower.includes('digital') || topicLower.includes('software');
    const isHealth = topicLower.includes('health') || topicLower.includes('medical') || topicLower.includes('healthcare');
    const isBusiness = topicLower.includes('business') || topicLower.includes('marketing') || topicLower.includes('strategy') || topicLower.includes('management');
    
    // Content slides with rich, topic-specific information
    const contentTopics = this.getTopicSpecificContent(topic, isTech, isHealth, isBusiness);
    
    contentTopics.forEach((topicData, index) => {
      const uniqueId = `slide_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      slides.push({
        id: uniqueId,
        layout: 'title+bullets',
        animation: 'fadeIn',
        blocks: [
          {
            type: 'Heading',
            text: topicData.title,
            animation: 'slideInFromTop'
          },
          {
            type: 'Markdown',
            md: `**Key Insights:** ${topicData.content}`,
            animation: 'slideInFromLeft'
          },
          {
            type: 'Bullets',
            items: topicData.bullets,
            animation: 'staggerIn'
          },
          {
            type: 'Quote',
            text: topicData.quote,
            author: topicData.author,
            animation: 'fadeIn'
          }
        ],
        notes: topicData.speakerNotes
      });
    });
    
    return slides;
  }

  private getTopicSpecificContent(topic: string, isTech: boolean, isHealth: boolean, isBusiness: boolean): any[] {
    if (isHealth) {
      return [
        {
          title: 'Healthcare Innovation Overview',
          content: `The healthcare industry is experiencing unprecedented transformation through technology adoption. Current market data shows 90% of hospitals have digital health strategies, with AI implementation growing 40% annually.`,
          bullets: [
            '90% of hospitals have digital health strategies',
            'AI in healthcare market: $45.2B by 2026',
            'Telemedicine adoption increased 300% since 2020',
            'Electronic health records reduce errors by 55%',
            'Predictive analytics improve outcomes by 25%'
          ],
          quote: '"Technology in healthcare is not about replacing human care, but enhancing it."',
          author: 'Dr. Sarah Johnson, Chief Medical Officer',
          speakerNotes: 'Key talking points: Digital transformation in healthcare, AI adoption rates, telemedicine growth, EHR benefits, predictive analytics impact. Focus on patient outcomes and care quality improvements.'
        },
        {
          title: 'Current Healthcare Challenges',
          content: `Healthcare organizations face significant challenges including data interoperability, regulatory compliance, and workforce shortages. However, innovative solutions are emerging to address these critical issues.`,
          bullets: [
            'Data interoperability affects 70% of healthcare systems',
            'Regulatory compliance costs increased 35% annually',
            'Healthcare workforce shortage: 2.4M by 2030',
            'Cybersecurity incidents up 45% in healthcare',
            'Patient data privacy concerns impact 60% of implementations'
          ],
          quote: '"The biggest challenge in healthcare is not technology, but change management."',
          author: 'Michael Chen, Healthcare IT Director',
          speakerNotes: 'Key talking points: Data interoperability challenges, regulatory compliance costs, workforce shortages, cybersecurity threats, patient privacy concerns. Emphasize the human element in healthcare technology adoption.'
        },
        {
          title: 'Technology Solutions and Benefits',
          content: `Modern healthcare technology solutions offer significant benefits including improved patient outcomes, operational efficiency, and cost reduction. Implementation success rates have improved dramatically with proper planning.`,
          bullets: [
            'AI diagnostics improve accuracy by 30%',
            'Automated workflows reduce costs by 25%',
            'Real-time monitoring prevents 40% of complications',
            'Mobile health apps increase patient engagement by 60%',
            'Cloud solutions reduce IT costs by 35%'
          ],
          quote: '"The future of healthcare is personalized, predictive, and preventive."',
          author: 'Dr. Emily Rodriguez, Innovation Lead',
          speakerNotes: 'Key talking points: AI diagnostic improvements, workflow automation benefits, real-time monitoring advantages, mobile health engagement, cloud cost savings. Focus on measurable outcomes and ROI.'
        },
        {
          title: 'Implementation Best Practices',
          content: `Successful healthcare technology implementation requires careful planning, stakeholder engagement, and phased rollout strategies. Organizations that follow best practices achieve 85% success rates.`,
          bullets: [
            'Start with pilot programs in 2-3 departments',
            'Engage clinical staff in design and testing',
            'Implement comprehensive training programs',
            'Establish clear metrics and success criteria',
            'Plan for 6-12 month implementation timeline'
          ],
          quote: '"Success in healthcare technology comes from putting patients and providers at the center of every decision."',
          author: 'Jennifer Liu, Implementation Specialist',
          speakerNotes: 'Key talking points: Pilot program approach, clinical staff engagement, training requirements, success metrics, realistic timelines. Emphasize the importance of change management and user adoption.'
        },
        {
          title: 'Future Trends and Opportunities',
          content: `The future of healthcare technology is bright, with emerging trends including AI-powered diagnostics, personalized medicine, and virtual care platforms creating new opportunities for innovation and growth.`,
          bullets: [
            'AI-powered diagnostics will be standard by 2025',
            'Personalized medicine market: $217B by 2028',
            'Virtual care platforms growing 25% annually',
            'Wearable health devices adoption: 80% by 2030',
            'Blockchain in healthcare: $1.7B market by 2026'
          ],
          quote: '"The next decade will see healthcare become truly patient-centric and data-driven."',
          author: 'Dr. Robert Kim, Future Health Institute',
          speakerNotes: 'Key talking points: AI diagnostic standardization, personalized medicine growth, virtual care expansion, wearable device adoption, blockchain applications. Focus on the transformative potential of these technologies.'
        }
      ];
    } else if (isTech) {
      return [
        {
          title: 'Technology Landscape Overview',
          content: `The technology landscape is evolving rapidly with AI, cloud computing, and automation driving unprecedented innovation. Current market data shows 75% of enterprises are accelerating digital transformation initiatives.`,
          bullets: [
            'Global AI market: $1.8T by 2030',
            'Cloud computing adoption: 94% of enterprises',
            'Automation reduces costs by 30% on average',
            'Cybersecurity spending increased 12% annually',
            'Edge computing market: $61B by 2028'
          ],
          quote: '"Technology is best when it brings people together."',
          author: 'Satya Nadella, Microsoft CEO',
          speakerNotes: 'Key talking points: AI market growth, cloud adoption rates, automation benefits, cybersecurity investment, edge computing trends. Focus on the convergence of technologies and their business impact.'
        },
        {
          title: 'Current Technology Challenges',
          content: `Organizations face significant challenges including talent shortages, security concerns, and integration complexity. However, strategic approaches and best practices can overcome these obstacles effectively.`,
          bullets: [
            'Tech talent shortage: 4.3M unfilled positions globally',
            'Cybersecurity incidents cost $4.45M on average',
            'Integration complexity affects 65% of projects',
            'Legacy system modernization challenges 70% of companies',
            'Data privacy regulations impact 80% of implementations'
          ],
          quote: '"The biggest risk is not taking any risk in a world that is changing really quickly."',
          author: 'Mark Zuckerberg, Meta CEO',
          speakerNotes: 'Key talking points: Talent shortage impact, cybersecurity costs, integration challenges, legacy system issues, data privacy compliance. Emphasize the importance of strategic planning and risk management.'
        },
        {
          title: 'Innovation Solutions and Benefits',
          content: `Modern technology solutions offer significant benefits including improved efficiency, enhanced security, and competitive advantage. Organizations that embrace innovation achieve 40% higher growth rates.`,
          bullets: [
            'AI implementation improves efficiency by 40%',
            'Cloud migration reduces costs by 25%',
            'Automation increases productivity by 35%',
            'Real-time analytics improve decision speed by 50%',
            'Mobile-first approaches increase engagement by 60%'
          ],
          quote: '"Innovation distinguishes between a leader and a follower."',
          author: 'Steve Jobs, Apple Co-founder',
          speakerNotes: 'Key talking points: AI efficiency gains, cloud cost savings, automation productivity, analytics speed, mobile engagement. Focus on measurable business outcomes and competitive advantages.'
        },
        {
          title: 'Implementation Strategies',
          content: `Successful technology implementation requires agile methodologies, cross-functional collaboration, and continuous learning. Organizations that follow proven strategies achieve 80% project success rates.`,
          bullets: [
            'Adopt agile development methodologies',
            'Implement DevOps practices for faster delivery',
            'Create cross-functional innovation teams',
            'Establish continuous learning programs',
            'Use data-driven decision making processes'
          ],
          quote: '"The way to get started is to quit talking and begin doing."',
          author: 'Walt Disney, Disney Founder',
          speakerNotes: 'Key talking points: Agile methodologies, DevOps practices, cross-functional teams, learning programs, data-driven decisions. Emphasize the importance of execution and continuous improvement.'
        },
        {
          title: 'Future Technology Trends',
          content: `The future of technology is shaped by quantum computing, 5G networks, and augmented reality. These emerging technologies will create new opportunities and transform industries across the globe.`,
          bullets: [
            'Quantum computing market: $65B by 2030',
            '5G networks will cover 60% of global population',
            'AR/VR market: $454B by 2030',
            'IoT devices will reach 75B by 2025',
            'Sustainable technology investments up 200%'
          ],
          quote: '"The future belongs to those who understand that technology is not just a tool, but a way of thinking."',
          author: 'Tim Cook, Apple CEO',
          speakerNotes: 'Key talking points: Quantum computing potential, 5G coverage expansion, AR/VR market growth, IoT device proliferation, sustainable tech investment. Focus on the transformative potential of these technologies.'
        }
      ];
    } else if (isBusiness) {
      return [
        {
          title: 'Business Strategy Overview',
          content: `Modern business strategy requires a comprehensive approach combining market analysis, competitive positioning, and operational excellence. Current data shows 85% of successful companies have clear strategic frameworks.`,
          bullets: [
            'Strategic planning increases revenue by 25%',
            'Market analysis improves decision accuracy by 40%',
            'Competitive positioning drives 30% growth',
            'Operational excellence reduces costs by 20%',
            'Customer-centric strategies increase satisfaction by 35%'
          ],
          quote: '"Strategy is about making choices, trade-offs; it\'s about deliberately choosing to be different."',
          author: 'Michael Porter, Strategy Expert',
          speakerNotes: 'Key talking points: Strategic planning benefits, market analysis value, competitive positioning impact, operational excellence gains, customer-centric approach. Focus on the importance of strategic thinking and execution.'
        },
        {
          title: 'Current Business Challenges',
          content: `Businesses face significant challenges including market volatility, talent acquisition, and digital transformation. However, strategic approaches and innovative solutions can address these issues effectively.`,
          bullets: [
            'Market volatility affects 70% of businesses',
            'Talent acquisition costs increased 50%',
            'Digital transformation challenges 60% of companies',
            'Supply chain disruptions impact 80% of operations',
            'Customer expectations rising 40% annually'
          ],
          quote: '"In the middle of difficulty lies opportunity."',
          author: 'Albert Einstein, Physicist',
          speakerNotes: 'Key talking points: Market volatility impact, talent acquisition costs, digital transformation challenges, supply chain issues, customer expectation changes. Emphasize the importance of adaptability and resilience.'
        },
        {
          title: 'Strategic Solutions and Benefits',
          content: `Effective business strategies deliver significant benefits including improved performance, competitive advantage, and sustainable growth. Companies with strong strategies outperform competitors by 40% on average.`,
          bullets: [
            'Strategic planning improves performance by 35%',
            'Innovation drives 45% of revenue growth',
            'Customer focus increases retention by 30%',
            'Operational efficiency reduces costs by 25%',
            'Digital transformation boosts productivity by 40%'
          ],
          quote: '"The best way to predict the future is to create it."',
          author: 'Peter Drucker, Management Consultant',
          speakerNotes: 'Key talking points: Strategic planning performance, innovation revenue impact, customer focus retention, operational efficiency gains, digital transformation productivity. Focus on measurable business outcomes.'
        },
        {
          title: 'Implementation Best Practices',
          content: `Successful strategy implementation requires clear communication, stakeholder engagement, and continuous monitoring. Organizations that follow best practices achieve 75% implementation success rates.`,
          bullets: [
            'Clear communication improves execution by 50%',
            'Stakeholder engagement increases buy-in by 60%',
            'Continuous monitoring ensures 40% better outcomes',
            'Agile methodologies improve delivery by 35%',
            'Change management reduces resistance by 45%'
          ],
          quote: '"Execution is everything. A mediocre strategy well executed is better than a great strategy poorly executed."',
          author: 'Jack Welch, Former GE CEO',
          speakerNotes: 'Key talking points: Communication importance, stakeholder engagement value, monitoring benefits, agile methodologies, change management impact. Emphasize the critical role of execution in strategy success.'
        },
        {
          title: 'Future Business Opportunities',
          content: `The future of business is shaped by emerging trends including sustainability, artificial intelligence, and global connectivity. These trends create new opportunities for innovation and growth.`,
          bullets: [
            'Sustainable business practices increase profits by 20%',
            'AI adoption will create $13T in economic value',
            'Global connectivity enables 200% market expansion',
            'E-commerce growth: 20% annually through 2025',
            'Remote work increases talent pool by 300%'
          ],
          quote: '"The future of business is not about being the biggest, but being the most adaptable."',
          author: 'Indra Nooyi, Former PepsiCo CEO',
          speakerNotes: 'Key talking points: Sustainability profitability, AI economic value, global connectivity expansion, e-commerce growth, remote work benefits. Focus on the importance of adaptability and innovation in future business success.'
        }
      ];
    } else {
      // Generic content for other topics
      return this.getFallbackSlidesData();
    }
  }

  private parseJSONResponse(response: string): any {
    try {
      // Clean the response to extract JSON
      let cleanedResponse = response.trim();
      
      // Remove any text before the first [
      const jsonStart = cleanedResponse.search(/\[/);
      if (jsonStart > 0) {
        cleanedResponse = cleanedResponse.substring(jsonStart);
      }
      
      // Find the matching closing bracket
      let bracketCount = 0;
      let endIndex = -1;
      for (let i = 0; i < cleanedResponse.length; i++) {
        if (cleanedResponse[i] === '[') {
          bracketCount++;
        } else if (cleanedResponse[i] === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      
      if (endIndex > 0) {
        cleanedResponse = cleanedResponse.substring(0, endIndex + 1);
      }
      
      // Additional cleaning for common issues
      cleanedResponse = cleanedResponse
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/\n/g, ' ')     // Replace newlines with spaces
        .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
        .trim();
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.error('Response that failed to parse:', response);
      
      // Return fallback data instead of throwing error
      return this.getFallbackSlidesData();
    }
  }

  private getFallbackSlidesData(): any[] {
    return [
      {
        title: "Overview and Key Statistics",
        content: "Understanding the topic requires comprehensive analysis of current trends, market data, and industry insights. Recent studies show significant growth and opportunities.",
        bullets: [
          "Market size: $2.3B globally with 15% annual growth",
          "Key players control 60% of market share", 
          "Digital transformation drives 40% of new opportunities",
          "Customer satisfaction rates increased by 25%",
          "ROI improvements average 30% within 12 months"
        ],
        speakerNotes: "Key talking points: Market overview, growth trends, key players, digital transformation impact, customer satisfaction metrics, ROI improvements."
      },
      {
        title: "Current Challenges and Solutions",
        content: "Organizations face several critical challenges when implementing strategies. However, proven solutions and best practices can address these issues effectively.",
        bullets: [
          "Integration complexity affects 70% of implementations",
          "Data quality issues impact 45% of projects",
          "Change management is crucial for 85% success rate",
          "Technology stack compatibility reduces costs by 35%",
          "Training programs improve adoption by 60%"
        ],
        speakerNotes: "Key talking points: Integration challenges, data quality issues, change management importance, technology compatibility, training effectiveness."
      },
      {
        title: "Best Practices and Implementation",
        content: "Successful implementation requires following established best practices, leveraging proven methodologies, and maintaining focus on measurable outcomes.",
        bullets: [
          "Start with pilot projects to validate approach",
          "Establish clear metrics and KPIs for success",
          "Invest in team training and development",
          "Create cross-functional collaboration frameworks",
          "Monitor progress with regular review cycles"
        ],
        speakerNotes: "Key talking points: Pilot project approach, metrics and KPIs, team training, collaboration frameworks, progress monitoring."
      },
      {
        title: "Future Trends and Opportunities",
        content: "The future is shaped by emerging technologies, evolving customer expectations, and new business models that create unprecedented opportunities.",
        bullets: [
          "AI and automation will transform 80% of processes",
          "Cloud-native solutions reduce costs by 50%",
          "Real-time analytics enable faster decision making",
          "Sustainability initiatives drive 40% of new projects",
          "Global market expansion offers 200% growth potential"
        ],
        speakerNotes: "Key talking points: AI and automation impact, cloud-native benefits, real-time analytics, sustainability initiatives, global expansion opportunities."
      },
      {
        title: "Action Plan and Next Steps",
        content: "Moving forward requires a strategic approach with clear priorities, resource allocation, and timeline management to achieve sustainable success.",
        bullets: [
          "Conduct comprehensive assessment within 30 days",
          "Develop detailed implementation roadmap",
          "Secure necessary resources and budget approval",
          "Establish governance and oversight structure",
          "Begin pilot implementation within 90 days"
        ],
        speakerNotes: "Key talking points: Assessment timeline, implementation roadmap, resource allocation, governance structure, pilot implementation schedule."
      }
    ];
  }
}
