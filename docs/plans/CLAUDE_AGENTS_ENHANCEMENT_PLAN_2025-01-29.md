# Claude Code Sub-Agents & Hooks Enhancement Plan for FibreFlow

**Date**: 2025-01-29  
**Author**: Claude  
**Status**: APPROVED ✅  
**Estimated Duration**: 2-3 days

## Executive Summary

Transform FibreFlow's static markdown agents into a powerful multi-agent system using Claude Code's sub-agent architecture and hooks. This will enable parallel processing, better error handling, automated data integrity validation, and comprehensive observability.

## Goals

1. **Convert static agents to dynamic sub-agents** with YAML configuration
2. **Implement hooks** for data integrity validation and observability
3. **Create meta-agent** for agent management and creation
4. **Design agent workflows** for complex operations
5. **Add progress notifications** for long-running tasks
6. **Enhance audit trail** with agent activity logging

## Phase 1: Foundation Setup (Day 1 Morning)

### 1.1 Create Directory Structure ✅
- [ ] Create `.claude/hooks/` directory
- [ ] Create `.claude/agents/yaml/` directory for YAML configs
- [ ] Create `.claude/logs/` directory for agent logs
- [ ] Create `.claude/utils/` directory for shared utilities

### 1.2 Install Dependencies ✅
- [ ] Add uv (Astral) for Python single-file scripts
- [ ] Configure Python environment for hooks
- [ ] Set up logging infrastructure

### 1.3 Create Base Hook Scripts ✅
- [ ] `pre_tool_use.py` - Command filtering and validation
- [ ] `post_tool_use.py` - Logging and monitoring
- [ ] `stop.py` - Completion notifications
- [ ] `notification.py` - User interaction handling
- [ ] `sub_agent_stop.py` - Sub-agent completion tracking

### 1.4 Update Settings Configuration ✅
- [ ] Add hooks configuration to settings.json
- [ ] Configure hook matchers and commands
- [ ] Test basic hook functionality

## Phase 2: Agent Conversion (Day 1 Afternoon)

### 2.1 Convert Data Integrity Guardian ✅
- [ ] Create `data-integrity-guardian.yaml`
- [ ] Define tools and permissions
- [ ] Write system prompt with validation rules
- [ ] Test pole/drop validation functionality

### 2.2 Convert OneMap Data Agent ✅
- [ ] Create `onemap-data-agent.yaml`
- [ ] Split into sub-agents:
  - [ ] `csv-validator.yaml`
  - [ ] `status-tracker.yaml`
  - [ ] `report-generator.yaml`
- [ ] Define agent communication patterns

### 2.3 Convert Security Agent ✅
- [ ] Create `security-agent.yaml`
- [ ] Define restricted tools
- [ ] Implement security validation hooks
- [ ] Test permission enforcement

### 2.4 Convert Remaining Agents ✅
- [ ] `fibreflow-architect.yaml`
- [ ] `angular-frontend-specialist.yaml`
- [ ] `firebase-backend-expert.yaml`
- [ ] `pole-tracker-specialist.yaml`
- [ ] `boq-rfq-specialist.yaml`
- [ ] `testing-deployment-expert.yaml`

## Phase 3: Meta-Agent Implementation (Day 2 Morning)

### 3.1 Create Meta-Agent ✅
- [ ] Design `meta-agent.yaml`
- [ ] Implement agent creation workflow
- [ ] Add agent update capabilities
- [ ] Create agent discovery mechanism

### 3.2 Agent Templates ✅
- [ ] Create base agent template
- [ ] Define common patterns
- [ ] Build agent generator prompt
- [ ] Test agent creation workflow

## Phase 4: Data Integrity Hooks (Day 2 Afternoon)

### 4.1 Pre-Tool Validation Hooks ✅
- [ ] Pole number uniqueness validation
- [ ] Drop capacity checking (max 12 per pole)
- [ ] Drop number uniqueness validation
- [ ] Format validation for pole/drop IDs
- [ ] Blocking rules for dangerous operations

### 4.2 Post-Tool Monitoring ✅
- [ ] Log all database writes
- [ ] Track validation results
- [ ] Generate integrity reports
- [ ] Alert on validation failures

