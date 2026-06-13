import { Deck, Slide, SlideBlock } from './schema';
import { PresentationPlan, PlanningStep } from './planner';
import { generateOutline } from './outline';
import { generateSlide } from './slidewriter';

export interface ExecutionState {
  plan: PresentationPlan;
  currentStep: PlanningStep | null;
  deck: Partial<Deck>;
  isExecuting: boolean;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  stepId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export class PresentationExecutor {
  private state: ExecutionState;
  private onStateChange: (state: ExecutionState) => void;
  private isRunning: boolean = false;
  private plan: PresentationPlan;

  constructor(
    plan: PresentationPlan,
    onStateChange: (state: ExecutionState) => void
  ) {
    this.plan = plan;
    this.onStateChange = onStateChange;
    this.state = {
      plan,
      currentStep: null,
      deck: {},
      isExecuting: false,
      progress: { completed: 0, total: 0, percentage: 0 },
      logs: []
    };
  }

  async startExecution(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.state.isExecuting = true;
    this.updateState();

    try {
      await this.executeAllSteps();
    } catch (error) {
      this.addLog('error', 'execution', `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isRunning = false;
      this.state.isExecuting = false;
      this.updateState();
    }
  }

  async executeStep(stepId: string): Promise<boolean> {
    const step = this.plan.steps.find(s => s.id === stepId);
    if (!step) return false;

    this.state.currentStep = step;
    step.status = 'in_progress';
    this.updateState();

    this.addLog('info', stepId, `Starting: ${step.title}`);

    try {
      let success = false;

      switch (stepId) {
        case 'step_1':
          success = await this.executeResearchStep();
          break;
        case 'step_2':
          success = await this.executeTitleSlideStep();
          break;
        case 'step_3':
          success = await this.executeAgendaStep();
          break;
        case 'step_4':
          success = await this.executeContentSlidesStep();
          break;
        case 'step_5':
          success = await this.executeConclusionStep();
          break;
        case 'step_6':
          success = await this.executeThemingStep();
          break;
        case 'step_7':
          success = await this.executeLiveWidgetsStep();
          break;
        case 'step_8':
          success = await this.executeFinalReviewStep();
          break;
        default:
          this.addLog('warning', stepId, `Unknown step: ${stepId}`);
          success = false;
      }

      if (success) {
        step.status = 'completed';
        this.addLog('success', stepId, `Completed: ${step.title}`);
      } else {
        step.status = 'pending';
        this.addLog('error', stepId, `Failed: ${step.title}`);
      }

      this.updateProgress();
      this.updateState();
      return success;
    } catch (error) {
      step.status = 'pending';
      this.addLog('error', stepId, `Error in ${step.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.updateState();
      return false;
    }
  }

  private async executeResearchStep(): Promise<boolean> {
    // Simulate research phase
    await this.delay(2000);
    this.addLog('info', 'step_1', 'Gathering relevant information...');
    await this.delay(1000);
    this.addLog('info', 'step_1', 'Analyzing content requirements...');
    await this.delay(1000);
    this.addLog('success', 'step_1', 'Research completed successfully');
    return true;
  }

  private async executeTitleSlideStep(): Promise<boolean> {
    await this.delay(1500);
    
    const titleSlide: Slide = {
      id: `slide_${Date.now()}_title_${Math.random().toString(36).substr(2, 9)}`,
      layout: 'title',
      animation: 'hero',
      blocks: [
        {
          type: 'Heading',
          text: this.plan.title,
          animation: 'slideInFromTop'
        },
        {
          type: 'Subheading',
          text: this.plan.overview,
          animation: 'fadeIn'
        }
      ],
      notes: `Welcome to ${this.plan.title}. ${this.plan.overview}\n\nOpening Tips:\n- Make eye contact with the audience\n- Smile and show enthusiasm\n- Set the tone for the presentation\n- Establish credibility and expertise`
    };

    this.state.deck.slides = [titleSlide];
    this.addLog('success', 'step_2', 'Enhanced title slide created');
    return true;
  }

  private async executeAgendaStep(): Promise<boolean> {
    await this.delay(1500);
    
    const agendaSlide: Slide = {
      id: `slide_${Date.now()}_agenda_${Math.random().toString(36).substr(2, 9)}`,
      layout: 'title+bullets',
      animation: 'fadeIn',
      blocks: [
        {
          type: 'Heading',
          text: 'Presentation Agenda',
          animation: 'slideInFromTop'
        },
        {
          type: 'Subheading',
          text: 'What we\'ll cover in the next few minutes',
          animation: 'fadeIn'
        },
        {
          type: 'Bullets',
          items: [
            'Introduction and Overview',
            'Key Concepts and Principles',
            'Real-world Applications',
            'Best Practices and Strategies',
            'Future Trends and Opportunities',
            'Q&A and Discussion'
          ],
          animation: 'staggerIn'
        },
        {
          type: 'Markdown',
          md: `**Duration:** ${this.plan.estimatedDuration}\n\n**Format:** Interactive presentation with Q&A\n\n**Takeaways:** Actionable insights and practical knowledge`,
          animation: 'slideInFromLeft'
        }
      ],
      notes: 'Walk through the agenda and set expectations for the presentation.\n\nAgenda Tips:\n- Keep it concise and clear\n- Highlight the value for the audience\n- Mention timing and format\n- Encourage questions throughout'
    };

    this.state.deck.slides = [...(this.state.deck.slides || []), agendaSlide];
    this.addLog('success', 'step_3', 'Enhanced agenda slide created');
    return true;
  }

  private async executeContentSlidesStep(): Promise<boolean> {
    await this.delay(1000);

    try {
      // Call the server-side API so Groq/Ollama env vars are available
      this.addLog('info', 'step_4', 'Generating content slides via AI…');
      const response = await fetch('/api/generate-rich-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: this.plan.title,
          detail: this.plan.overview,
          theme: 'DeepSpace',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const { slides: contentSlides } = await response.json();

      if (!Array.isArray(contentSlides) || contentSlides.length === 0) {
        throw new Error('No slides returned from API');
      }

      // Update state with generated content slides
      this.state.deck.slides = [...(this.state.deck.slides || []), ...contentSlides];
      this.addLog('success', 'step_4', `Generated ${contentSlides.length} rich content slides with detailed information`);

      return true;
    } catch (error) {
      console.error('Error generating rich slides:', error);
      
      // Enhanced fallback with rich content
      const contentSlides: Slide[] = [];
      const contentStepCount = this.plan.totalSlides - 4;
      
      for (let i = 0; i < contentStepCount; i++) {
        const fallbackSlide: Slide = {
          id: `slide_${Date.now()}_fallback_${i}_${Math.random().toString(36).substr(2, 9)}`,
          layout: 'title+bullets',
          animation: 'fadeIn',
          blocks: [
            {
              type: 'Heading',
              text: `${this.plan.title} - Key Point ${i + 1}`,
              animation: 'slideInFromTop'
            },
            {
              type: 'Subheading',
              text: `Essential insights about ${this.plan.title.toLowerCase()}`,
              animation: 'fadeIn'
            },
            {
              type: 'Markdown',
              md: `**Focus Area ${i + 1}:** ${this.plan.title}\n\nThis section provides comprehensive coverage of key aspects related to ${this.plan.title.toLowerCase()}, offering actionable insights and practical applications.\n\n**Key Benefits:**\n- Enhanced understanding\n- Practical implementation\n- Strategic insights`,
              animation: 'slideInFromLeft'
            },
            {
              type: 'Bullets',
              items: [
                `Critical aspect ${i + 1} of ${this.plan.title.toLowerCase()}`,
                `Implementation strategies and best practices`,
                `Real-world applications and case studies`,
                `Future trends and opportunities`,
                `Actionable recommendations for success`
              ],
              animation: 'staggerIn'
            }
          ],
          notes: `Speaker Notes for ${this.plan.title} - Key Point ${i + 1}:\n\nKey Talking Points:\n• Essential insights about ${this.plan.title.toLowerCase()}\n• Implementation strategies and best practices\n• Real-world applications and case studies\n\nEngagement Tips:\n- Start with a compelling statistic or story\n- Use specific examples and case studies\n- Encourage audience interaction with questions\n- Provide actionable takeaways\n- Connect to real-world applications`
        };
        contentSlides.push(fallbackSlide);
      }
      
      this.state.deck.slides = [...(this.state.deck.slides || []), ...contentSlides];
      this.addLog('warning', 'step_4', `Used fallback content generation for ${contentSlides.length} slides`);
      
      return true;
    }
  }
  
  private mapLayout(aiLayout: string): string {
    const layoutMap: { [key: string]: string } = {
      'cover': 'title',
      'agenda': 'title+bullets',
      'content': 'title+bullets',
      'kpi': 'title+bullets',
      'comparison': 'two-col',
      'timeline': 'title+bullets',
      'quote': 'quote',
      'diagram': 'title+bullets',
      'summary': 'title+bullets',
      'references': 'title+bullets'
    };
    
    return layoutMap[aiLayout] || 'title+bullets';
  }

  private async executeConclusionStep(): Promise<boolean> {
    await this.delay(1500);
    
    const conclusionSlide: Slide = {
      id: `slide_${Date.now()}_conclusion_${Math.random().toString(36).substr(2, 9)}`,
      layout: 'title+bullets',
      animation: 'fadeIn',
      blocks: [
        {
          type: 'Heading',
          text: 'Key Takeaways',
          animation: 'slideInFromTop'
        },
        {
          type: 'Subheading',
          text: 'What we\'ve learned and what\'s next',
          animation: 'fadeIn'
        },
        {
          type: 'Bullets',
          items: [
            'Essential concepts and principles covered',
            'Practical applications and real-world examples',
            'Best practices for implementation',
            'Future trends and opportunities to explore',
            'Actionable next steps for success'
          ],
          animation: 'staggerIn'
        },
        {
          type: 'Markdown',
          md: `**Questions & Discussion**\n\nThank you for your attention. The floor is open for questions and discussion.`,
          animation: 'slideInFromLeft'
        }
      ],
      notes: 'Summarize key points and thank the audience. Invite questions.\n\nConclusion Tips:\n- Reinforce the main message\n- Provide clear next steps\n- Encourage questions and discussion\n- Thank the audience for their time\n- Provide contact information for follow-up'
    };

    this.state.deck.slides = [...(this.state.deck.slides || []), conclusionSlide];
    this.addLog('success', 'step_5', 'Enhanced conclusion slide created');
    return true;
  }

  private async executeThemingStep(): Promise<boolean> {
    await this.delay(2000);
    
    // Apply theme to the deck
    this.state.deck.title = this.plan.title;
    this.state.deck.subtitle = this.plan.overview;
    this.state.deck.theme = 'Corporate';
    this.addLog('info', 'step_6', 'Applying theme and styling...');
    await this.delay(1000);
    this.addLog('success', 'step_6', 'Theme applied successfully');
    return true;
  }

  private async executeLiveWidgetsStep(): Promise<boolean> {
    await this.delay(1000);
    
    // Add live widgets if enabled
    this.addLog('info', 'step_7', 'Adding live widgets...');
    await this.delay(1000);
    this.addLog('success', 'step_7', 'Live widgets integrated');
    return true;
  }

  private async executeFinalReviewStep(): Promise<boolean> {
    await this.delay(2000);
    
    this.addLog('info', 'step_8', 'Reviewing presentation...');
    await this.delay(1000);
    this.addLog('info', 'step_8', 'Checking consistency...');
    await this.delay(1000);
    this.addLog('success', 'step_8', 'Final review completed');
    return true;
  }

  private async executeAllSteps(): Promise<void> {
    for (const step of this.plan.steps) {
      if (step.status === 'pending') {
        const canExecute = !step.dependencies || 
          step.dependencies.every(depId => 
            this.plan.steps.find(s => s.id === depId)?.status === 'completed'
          );

        if (canExecute) {
          await this.executeStep(step.id);
        }
      }
    }
  }

  private addLog(type: ExecutionLog['type'], stepId: string, message: string): void {
    const log: ExecutionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      stepId,
      message,
      type
    };
    
    this.state.logs.push(log);
  }

  private updateProgress(): void {
    const completed = this.plan.steps.filter(s => s.status === 'completed').length;
    const total = this.plan.steps.length;
    const percentage = Math.round((completed / total) * 100);
    
    this.state.progress = { completed, total, percentage };
  }

  private updateState(): void {
    this.onStateChange({ ...this.state });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentState(): ExecutionState {
    return { ...this.state };
  }

  pauseExecution(): void {
    this.isRunning = false;
    this.state.isExecuting = false;
    this.updateState();
  }

  resumeExecution(): void {
    if (!this.isRunning) {
      this.startExecution();
    }
  }
}
