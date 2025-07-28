#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Context Management System for FibreFlow Agents
Allows agents to learn from past decisions and accumulate knowledge
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

class ContextManager:
    def __init__(self):
        self.context_dir = Path(__file__).parent.parent / 'context'
        self.context_dir.mkdir(exist_ok=True)
        self.decisions_file = self.context_dir / 'decisions.json'
        self.agent_contexts_dir = self.context_dir / 'agents'
        self.agent_contexts_dir.mkdir(exist_ok=True)
        
    def load_decisions(self) -> Dict[str, Any]:
        """Load all decisions, patterns, and learnings"""
        if self.decisions_file.exists():
            with open(self.decisions_file, 'r') as f:
                return json.load(f)
        return {"decisions": [], "patterns": [], "learnings": []}
    
    def save_decisions(self, data: Dict[str, Any]):
        """Save decisions data"""
        with open(self.decisions_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def add_decision(self, agent: str, decision: str, context: str, rationale: str, 
                    category: str = "general", implementation: str = "", tags: List[str] = None):
        """Add a new decision"""
        data = self.load_decisions()
        
        decision_id = f"DEC-{datetime.now().strftime('%Y-%m-%d')}-{len(data['decisions'])+1:03d}"
        
        new_decision = {
            "id": decision_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "agent": agent,
            "category": category,
            "decision": decision,
            "context": context,
            "rationale": rationale,
            "implementation": implementation,
            "outcome": "pending",
            "tags": tags or []
        }
        
        data['decisions'].append(new_decision)
        self.save_decisions(data)
        
        # Update agent-specific context
        self.update_agent_context(agent, 'decisions', new_decision)
        
        return decision_id
    
    def add_pattern(self, agent: str, name: str, description: str, 
                   when_to_use: str, code_example: str = "", tags: List[str] = None):
        """Add a new pattern"""
        data = self.load_decisions()
        
        pattern_id = f"PAT-{len(data['patterns'])+1:03d}"
        
        new_pattern = {
            "id": pattern_id,
            "name": name,
            "description": description,
            "agent": agent,
            "code_example": code_example,
            "when_to_use": when_to_use,
            "tags": tags or []
        }
        
        data['patterns'].append(new_pattern)
        self.save_decisions(data)
        
        # Update agent-specific context
        self.update_agent_context(agent, 'patterns', new_pattern)
        
        return pattern_id
    
    def add_learning(self, agent: str, learning: str, impact: str, 
                    applied_to: List[str], tags: List[str] = None):
        """Add a new learning"""
        data = self.load_decisions()
        
        learning_id = f"LEARN-{len(data['learnings'])+1:03d}"
        
        new_learning = {
            "id": learning_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "agent": agent,
            "learning": learning,
            "impact": impact,
            "applied_to": applied_to,
            "tags": tags or []
        }
        
        data['learnings'].append(new_learning)
        self.save_decisions(data)
        
        # Update agent-specific context
        self.update_agent_context(agent, 'learnings', new_learning)
        
        return learning_id
    
    def update_agent_context(self, agent: str, context_type: str, item: Dict[str, Any]):
        """Update agent-specific context file"""
        agent_file = self.agent_contexts_dir / f"{agent}.json"
        
        if agent_file.exists():
            with open(agent_file, 'r') as f:
                agent_data = json.load(f)
        else:
            agent_data = {
                "agent": agent,
                "last_updated": "",
                "decisions": [],
                "patterns": [],
                "learnings": [],
                "references": []
            }
        
        agent_data['last_updated'] = datetime.now().isoformat()
        
        if context_type in agent_data:
            # Only add ID reference to avoid duplication
            agent_data[context_type].append({
                "id": item['id'],
                "date": item.get('date', ''),
                "summary": item.get('decision') or item.get('name') or item.get('learning', '')
            })
        
        with open(agent_file, 'w') as f:
            json.dump(agent_data, f, indent=2)
    
    def get_agent_context(self, agent: str) -> Dict[str, Any]:
        """Get all context for a specific agent"""
        agent_file = self.agent_contexts_dir / f"{agent}.json"
        
        if agent_file.exists():
            with open(agent_file, 'r') as f:
                return json.load(f)
        
        # Return relevant items from main decisions file
        data = self.load_decisions()
        agent_items = {
            "agent": agent,
            "decisions": [d for d in data['decisions'] if d['agent'] == agent],
            "patterns": [p for p in data['patterns'] if p['agent'] == agent],
            "learnings": [l for l in data['learnings'] if l['agent'] == agent]
        }
        
        return agent_items
    
    def search_context(self, query: str, tags: List[str] = None) -> Dict[str, List[Any]]:
        """Search across all context"""
        data = self.load_decisions()
        results = {"decisions": [], "patterns": [], "learnings": []}
        
        query_lower = query.lower()
        
        # Search decisions
        for decision in data['decisions']:
            if (query_lower in json.dumps(decision).lower() or
                (tags and any(tag in decision.get('tags', []) for tag in tags))):
                results['decisions'].append(decision)
        
        # Search patterns
        for pattern in data['patterns']:
            if (query_lower in json.dumps(pattern).lower() or
                (tags and any(tag in pattern.get('tags', []) for tag in tags))):
                results['patterns'].append(pattern)
        
        # Search learnings
        for learning in data['learnings']:
            if (query_lower in json.dumps(learning).lower() or
                (tags and any(tag in learning.get('tags', []) for tag in tags))):
                results['learnings'].append(learning)
        
        return results
    
    def update_decision_outcome(self, decision_id: str, outcome: str):
        """Update the outcome of a decision"""
        data = self.load_decisions()
        
        for decision in data['decisions']:
            if decision['id'] == decision_id:
                decision['outcome'] = outcome
                decision['outcome_date'] = datetime.now().strftime("%Y-%m-%d")
                break
        
        self.save_decisions(data)
    
    def export_agent_knowledge(self, agent: str, output_format: str = "markdown") -> str:
        """Export all knowledge for an agent in specified format"""
        context = self.get_agent_context(agent)
        
        if output_format == "markdown":
            output = f"# {agent} Knowledge Base\n\n"
            output += f"*Last Updated: {datetime.now().strftime('%Y-%m-%d')}*\n\n"
            
            if context['decisions']:
                output += "## Decisions\n\n"
                for d in context['decisions']:
                    output += f"### {d['id']}: {d['decision']}\n"
                    output += f"- **Context**: {d['context']}\n"
                    output += f"- **Rationale**: {d['rationale']}\n"
                    output += f"- **Outcome**: {d.get('outcome', 'pending')}\n\n"
            
            if context['patterns']:
                output += "## Patterns\n\n"
                for p in context['patterns']:
                    output += f"### {p['name']}\n"
                    output += f"- **Description**: {p['description']}\n"
                    output += f"- **When to use**: {p['when_to_use']}\n\n"
            
            if context['learnings']:
                output += "## Learnings\n\n"
                for l in context['learnings']:
                    output += f"### {l['id']}: {l['learning']}\n"
                    output += f"- **Impact**: {l['impact']}\n"
                    output += f"- **Applied to**: {', '.join(l['applied_to'])}\n\n"
            
            return output
        
        return json.dumps(context, indent=2)


def main():
    """CLI interface for context management"""
    import argparse
    
    parser = argparse.ArgumentParser(description="FibreFlow Agent Context Manager")
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Add decision
    decision_parser = subparsers.add_parser('add-decision', help='Add a new decision')
    decision_parser.add_argument('--agent', required=True, help='Agent name')
    decision_parser.add_argument('--decision', required=True, help='Decision made')
    decision_parser.add_argument('--context', required=True, help='Context for decision')
    decision_parser.add_argument('--rationale', required=True, help='Why this decision')
    decision_parser.add_argument('--category', default='general', help='Category')
    decision_parser.add_argument('--implementation', default='', help='Implementation ref')
    decision_parser.add_argument('--tags', nargs='+', help='Tags')
    
    # Add pattern
    pattern_parser = subparsers.add_parser('add-pattern', help='Add a new pattern')
    pattern_parser.add_argument('--agent', required=True, help='Agent name')
    pattern_parser.add_argument('--name', required=True, help='Pattern name')
    pattern_parser.add_argument('--description', required=True, help='Pattern description')
    pattern_parser.add_argument('--when', required=True, help='When to use')
    pattern_parser.add_argument('--code', default='', help='Code example')
    pattern_parser.add_argument('--tags', nargs='+', help='Tags')
    
    # Add learning
    learning_parser = subparsers.add_parser('add-learning', help='Add a new learning')
    learning_parser.add_argument('--agent', required=True, help='Agent name')
    learning_parser.add_argument('--learning', required=True, help='What was learned')
    learning_parser.add_argument('--impact', required=True, help='Impact of learning')
    learning_parser.add_argument('--applied-to', nargs='+', required=True, help='Where applied')
    learning_parser.add_argument('--tags', nargs='+', help='Tags')
    
    # Search
    search_parser = subparsers.add_parser('search', help='Search context')
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument('--tags', nargs='+', help='Filter by tags')
    
    # Get agent context
    agent_parser = subparsers.add_parser('agent', help='Get agent context')
    agent_parser.add_argument('agent_name', help='Agent name')
    agent_parser.add_argument('--export', choices=['markdown', 'json'], help='Export format')
    
    # Update outcome
    outcome_parser = subparsers.add_parser('update-outcome', help='Update decision outcome')
    outcome_parser.add_argument('decision_id', help='Decision ID')
    outcome_parser.add_argument('outcome', help='Outcome (success/failure/mixed)')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cm = ContextManager()
    
    if args.command == 'add-decision':
        decision_id = cm.add_decision(
            agent=args.agent,
            decision=args.decision,
            context=args.context,
            rationale=args.rationale,
            category=args.category,
            implementation=args.implementation,
            tags=args.tags
        )
        print(f"✅ Added decision: {decision_id}")
    
    elif args.command == 'add-pattern':
        pattern_id = cm.add_pattern(
            agent=args.agent,
            name=args.name,
            description=args.description,
            when_to_use=args.when,
            code_example=args.code,
            tags=args.tags
        )
        print(f"✅ Added pattern: {pattern_id}")
    
    elif args.command == 'add-learning':
        learning_id = cm.add_learning(
            agent=args.agent,
            learning=args.learning,
            impact=args.impact,
            applied_to=args.applied_to,
            tags=args.tags
        )
        print(f"✅ Added learning: {learning_id}")
    
    elif args.command == 'search':
        results = cm.search_context(args.query, args.tags)
        
        print(f"\n🔍 Search results for '{args.query}':\n")
        
        if results['decisions']:
            print("📋 Decisions:")
            for d in results['decisions']:
                print(f"  - {d['id']}: {d['decision']} ({d['agent']})")
        
        if results['patterns']:
            print("\n🔧 Patterns:")
            for p in results['patterns']:
                print(f"  - {p['id']}: {p['name']} ({p['agent']})")
        
        if results['learnings']:
            print("\n💡 Learnings:")
            for l in results['learnings']:
                print(f"  - {l['id']}: {l['learning']} ({l['agent']})")
    
    elif args.command == 'agent':
        if args.export:
            output = cm.export_agent_knowledge(args.agent_name, args.export)
            if args.export == 'markdown':
                # Save to file
                output_file = Path(f"{args.agent_name}_knowledge.md")
                with open(output_file, 'w') as f:
                    f.write(output)
                print(f"✅ Exported to {output_file}")
            else:
                print(output)
        else:
            context = cm.get_agent_context(args.agent_name)
            print(json.dumps(context, indent=2))
    
    elif args.command == 'update-outcome':
        cm.update_decision_outcome(args.decision_id, args.outcome)
        print(f"✅ Updated outcome for {args.decision_id}")


if __name__ == "__main__":
    main()