### 4.3 Real-time Validation Integration ✅
- [ ] Hook into Write operations
- [ ] Hook into MultiEdit operations
- [ ] Hook into import operations
- [ ] Test with sample data

## Phase 5: Agent Workflows (Day 3 Morning)

### 5.1 OneMap Import Workflow ✅
- [ ] Design multi-agent import process
- [ ] Create workflow coordinator agent
- [ ] Implement parallel validation
- [ ] Add progress tracking

### 5.2 Pole Analytics Workflow ✅
- [ ] Create analytics pipeline agents
- [ ] Design report generation flow
- [ ] Implement data aggregation
- [ ] Add export capabilities

### 5.3 Daily Operations Workflow ✅
- [ ] Morning data integrity check
- [ ] Automated report generation
- [ ] Performance monitoring
- [ ] Issue detection and alerting

## Phase 6: Observability & Notifications (Day 3 Afternoon)

### 6.1 Logging Infrastructure ✅
- [ ] Structured JSON logging
- [ ] Agent activity tracking
- [ ] Performance metrics
- [ ] Error tracking

### 6.2 Progress Notifications ✅
- [ ] Text-to-speech setup (optional)
- [ ] Progress bar for long operations
- [ ] Completion notifications
- [ ] Error alerts

### 6.3 Audit Trail Enhancement ✅
- [ ] Agent activity logging
- [ ] Decision tracking
- [ ] Performance analytics
- [ ] Compliance reporting

## Phase 7: Testing & Documentation (Day 3 Evening)

### 7.1 Integration Testing ✅
- [ ] Test all agents individually
- [ ] Test agent workflows
- [ ] Test hook validations
- [ ] Test error scenarios

### 7.2 Documentation ✅
- [ ] Update CLAUDE.md with agent system
- [ ] Create agent usage guide
- [ ] Document hook configurations
- [ ] Add troubleshooting guide

### 7.3 Performance Optimization ✅
- [ ] Optimize hook execution time
- [ ] Improve agent response time
- [ ] Reduce context window usage
- [ ] Cache common validations

## Success Criteria

1. **All agents converted** to YAML format and functional
2. **Data integrity validation** prevents invalid data entry
3. **Import processing time** reduced by 50% through parallelization
4. **100% audit coverage** of agent activities
5. **Zero data corruption** incidents post-implementation
6. **Clear progress visibility** for all long-running operations

## Risk Mitigation

1. **Backwards Compatibility**: Keep markdown agents as fallback
2. **Gradual Rollout**: Test with non-critical operations first
3. **Monitoring**: Comprehensive logging from day one
4. **Rollback Plan**: Version control all changes
5. **Performance**: Profile and optimize critical paths

## Technical Details

### Hook Configuration Example
```json
{
  "hooks": {
    "preToolUse": [{
      "match": {},
      "commands": ["uv run .claude/hooks/pre_tool_use.py"]
    }],
    "postToolUse": [{
      "match": {},
      "commands": ["uv run .claude/hooks/post_tool_use.py"]
    }]
  }
}
```

### Agent YAML Structure
```yaml
name: agent-name
description: |
  Detailed description with trigger conditions
tools:
  - Tool1
  - Tool2
prompt: |
  System prompt with specific instructions
```

### Validation Rules Implementation
```python
# Pole uniqueness check
def validate_pole_uniqueness(pole_number):
    existing = search_firestore("planned-poles", pole_number)
    if existing:
        raise ValidationError(f"Pole {pole_number} already exists")
```

## Deliverables

1. **Functional sub-agent system** with 10+ specialized agents
2. **Comprehensive hook system** preventing data integrity issues
3. **Meta-agent** for ongoing agent management
4. **Agent workflows** for complex operations
5. **Full documentation** and usage guides
6. **Performance metrics** dashboard

## Next Steps After Implementation

1. Monitor agent performance for one week
2. Gather user feedback on workflows
3. Optimize based on usage patterns
4. Expand agent capabilities based on needs
5. Consider voice notifications for critical alerts

---

**Note**: This plan focuses on practical implementation while maintaining system stability. Each phase builds upon the previous, allowing for iterative testing and validation.