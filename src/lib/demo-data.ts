import { Deck, Theme } from './schema';

export const DEMO_DECK: Deck = {
  id: 'demo-deck-alcohol-trends',
  meta: {
    title: 'Alcohol Use Trends in Australia',
    subtitle: 'A Policy Perspective on Age-Group Patterns',
    author: 'AI Slide Maker',
    date: '2024-01-15',
    audience: 'Policy stakeholders',
    tone: 'Analytical, non-sensational',
    theme: 'DeepSpace' as Theme,
  },
  slides: [
    {
      id: 'slide-title',
      layout: 'title',
      blocks: [
        {
          type: 'Heading',
          text: 'Alcohol Use Trends in Australia',
        },
        {
          type: 'Subheading',
          text: 'A Policy Perspective on Age-Group Patterns',
        },
      ],
      notes: 'Welcome to the presentation. Introduce yourself and the topic. Set the context for why alcohol use trends matter for policy makers.',
    },
    {
      id: 'slide-agenda',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Agenda',
        },
        {
          type: 'Bullets',
          items: [
            'Introduction (2 slides)',
            'Current Trends by Age Group (4 slides)',
            'Policy Implications (3 slides)',
            'Conclusion (2 slides)',
          ],
        },
      ],
      notes: 'Walk through the agenda and set expectations for the presentation. Emphasize the data-driven approach.',
    },
    {
      id: 'slide-intro-1',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Why This Matters',
        },
        {
          type: 'Bullets',
          items: [
            'Alcohol use affects 80% of Australians annually',
            'Healthcare costs exceed $15 billion per year',
            'Policy decisions impact millions of lives',
            'Age-group patterns reveal intervention opportunities',
          ],
        },
      ],
      notes: 'Establish the significance of the topic. Use concrete numbers to grab attention and show the scale of the issue.',
    },
    {
      id: 'slide-intro-2',
      layout: 'media-left',
      blocks: [
        {
          type: 'Heading',
          text: 'Data Sources & Methodology',
        },
        {
          type: 'Image',
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
          alt: 'Data analysis visualization',
        },
        {
          type: 'Bullets',
          items: [
            'Australian Bureau of Statistics data',
            'National Health Survey 2021-22',
            'Longitudinal analysis 2015-2022',
            'Age groups: 18-24, 25-34, 35-44, 45-54, 55-64, 65+',
          ],
        },
      ],
      notes: 'Explain the credibility of the data sources and the methodology used. This builds trust in the findings.',
    },
    {
      id: 'slide-trends-1',
      layout: 'chart',
      blocks: [
        {
          type: 'Heading',
          text: 'Overall Consumption Trends',
        },
        {
          type: 'Chart',
          data: [
            { age: '18-24', consumption: 65 },
            { age: '25-34', consumption: 78 },
            { age: '35-44', consumption: 82 },
            { age: '45-54', consumption: 75 },
            { age: '55-64', consumption: 68 },
            { age: '65+', consumption: 45 },
          ],
          x: 'age',
          y: 'consumption',
          kind: 'bar',
        },
      ],
      notes: 'Point out the peak consumption in the 35-44 age group and the decline in older age groups. This sets up the discussion of age-specific patterns.',
    },
    {
      id: 'slide-trends-2',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Youth Trends (18-24)',
        },
        {
          type: 'Bullets',
          items: [
            'Binge drinking decreased 15% since 2015',
            'Wine consumption increased 25%',
            'Spirits remain most popular choice',
            'Social media influence on drinking patterns',
          ],
        },
      ],
      notes: 'Highlight the positive trend in binge drinking reduction while noting the shift in beverage preferences. Discuss the role of social media.',
    },
    {
      id: 'slide-trends-3',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Middle-Age Patterns (35-44)',
        },
        {
          type: 'Bullets',
          items: [
            'Highest consumption rates across all age groups',
            'Wine and beer equally popular',
            'Work-related drinking culture',
            'Stress and lifestyle factors',
          ],
        },
      ],
      notes: 'Explain why this age group shows the highest consumption. Discuss work culture, stress, and lifestyle factors that contribute to this pattern.',
    },
    {
      id: 'slide-trends-4',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Elderly Consumption (65+)',
        },
        {
          type: 'Bullets',
          items: [
            'Lowest consumption rates',
            'Health concerns drive reduction',
            'Medication interactions',
            'Social isolation impact',
          ],
        },
      ],
      notes: 'Discuss the factors that lead to lower consumption in older age groups, including health concerns and medication interactions.',
    },
    {
      id: 'slide-policy-1',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Targeted Interventions Needed',
        },
        {
          type: 'Bullets',
          items: [
            'Age-specific messaging strategies',
            'Workplace alcohol policies',
            'Healthcare provider training',
            'Community-based programs',
          ],
        },
      ],
      notes: 'Transition to policy implications. Emphasize the need for age-specific approaches rather than one-size-fits-all solutions.',
    },
    {
      id: 'slide-policy-2',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Resource Allocation Priorities',
        },
        {
          type: 'Bullets',
          items: [
            'Focus on 35-44 age group (highest consumption)',
            'Prevention programs for youth',
            'Support services for elderly',
            'Cross-age group initiatives',
          ],
        },
      ],
      notes: 'Discuss how the data should inform resource allocation decisions. Balance between high-risk groups and prevention strategies.',
    },
    {
      id: 'slide-policy-3',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Monitoring & Evaluation',
        },
        {
          type: 'Bullets',
          items: [
            'Regular data collection cycles',
            'Age-group specific metrics',
            'Policy effectiveness tracking',
            'Stakeholder feedback integration',
          ],
        },
      ],
      notes: 'Emphasize the importance of ongoing monitoring to ensure policies are effective and can be adjusted as needed.',
    },
    {
      id: 'slide-conclusion',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'Key Takeaways',
        },
        {
          type: 'Bullets',
          items: [
            'Age-group patterns reveal distinct consumption trends',
            'Middle-age groups require targeted interventions',
            'Youth trends show positive developments',
            'Elderly need specialized support approaches',
          ],
        },
      ],
      notes: 'Summarize the key findings and their implications for policy. Reinforce the data-driven approach to decision making.',
    },
    {
      id: 'slide-references',
      layout: 'title+bullets',
      blocks: [
        {
          type: 'Heading',
          text: 'References',
        },
        {
          type: 'Bullets',
          items: [
            'Australian Bureau of Statistics, National Health Survey 2021-22',
            'Alcohol and Drug Foundation, Annual Report 2023',
            'Department of Health, Alcohol Policy Framework 2022',
            'University of Sydney, Longitudinal Study on Alcohol Use 2023',
          ],
        },
      ],
      notes: 'Acknowledge the data sources and research that informed this presentation. This adds credibility and allows for follow-up research.',
    },
    {
      id: 'slide-thankyou',
      layout: 'title',
      blocks: [
        {
          type: 'Heading',
          text: 'Thank You',
        },
        {
          type: 'Subheading',
          text: 'Questions & Discussion',
        },
      ],
      notes: 'Thank the audience and invite questions. Be prepared to discuss specific data points and policy implications in detail.',
    },
  ],
};

