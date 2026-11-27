// @ts-nocheck
import { createOrchestrationConfig, simulateAssistantOutput } from './orchestrationConfig.js';

export class AIOrchestrationEngine {
  constructor() {
    Object.assign(this, createOrchestrationConfig());
  }

  async orchestrateTask(taskDescription, context = {}) {
    const orchestrationId = `ORCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Step 1: Parse and categorize task
      const taskCategory = this._categorizeTask(taskDescription);
      const route = this.taskRouterMatrix[taskCategory];

      if (!route) {
        return { success: false, error: `Unknown task type: ${taskCategory}` };
      }

      // Step 2: Prepare assistant execution plan
      const executionPlan = this._createExecutionPlan(taskCategory, route, context);

      // Step 3: Execute assistants (sequentially or parallel)
      let results = {};
      
      if (route.parallel) {
        results = await this._executeParallel(executionPlan, orchestrationId);
      } else {
        results = await this._executeSequential(executionPlan, orchestrationId);
      }

      // Step 4: Aggregate results
      const aggregatedResult = this._aggregateResults(results, taskCategory);

      // Step 5: Record for learning
      const elapsedTime = Date.now() - startTime;
      this._recordOrchestration(orchestrationId, taskCategory, route, aggregatedResult, elapsedTime);

      return {
        success: true,
        orchestrationId,
        taskCategory,
        results: aggregatedResult,
        elapsedTime,
        assistantsUsed: Object.keys(results),
        recommendedNextStep: this._getNextStep(taskCategory, aggregatedResult)
      };

    } catch (error) {
      
      return {
        success: false,
        orchestrationId,
        error: error.message,
        elapsedTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute assistants in parallel (fast but uses more resources)
   */
  async _executeParallel(executionPlan, orchestrationId) {
    const promises = executionPlan.map(step => 
      this._executeAssistant(step.assistant, step.task, step.input, orchestrationId)
    );

    const results = await Promise.allSettled(promises);
    const successResults = {};

    results.forEach((result, index) => {
      const assistant = executionPlan[index].assistant;
      if (result.status === 'fulfilled') {
        successResults[assistant] = result.value;
      } else {
        
        successResults[assistant] = { error: result.reason };
      }
    });

    return successResults;
  }

  /**
   * Execute assistants sequentially (slower but safer)
   */
  async _executeSequential(executionPlan, orchestrationId) {
    const successResults = {};

    for (const step of executionPlan) {
      try {
        const result = await this._executeAssistant(step.assistant, step.task, step.input, orchestrationId);
        successResults[step.assistant] = result;

        // Use output as input for next step if available
        if (step.passOutputAs && successResults[step.assistant]?.output) {
          const nextStep = executionPlan.find(s => s.inputKey === step.passOutputAs);
          if (nextStep) {
            nextStep.input[step.passOutputAs] = successResults[step.assistant].output;
          }
        }
      } catch (error) {
        
        successResults[step.assistant] = { error: error.message };
      }
    }

    return successResults;
  }

  /**
   * Execute a single assistant (simulated)
   */
  async _executeAssistant(assistantId, taskType, input, orchestrationId) {
    return new Promise(resolve => {
      // Simulate assistant work (in real implementation, call actual APIs)
      const processingTime = Math.random() * 2000 + 500; // 500-2500ms

      setTimeout(() => {
        const output = this._simulateAssistantOutput(assistantId, taskType, input);
        
        resolve({
          assistantId,
          taskType,
          processingTime,
          output,
          success: true,
          timestamp: new Date()
        });
      }, processingTime);
    });
  }

  /**
   * Simulate assistant output (placeholder for real implementation)
   */
  _simulateAssistantOutput(assistantId, taskType, input) {
    return simulateAssistantOutput(assistantId, taskType, input);
  }

  _categorizeTask(description) {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('find') && (lowerDesc.includes('property') || lowerDesc.includes('villa'))) {
      return 'FIND_PROPERTY';
    } else if (lowerDesc.includes('schedule') || lowerDesc.includes('viewing')) {
      return 'SCHEDULE_VIEWING';
    } else if (lowerDesc.includes('finance') || lowerDesc.includes('payment') || lowerDesc.includes('calculate')) {
      return 'CALCULATE_FINANCE';
    } else if (lowerDesc.includes('search') && lowerDesc.includes('property')) {
      return 'PROPERTY_SEARCH';
    } else if (lowerDesc.includes('qualify') || lowerDesc.includes('lead')) {
      return 'LEAD_QUALIFICATION';
    } else if (lowerDesc.includes('document') || lowerDesc.includes('process')) {
      return 'PROCESS_DOCUMENTS';
    } else if (lowerDesc.includes('market') || lowerDesc.includes('analyze')) {
      return 'MARKET_ANALYSIS';
    } else if (lowerDesc.includes('proposal') || lowerDesc.includes('send')) {
      return 'SEND_PROPOSAL';
    }

    return 'FIND_PROPERTY'; // Default
  }

  /**
   * Create execution plan for orchestration
   */
  _createExecutionPlan(taskCategory, route, context) {
    const plan = [];

    // Add primary assistants
    route.primary.forEach((assistant, index) => {
      plan.push({
        stepNumber: index + 1,
        assistant,
        task: taskCategory,
        input: context,
        critical: true,
        passOutputAs: index < route.primary.length - 1 ? `result_${assistant}` : null
      });
    });

    // Could add secondary assistants if needed
    return plan;
  }

  /**
   * Aggregate results from multiple assistants
   */
  _aggregateResults(results, taskCategory) {
    const aggregated = {
      taskCategory,
      timestamp: new Date(),
      results: results,
      summary: this._createSummary(results, taskCategory)
    };

    return aggregated;
  }

  /**
   * Create human-readable summary of orchestration
   */
  _createSummary(results, taskCategory) {
    if (taskCategory === 'FIND_PROPERTY' && results.MARY?.output?.properties) {
      return `Found ${results.MARY.output.properties.length} matching properties. Top match: ${results.MARY.output.properties[0]?.name}`;
    } else if (taskCategory === 'SCHEDULE_VIEWING' && results.LINDA?.output?.scheduled) {
      return `Viewing scheduled for ${results.LINDA.output.viewingTime} with ${results.LINDA.output.agent}`;
    }

    return 'Task completed successfully';
  }

  /**
   * Get recommended next step
   */
  _getNextStep(taskCategory, result) {
    const nextSteps = {
      'FIND_PROPERTY': 'SCHEDULE_VIEWING',
      'SCHEDULE_VIEWING': 'CALCULATE_FINANCE',
      'CALCULATE_FINANCE': 'SEND_PROPOSAL',
      'LEAD_QUALIFICATION': 'SCHEDULE_VIEWING',
      'MARKET_ANALYSIS': 'SEND_PROPOSAL',
      'PROCESS_DOCUMENTS': 'SEND_PROPOSAL'
    };

    return nextSteps[taskCategory] || 'Complete';
  }

  /**
   * Record orchestration for learning and optimization
   */
  _recordOrchestration(orchestrationId, taskCategory, route, result, elapsedTime) {
    this.orchestrationHistory.push({
      orchestrationId,
      taskCategory,
      route: route.primary,
      success: result.success !== false,
      elapsedTime,
      timestamp: new Date(),
      assistantsUsed: Object.keys(result.results || {})
    });

    // Update learning metrics
    if (!this.routingLearning[taskCategory]) {
      this.routingLearning[taskCategory] = [];
    }

    this.routingLearning[taskCategory].push({
      route: route.primary.join('+'),
      success: result.success !== false,
      time: elapsedTime
    });
  }

  /**
   * Get optimal route based on learning
   */
  getOptimalRoute(taskCategory) {
    if (!this.routingLearning[taskCategory] || this.routingLearning[taskCategory].length === 0) {
      return this.taskRouterMatrix[taskCategory]?.primary || ['ZOE'];
    }

    // Calculate success rate for each route
    const routes = {};
    this.routingLearning[taskCategory].forEach(attempt => {
      if (!routes[attempt.route]) {
        routes[attempt.route] = { successes: 0, total: 0, avgTime: 0, times: [] };
      }
      routes[attempt.route].total++;
      routes[attempt.route].times.push(attempt.time);
      if (attempt.success) routes[attempt.route].successes++;
      routes[attempt.route].avgTime = routes[attempt.route].times.reduce((a, b) => a + b) / routes[attempt.route].times.length;
    });

    // Find best route
    let bestRoute = Object.keys(routes)[0];
    let bestScore = 0;

    Object.entries(routes).forEach(([route, stats]) => {
      const successRate = stats.successes / stats.total;
      const speedScore = 1 / (stats.avgTime / 1000); // Higher speed = higher score
      const score = successRate * 0.7 + speedScore * 0.3; // Weight success more

      if (score > bestScore) {
        bestScore = score;
        bestRoute = route;
      }
    });

    return bestRoute.split('+');
  }

  /**
   * Get orchestration history and analytics
   */
  getAnalytics(taskCategory = null) {
    let relevantHistory = this.orchestrationHistory;

    if (taskCategory) {
      relevantHistory = relevantHistory.filter(h => h.taskCategory === taskCategory);
    }

    const totalOrchestrations = relevantHistory.length;
    const successCount = relevantHistory.filter(h => h.success).length;
    const avgTime = relevantHistory.reduce((sum, h) => sum + h.elapsedTime, 0) / totalOrchestrations || 0;

    return {
      totalOrchestrations,
      successCount,
      successRate: (successCount / totalOrchestrations * 100).toFixed(1) + '%',
      averageTime: Math.round(avgTime) + 'ms',
      taskCategories: [...new Set(relevantHistory.map(h => h.taskCategory))],
      mostUsedAssistants: this._getMostUsedAssistants(relevantHistory)
    };
  }

  /**
   * Get most frequently used assistants
   */
  _getMostUsedAssistants(history) {
    const assistantCounts = {};

    history.forEach(record => {
      record.assistantsUsed?.forEach(assistant => {
        assistantCounts[assistant] = (assistantCounts[assistant] || 0) + 1;
      });
    });

    return Object.entries(assistantCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([assistant, count]) => ({ assistant, usageCount: count }));
  }
}

// Export both engine classes
