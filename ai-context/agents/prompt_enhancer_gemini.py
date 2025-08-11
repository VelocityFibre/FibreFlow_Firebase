#!/usr/bin/env python3
"""
FibreFlow Prompt Enhancement Engine - Google AI Studio Version
Uses direct Gemini API instead of Vertex AI for cost savings
"""

import os
import json
import time
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import yaml
from dotenv import load_dotenv

# Google AI Studio imports (much simpler!)
import google.generativeai as genai

# Load environment variables
load_dotenv('.env.local')

@dataclass
class ContextMatch:
    """Represents a relevant piece of context for the user's request"""
    file_path: str
    relevance_score: float
    match_type: str  # 'service', 'component', 'pattern', 'similar'
    code_snippet: str
    explanation: str

@dataclass
class EnhancedPrompt:
    """The final enhanced prompt with context"""
    original_request: str
    enhanced_prompt: str
    context_matches: List[ContextMatch]
    patterns_referenced: List[str]
    warnings: List[str]
    estimated_tokens: int
    processing_time: float

class FibreFlowPromptEnhancer:
    """Enhances user prompts with FibreFlow codebase context using Google AI Studio"""
    
    def __init__(self):
        self.config = self.load_config()
        self.index = self.load_codebase_index()
        
        # Initialize Google AI Studio (much simpler than Vertex!)
        api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
        if not api_key:
            print("⚠️  No Google AI Studio API key found.")
            print("📝 Get your free API key from: https://aistudio.google.com/app/apikey")
            print("🔧 Add to .env.local: GOOGLE_AI_STUDIO_API_KEY=your-key")
            self.gemini_available = False
        else:
            try:
                genai.configure(api_key=api_key)
                model_name = os.getenv('GEMINI_MODEL', 'gemini-1.5-pro')
                self.model = genai.GenerativeModel(model_name)
                self.gemini_available = True
                print(f"✅ Connected to Google AI Studio using {model_name}")
                print("📊 Free tier: 50 requests/day with 1M token context!")
            except Exception as e:
                print(f"❌ Failed to initialize Gemini: {e}")
                self.gemini_available = False
        
        # Load FibreFlow knowledge
        self.load_patterns()
        self.load_decision_history()
        
        # Track daily usage for free tier
        self.usage_file = Path("cache/daily_usage.json")
        self.check_daily_usage()
    
    def check_daily_usage(self):
        """Track daily usage to stay within free tier limits"""
        today = time.strftime("%Y-%m-%d")
        
        if self.usage_file.exists():
            with open(self.usage_file, 'r') as f:
                usage = json.load(f)
        else:
            usage = {}
        
        if today not in usage:
            usage[today] = 0
        
        self.daily_usage = usage
        self.today = today
    
    def increment_usage(self):
        """Increment daily usage counter"""
        self.daily_usage[self.today] = self.daily_usage.get(self.today, 0) + 1
        
        # Save usage
        self.usage_file.parent.mkdir(exist_ok=True)
        with open(self.usage_file, 'w') as f:
            json.dump(self.daily_usage, f)
        
        # Warn if approaching limit
        count = self.daily_usage[self.today]
        limit = int(os.getenv('DAILY_REQUEST_LIMIT', '50'))
        
        if count >= limit:
            print(f"⚠️  Daily limit reached ({count}/{limit}). Falling back to pattern matching.")
            return False
        elif count >= limit * 0.8:
            print(f"📊 Usage: {count}/{limit} requests today")
        
        return True
    
    def load_config(self) -> Dict:
        """Load configuration"""
        try:
            with open("config/vertex_config.yaml", 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            return self.get_default_config()
    
    def get_default_config(self) -> Dict:
        """Default configuration"""
        return {
            'project': {'root': '/home/ldp/VF/Apps/FibreFlow'},
            'gemini': {
                'model': 'gemini-1.5-pro',
                'temperature': 0.3,
                'max_input_tokens': 1048576,
                'max_output_tokens': 8192
            },
            'enhancement': {
                'max_context_files': 10,
                'min_relevance_score': 0.3,
                'include_code_snippets': True,
                'max_snippet_lines': 20
            }
        }
    
    def load_codebase_index(self) -> Optional[Dict]:
        """Load the codebase index created by the scanner"""
        try:
            with open("cache/codebase_index.json", 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("❌ Codebase index not found. Run codebase_scanner.py first.")
            return None
    
    def load_patterns(self):
        """Load FibreFlow patterns and best practices"""
        self.fibreflow_patterns = {
            'service_creation': {
                'pattern': 'BaseFirestoreService',
                'template': '''export class {name}Service extends BaseFirestoreService<{Model}> {
  constructor() {
    super('{collection}');
  }
}''',
                'examples': ['auth.service.ts', 'project.service.ts', 'boq.service.ts'],
                'description': 'All FibreFlow services extend BaseFirestoreService for consistency'
            },
            'component_structure': {
                'pattern': 'standalone_component',
                'template': '''@Component({
  selector: 'app-{name}',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './{name}.component.html',
  styleUrl: './{name}.component.scss'
})
export class {Name}Component {
  private service = inject({Name}Service);
}''',
                'examples': ['project-list.component.ts', 'boq-form.component.ts'],
                'description': 'All components use standalone architecture with inject() pattern'
            },
            'theme_usage': {
                'pattern': 'ff_theme_functions',
                'template': '''.component {
  color: ff-rgb(foreground);
  background: ff-rgb(background);
  padding: ff-spacing(md);
}''',
                'examples': ['project-list.component.scss', 'boq-form.component.scss'],
                'description': 'Always use theme functions instead of hardcoded colors'
            }
        }
    
    def load_decision_history(self):
        """Load previous architectural decisions"""
        self.decisions = {
            'why_signals_over_behaviorsubject': 'Signals provide better type safety and automatic change detection',
            'why_standalone_components': 'Angular 18+ best practice, eliminates NgModules',
            'why_inject_over_constructor': 'Modern Angular pattern, cleaner code',
            'why_basefirestoreservice': 'Consistent CRUD operations, reduces boilerplate',
            'why_theme_functions': 'Maintains consistency across light/dark/vf/fibreflow themes',
            'why_direct_routes': 'Nested routes cause NG04002 errors, simple routes work reliably'
        }
    
    def analyze_with_gemini(self, request: str) -> Dict[str, any]:
        """Use Gemini via Google AI Studio to analyze the request"""
        if not self.gemini_available or not self.increment_usage():
            return self.analyze_request_pattern_matching(request)
        
        try:
            prompt = f"""Analyze this development request for the FibreFlow Angular application:
            
Request: "{request}"

Determine the following:
1. Intent: What is the user trying to do? Options:
   - create_feature: Build something new
   - debug_issue: Fix a problem
   - modify_feature: Change existing functionality
   - explain_code: Understand how something works
   - create_documentation: Write docs or guides
   - create_prompt: Generate a prompt for another AI
   - analyze_data: Analyze OneMap/pole data
   - optimize_performance: Improve speed/efficiency

2. Feature Type (if applicable):
   - service: Backend service or API
   - component: UI component or page
   - documentation: Docs, guides, or explanations
   - data_analysis: Data queries or reports
   - infrastructure: Database, deployment, etc.

3. Key entities mentioned (services, components, technologies)

4. Suggested approach

Return as JSON with keys: intent, feature_type, keywords, entities, approach"""
            
            # Use Gemini via Google AI Studio
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=500,
                )
            )
            
            # Parse the response
            try:
                # Extract JSON from response
                text = response.text
                # Find JSON in response (might be wrapped in ```json blocks)
                json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    result = json.loads(text)
            except:
                # Fallback if JSON parsing fails
                result = {
                    'intent': 'unknown',
                    'feature_type': None,
                    'keywords': request.lower().split()[:10],
                    'entities': [],
                    'approach': response.text
                }
            
            # Convert to expected format
            analysis = {
                'intent': result.get('intent', 'unknown'),
                'feature_type': result.get('feature_type'),
                'keywords': result.get('keywords', []),
                'similar_features': result.get('entities', []),
                'complexity': 'medium',
                'ai_insights': result.get('approach', '')
            }
            
            return analysis
            
        except Exception as e:
            print(f"⚠️  Gemini analysis failed: {e}, using pattern matching")
            return self.analyze_request_pattern_matching(request)
    
    def analyze_request_pattern_matching(self, request: str) -> Dict[str, any]:
        """Fallback pattern matching when Gemini is not available"""
        request_lower = request.lower()
        
        analysis = {
            'intent': 'unknown',
            'feature_type': None,
            'keywords': [],
            'similar_features': [],
            'complexity': 'medium'
        }
        
        # Detect intent
        if any(word in request_lower for word in ['document', 'documentation', 'docs', 'guide', 'readme']):
            analysis['intent'] = 'create_documentation'
        elif any(word in request_lower for word in ['prompt', 'generate prompt', 'create prompt for']):
            analysis['intent'] = 'create_prompt'
        elif any(word in request_lower for word in ['analyze', 'analysis', 'report', 'data']):
            analysis['intent'] = 'analyze_data'
        elif any(word in request_lower for word in ['slow', 'performance', 'optimize', 'speed']):
            analysis['intent'] = 'optimize_performance'
        elif any(word in request_lower for word in ['create', 'add', 'new', 'build', 'implement']):
            analysis['intent'] = 'create_feature'
        elif any(word in request_lower for word in ['fix', 'debug', 'error', 'issue', 'problem']):
            analysis['intent'] = 'debug_issue'
        elif any(word in request_lower for word in ['update', 'modify', 'change', 'edit']):
            analysis['intent'] = 'modify_feature'
        elif any(word in request_lower for word in ['explain', 'understand', 'how', 'why']):
            analysis['intent'] = 'explain_code'
        
        # Extract keywords
        keywords = re.findall(r'\b[a-zA-Z]{3,}\b', request_lower)
        analysis['keywords'] = [k for k in keywords if k not in ['the', 'and', 'for', 'with', 'that', 'this']]
        
        return analysis
    
    def analyze_request(self, request: str) -> Dict[str, any]:
        """Analyze the user request to understand intent"""
        try:
            if self.gemini_available:
                return self.analyze_with_gemini(request)
            return self.analyze_request_pattern_matching(request)
        except Exception as e:
            print(f"❌ Error in analyze_request: {e}")
            import traceback
            traceback.print_exc()
            # Return a default analysis
            return {
                'intent': 'create_feature',
                'feature_type': 'general',
                'keywords': request.lower().split()[:10],
                'similar_features': [],
                'complexity': 'medium'
            }
    
    def find_relevant_context(self, analysis: Dict, max_files: int = 10) -> List[ContextMatch]:
        """Find relevant code examples and patterns"""
        if not self.index:
            return []
        
        matches = []
        
        # Find pattern matches
        feature_type = analysis.get('feature_type')
        if feature_type in self.fibreflow_patterns:
            pattern = self.fibreflow_patterns[feature_type]
            matches.append(ContextMatch(
                file_path="pattern_template",
                relevance_score=0.9,
                match_type="pattern",
                code_snippet=pattern['template'],
                explanation=pattern['description']
            ))
        
        # Add more context based on keywords
        keywords = analysis.get('keywords', [])
        for keyword in keywords[:5]:  # Top 5 keywords
            # Search services
            for service_name, service_info in self.index.get('services', {}).items():
                if keyword in service_name.lower():
                    matches.append(ContextMatch(
                        file_path=service_info.get('file', 'unknown'),
                        relevance_score=0.7,
                        match_type="similar_service",
                        code_snippet=f"// Service: {service_name}",
                        explanation=f"Similar service: {service_name}"
                    ))
        
        return matches[:max_files]
    
    def generate_warnings(self, analysis: Dict) -> List[str]:
        """Generate warnings about common mistakes"""
        warnings = []
        keywords = analysis.get('keywords', [])
        
        if any(word in keywords for word in ['ngmodule', 'module']):
            warnings.append("⚠️ Avoid NgModules - FibreFlow uses standalone components")
        
        if any(word in keywords for word in ['behaviorsubject', 'subject']):
            warnings.append("🔄 Consider using Angular signals instead of BehaviorSubject")
        
        return warnings
    
    def build_enhanced_prompt(self, original_request: str, analysis: Dict, 
                            context_matches: List[ContextMatch], warnings: List[str]) -> str:
        """Build the final enhanced prompt"""
        
        # Check if this is a documentation or prompt creation request
        if analysis['intent'] in ['create_documentation', 'create_prompt', 'explain_code']:
            return self.build_documentation_prompt(original_request, analysis, context_matches)
        
        # Use Gemini AI to enhance the prompt if available
        if self.gemini_available:
            try:
                return self.enhance_with_gemini_ai(original_request, analysis, context_matches, warnings)
            except Exception as e:
                print(f"⚠️  AI enhancement failed: {e}, falling back to pattern matching")
        
        # Fallback to pattern-based enhancement
        return self.build_pattern_based_prompt(original_request, analysis, context_matches, warnings)
    
    def build_pattern_based_prompt(self, original_request: str, analysis: Dict, 
                                  context_matches: List[ContextMatch], warnings: List[str]) -> str:
        """Build enhanced prompt using pattern matching (no AI)"""
        prompt_parts = []
        
        prompt_parts.append("# Enhanced FibreFlow Development Request")
        prompt_parts.append(f"**Original Request**: {original_request}")
        prompt_parts.append("")
        
        if warnings:
            prompt_parts.append("## ⚠️ Important Guidelines")
            for warning in warnings:
                prompt_parts.append(f"- {warning}")
            prompt_parts.append("")
        
        prompt_parts.append("## 🎯 FibreFlow Requirements")
        prompt_parts.append("**MUST follow these patterns:**")
        prompt_parts.append("- ✅ Use `standalone: true` for all components")
        prompt_parts.append("- ✅ Use `inject()` pattern instead of constructor injection")
        prompt_parts.append("- ✅ Extend `BaseFirestoreService<T>` for all services")
        prompt_parts.append("- ✅ Use theme functions: `ff-rgb()`, `ff-spacing()`")
        prompt_parts.append("")
        
        return "\n".join(prompt_parts)
    
    def enhance_with_gemini_ai(self, original_request: str, analysis: Dict, 
                               context_matches: List[ContextMatch], warnings: List[str]) -> str:
        """Use Gemini AI to create a comprehensive enhanced prompt"""
        
        # Prepare context information for Gemini
        context_info = []
        if self.index:
            context_info.append(f"FibreFlow has {self.index['total_files']} files")
            context_info.append(f"Services: {', '.join(list(self.index.get('services', {}).keys())[:10])}")
            context_info.append(f"Components: {', '.join(list(self.index.get('components', {}).keys())[:10])}")
        
        # Build the prompt for Gemini
        gemini_prompt = f"""You are helping enhance a development request for FibreFlow, an Angular 20 fiber optic management system.

Original Request: {original_request}

Analysis:
- Intent: {analysis['intent']}
- Feature Type: {analysis.get('feature_type', 'general')}
- Keywords: {', '.join(analysis.get('keywords', []))}

FibreFlow Context:
{chr(10).join(context_info)}

Key FibreFlow Patterns:
- All components use standalone: true (no NgModules)
- Dependency injection uses inject() pattern
- Services extend BaseFirestoreService<T>
- Styling uses theme functions: ff-rgb(), ff-spacing()
- Firebase/Firestore for backend
- Angular Material for UI
- Signals for state management (not BehaviorSubject)

Similar existing features in FibreFlow:
- BOQ (Bill of Quantities) with Excel import/export
- Quotes with PDF generation
- Email service for notifications
- Stock management with movements
- Project management with phases/steps/tasks

Please create a comprehensive enhanced prompt that:
1. Clarifies the requirements
2. References similar patterns in FibreFlow
3. Suggests specific implementation approach
4. Includes relevant code patterns
5. Lists concrete next steps

For invoice management specifically, consider:
- BOQ module has similar line item management
- Quotes module has PDF generation
- Email service exists for sending
- Use ZAR currency formatting (South African Rand)
- Follow existing financial tracking patterns

Return a well-structured prompt that helps Claude Code implement this feature correctly."""

        try:
            response = self.model.generate_content(
                gemini_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=2000,
                )
            )
            
            enhanced_prompt = response.text
            
            # Add warnings if any
            if warnings:
                warning_section = "\n\n## ⚠️ Important Warnings\n"
                for warning in warnings:
                    warning_section += f"- {warning}\n"
                enhanced_prompt = warning_section + enhanced_prompt
            
            return enhanced_prompt
            
        except Exception as e:
            print(f"❌ Gemini enhancement error: {e}")
            # Fall back to pattern-based
            return self.build_pattern_based_prompt(original_request, analysis, context_matches, warnings)
    
    def build_documentation_prompt(self, original_request: str, analysis: Dict, 
                                 context_matches: List[ContextMatch]) -> str:
        """Build enhanced prompt for documentation requests"""
        prompt_parts = []
        
        prompt_parts.append("# Documentation/Explanation Request")
        prompt_parts.append(f"**Request**: {original_request}")
        prompt_parts.append("")
        
        if self.index:
            prompt_parts.append("## 🏗️ FibreFlow Project Overview")
            prompt_parts.append(f"- **Total Files**: {self.index['total_files']:,}")
            prompt_parts.append(f"- **Services**: {len(self.index.get('services', {}))}")
            prompt_parts.append(f"- **Components**: {len(self.index.get('components', {}))}")
            prompt_parts.append("")
        
        return "\n".join(prompt_parts)
    
    def enhance_prompt(self, user_request: str) -> EnhancedPrompt:
        """Main method to enhance a user prompt with FibreFlow context"""
        start_time = time.time()
        
        print(f"🧠 Analyzing request: {user_request}")
        
        # Analyze the request
        analysis = self.analyze_request(user_request)
        print(f"✓ Intent detected: {analysis['intent']} ({analysis.get('feature_type', 'general')})")
        
        # Find relevant context
        context_matches = self.find_relevant_context(analysis)
        print(f"✓ Found {len(context_matches)} relevant context matches")
        
        # Generate warnings
        warnings = self.generate_warnings(analysis)
        
        # Build enhanced prompt
        enhanced = self.build_enhanced_prompt(user_request, analysis, context_matches, warnings)
        
        # Estimate tokens
        estimated_tokens = len(enhanced) // 4
        processing_time = time.time() - start_time
        
        result = EnhancedPrompt(
            original_request=user_request,
            enhanced_prompt=enhanced,
            context_matches=context_matches,
            patterns_referenced=[m.match_type for m in context_matches if m.match_type == 'pattern'],
            warnings=warnings,
            estimated_tokens=estimated_tokens,
            processing_time=processing_time
        )
        
        print(f"✅ Enhancement complete in {processing_time:.2f}s")
        
        # Show cost savings
        if self.gemini_available:
            print(f"💰 Cost: $0.00 (Free tier: {self.daily_usage.get(self.today, 0)}/50 requests today)")
        
        return result

def main():
    """Test the enhancer"""
    enhancer = FibreFlowPromptEnhancer()
    
    if not enhancer.index:
        print("Please run codebase_scanner.py first")
        return
    
    # Test enhancement
    test_request = "Add invoice management feature to FibreFlow"
    result = enhancer.enhance_prompt(test_request)
    
    print("\n" + "="*60)
    print("Enhanced Prompt:")
    print("="*60)
    print(result.enhanced_prompt)

if __name__ == "__main__":
    main()