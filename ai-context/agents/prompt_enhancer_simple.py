#!/usr/bin/env python3
"""
Simple prompt enhancer that works without Google AI Studio
Uses pattern matching and codebase knowledge
"""

import os
import json
import time
import re
from typing import Dict, List, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ContextMatch:
    file_path: str
    relevance_score: float
    match_type: str
    code_snippet: str
    explanation: str

@dataclass
class EnhancedPrompt:
    original_request: str
    enhanced_prompt: str
    context_matches: List[ContextMatch]
    patterns_referenced: List[str]
    warnings: List[str]
    estimated_tokens: int
    processing_time: float

class FibreFlowPromptEnhancer:
    """Simple pattern-based prompt enhancer"""
    
    def __init__(self):
        self.index = self.load_codebase_index()
        self.vertex_available = False  # Always offline mode
        self.load_patterns()
        self.load_decision_history()
        print("✅ Pattern-based enhancer initialized (no AI required)")
    
    def load_codebase_index(self) -> Optional[Dict]:
        """Load the codebase index"""
        try:
            with open("cache/codebase_index.json", 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("❌ Codebase index not found. Run codebase_scanner.py first.")
            return None
    
    def load_patterns(self):
        """Load FibreFlow patterns"""
        self.fibreflow_patterns = {
            'service': {
                'pattern': 'BaseFirestoreService',
                'template': '''export class {name}Service extends BaseFirestoreService<{Model}> {
  constructor() {
    super('{collection}');
  }
}''',
                'description': 'All services extend BaseFirestoreService'
            },
            'component': {
                'pattern': 'standalone_component',
                'template': '''@Component({
  selector: 'app-{name}',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './{name}.component.html'
})
export class {Name}Component {
  private service = inject({Name}Service);
}''',
                'description': 'All components are standalone with inject()'
            }
        }
    
    def load_decision_history(self):
        """Load architectural decisions"""
        self.decisions = {
            'signals': 'Use signals instead of BehaviorSubject',
            'standalone': 'All components must be standalone',
            'inject': 'Use inject() not constructor injection',
            'theme': 'Use ff-rgb() theme functions'
        }
    
    def analyze_request(self, request: str) -> Dict:
        """Analyze request using pattern matching"""
        request_lower = request.lower()
        
        analysis = {
            'intent': 'unknown',
            'feature_type': None,
            'keywords': [],
            'similar_features': []
        }
        
        # Detect intent
        if any(word in request_lower for word in ['add', 'create', 'new', 'build']):
            analysis['intent'] = 'create_feature'
        elif any(word in request_lower for word in ['fix', 'debug', 'error']):
            analysis['intent'] = 'debug_issue'
        elif any(word in request_lower for word in ['document', 'docs']):
            analysis['intent'] = 'create_documentation'
        
        # Extract keywords
        words = re.findall(r'\b[a-zA-Z]{3,}\b', request_lower)
        analysis['keywords'] = [w for w in words if w not in ['the', 'and', 'for', 'with']]
        
        # Find similar features
        if self.index:
            for keyword in analysis['keywords'][:5]:
                for service_name in self.index.get('services', {}):
                    if keyword in service_name.lower():
                        analysis['similar_features'].append(f"Service: {service_name}")
        
        return analysis
    
    def find_relevant_context(self, analysis: Dict) -> List[ContextMatch]:
        """Find relevant patterns and examples"""
        matches = []
        
        # Add relevant patterns
        if 'service' in str(analysis.get('keywords', [])):
            pattern = self.fibreflow_patterns['service']
            matches.append(ContextMatch(
                file_path="pattern_template",
                relevance_score=0.9,
                match_type="pattern",
                code_snippet=pattern['template'],
                explanation=pattern['description']
            ))
        
        return matches
    
    def generate_warnings(self, analysis: Dict) -> List[str]:
        """Generate helpful warnings"""
        warnings = []
        keywords = analysis.get('keywords', [])
        
        if 'module' in keywords:
            warnings.append("⚠️ Use standalone components, not NgModules")
        if 'behaviorsubject' in keywords:
            warnings.append("🔄 Use signals instead of BehaviorSubject")
        
        return warnings
    
    def build_enhanced_prompt(self, request: str, analysis: Dict, 
                            context: List[ContextMatch], warnings: List[str]) -> str:
        """Build the enhanced prompt"""
        parts = []
        
        parts.append("# Enhanced FibreFlow Development Request")
        parts.append(f"**Original Request**: {request}")
        parts.append("")
        
        if warnings:
            parts.append("## ⚠️ Important Guidelines")
            for warning in warnings:
                parts.append(f"- {warning}")
            parts.append("")
        
        parts.append("## 🎯 FibreFlow Requirements")
        parts.append("**MUST follow these patterns:**")
        parts.append("- ✅ Use `standalone: true` for all components")
        parts.append("- ✅ Use `inject()` pattern")
        parts.append("- ✅ Extend `BaseFirestoreService<T>` for services")
        parts.append("- ✅ Use theme functions: `ff-rgb()`, `ff-spacing()`")
        parts.append("")
        
        if self.index:
            parts.append("## 🏗️ Architecture Context")
            parts.append(f"- Total files: {self.index['total_files']:,}")
            parts.append(f"- Services: {len(self.index.get('services', {}))}")
            parts.append(f"- Components: {len(self.index.get('components', {}))}")
        
        return "\n".join(parts)
    
    def enhance_prompt(self, user_request: str) -> EnhancedPrompt:
        """Main enhancement method"""
        start_time = time.time()
        
        print(f"🧠 Analyzing: {user_request}")
        
        analysis = self.analyze_request(user_request)
        print(f"✓ Intent: {analysis['intent']}")
        
        context_matches = self.find_relevant_context(analysis)
        warnings = self.generate_warnings(analysis)
        
        enhanced = self.build_enhanced_prompt(
            user_request, analysis, context_matches, warnings
        )
        
        processing_time = time.time() - start_time
        
        return EnhancedPrompt(
            original_request=user_request,
            enhanced_prompt=enhanced,
            context_matches=context_matches,
            patterns_referenced=[],
            warnings=warnings,
            estimated_tokens=len(enhanced) // 4,
            processing_time=processing_time
        )
    
    def display_enhanced_prompt(self, result: EnhancedPrompt):
        """Display the result"""
        print("\n" + "="*60)
        print("📋 Enhanced Prompt:")
        print("="*60)
        print(result.enhanced_prompt)
        print("="*60)
        print(f"\n📊 Tokens: {result.estimated_tokens} | Time: {result.processing_time:.2f}s")