export const DEMO_TOPICS = [
  {
    topic: 'The Future of Artificial Intelligence',
    detail: 'Focus on machine learning trends and societal impact',
    tone: 'Professional',
    audience: 'Tech executives',
    length: 12,
    theme: 'DeepSpace' as Theme,
  },
  {
    topic: 'Climate Change Solutions',
    detail: 'Renewable energy and carbon reduction strategies',
    tone: 'Academic',
    audience: 'Environmental scientists',
    length: 15,
    theme: 'Minimal' as Theme,
  },
  {
    topic: 'Remote Work Best Practices',
    detail: 'Productivity tips and team collaboration tools',
    tone: 'Casual',
    audience: 'Remote workers',
    length: 8,
    theme: 'Corporate' as Theme,
  },
  {
    topic: 'Space Exploration Milestones',
    detail: 'Recent achievements and future missions',
    tone: 'Creative',
    audience: 'Space enthusiasts',
    length: 10,
    theme: 'Ultraviolet' as Theme,
  },
  {
    topic: 'Cybersecurity Threats',
    detail: 'Current threats and prevention strategies',
    tone: 'Technical',
    audience: 'IT professionals',
    length: 14,
    theme: 'NeonGrid' as Theme,
  },
];

export const DEMO_LIVE_WIDGETS = [
  {
    kind: 'LiveChart' as const,
    apiUrl: '/api/live-proxy?demo=alcohol_trend',
    xKey: 'time',
    yKey: 'value',
    refreshMs: 5000,
  },
  {
    kind: 'Ticker' as const,
    symbols: ['BTC', 'ETH', 'ADA'],
    refreshMs: 10000,
  },
  {
    kind: 'Countdown' as const,
    targetIso: '2024-12-31T23:59:59Z',
  },
  {
    kind: 'Map' as const,
    lat: -33.8688,
    lng: 151.2093,
    zoom: 10,
  },
  {
    kind: 'Iframe' as const,
    src: 'https://example.com/dashboard',
    height: 300,
  },
];








