#!/usr/bin/env python3
"""
FibreFlow Prompt Enhancement Engine
Takes user requests and enhances them with comprehensive FibreFlow codebase context.
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
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

# Load environment variables
load_dotenv()

console = Console()

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
    """Enhances user prompts with FibreFlow codebase context"""
    
    def __init__(self):
        self.config = self.load_config()
        self.index = self.load_codebase_index()
        
        # Initialize Vertex AI (when ready)
        self.vertex_available = False
        try:
            self.init_vertex_ai()
            self.vertex_available = True
        except Exception as e:
            console.print(f"[yellow]Vertex AI not available: {e}[/yellow]")
            console.print("[blue]Running in offline mode with pattern matching[/blue]")
        
        # Load FibreFlow knowledge
        self.load_patterns()
        self.load_decision_history()
    
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
            'vertex_ai': {
                'model': 'gemini-1.5-pro-preview-0409',
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
            console.print("[red]❌ Codebase index not found. Run codebase_scanner.py first.[/red]")
            return None
    
    def init_vertex_ai(self):
        """Initialize Vertex AI connection"""
        from google.cloud import aiplatform
        
        project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'fibreflow-73daf')
        location = os.getenv('VERTEX_AI_LOCATION', 'us-central1')
        
        aiplatform.init(project=project_id, location=location)
        
        # Test connection
        from vertexai.language_models import TextGenerationModel
        self.vertex_model = TextGenerationModel.from_pretrained("text-bison@002")
        
        console.print("[green]✓ Vertex AI connected successfully[/green]")
    
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
            },
            'firebase_integration': {
                'pattern': 'firebase_imports',
                'template': '''import { collection, addDoc, query, where } from '@angular/fire/firestore';

// In service:
create(item: Item): Observable<string> {
  return from(addDoc(this.collection, item).then(doc => doc.id));
}''',
                'examples': ['auth.service.ts', 'project.service.ts'],
                'description': 'Use AngularFire v7+ modular imports, not deprecated AngularFirestore'
            },
            'signals_usage': {
                'pattern': 'signals_usage',
                'template': '''// State management with signals
private items = signal<Item[]>([]);
public items$ = this.items.asReadonly();

// Computed values
public totalItems = computed(() => this.items().length);''',
                'examples': ['project.service.ts', 'theme.service.ts'],
                'description': 'Use Angular signals for reactive state, not BehaviorSubject'
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
    
    def analyze_request(self, request: str) -> Dict[str, any]:
        """Analyze the user request to understand intent"""
        
        # Use Vertex AI if available
        if self.vertex_available:
            return self.analyze_with_vertex_ai(request)
        
        # Fallback to pattern matching
        request_lower = request.lower()
        
        analysis = {
            'intent': 'unknown',
            'feature_type': None,
            'keywords': [],
            'similar_features': [],
            'complexity': 'medium'
        }
        
        # Detect intent
        if any(word in request_lower for word in ['create', 'add', 'new', 'build', 'implement']):
            analysis['intent'] = 'create_feature'
        elif any(word in request_lower for word in ['fix', 'debug', 'error', 'issue', 'problem']):
            analysis['intent'] = 'debug_issue'
        elif any(word in request_lower for word in ['update', 'modify', 'change', 'edit']):
            analysis['intent'] = 'modify_feature'
        elif any(word in request_lower for word in ['explain', 'understand', 'how', 'why']):
            analysis['intent'] = 'explain_code'
        
        # Detect feature type
        if any(word in request_lower for word in ['service', 'api', 'backend']):
            analysis['feature_type'] = 'service'
        elif any(word in request_lower for word in ['component', 'page', 'ui', 'form']):
            analysis['feature_type'] = 'component'
        elif any(word in request_lower for word in ['style', 'theme', 'css', 'design']):
            analysis['feature_type'] = 'styling'
        elif any(word in request_lower for word in ['route', 'navigation', 'routing']):
            analysis['feature_type'] = 'routing'
        
        # Extract keywords
        keywords = re.findall(r'\b[a-zA-Z]{3,}\b', request_lower)
        analysis['keywords'] = [k for k in keywords if k not in ['the', 'and', 'for', 'with', 'that', 'this']]
        
        # Find similar features in codebase
        if self.index:
            for keyword in analysis['keywords']:
                for service_name in self.index.get('services', {}):
                    if keyword in service_name.lower():
                        analysis['similar_features'].append(f"service: {service_name}")
                
                for component_name in self.index.get('components', {}):
                    if keyword in component_name.lower():
                        analysis['similar_features'].append(f"component: {component_name}")
        
        return analysis
    
    def analyze_with_vertex_ai(self, request: str) -> Dict[str, any]:
        """Use Vertex AI to deeply understand the request"""
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
   - other: Something else

2. Feature Type (if applicable):
   - service: Backend service or API
   - component: UI component or page
   - documentation: Docs, guides, or explanations
   - infrastructure: Database, deployment, etc.
   - other: Something else

3. Key entities mentioned (services, components, technologies)

4. Suggested approach

Return as JSON with keys: intent, feature_type, keywords, entities, approach
"""
            
            response = self.vertex_model.predict(
                prompt,
                temperature=0.3,
                max_output_tokens=500,
            )
            
            # Parse the response
            import json
            try:
                result = json.loads(response.text)
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
            console.print(f"[yellow]Vertex AI analysis failed: {e}, using pattern matching[/yellow]")
            # Fallback to pattern matching
            return self.analyze_request_pattern_matching(request)
    
    def analyze_request_pattern_matching(self, request: str) -> Dict[str, any]:
        """Original pattern matching logic"""
        request_lower = request.lower()
        
        analysis = {
            'intent': 'unknown',
            'feature_type': None,
            'keywords': [],
            'similar_features': [],
            'complexity': 'medium'
        }
        
        # Detect intent - improved for documentation
        if any(word in request_lower for word in ['document', 'documentation', 'docs', 'guide', 'readme']):
            analysis['intent'] = 'create_documentation'
        elif any(word in request_lower for word in ['prompt', 'generate prompt', 'create prompt for']):
            analysis['intent'] = 'create_prompt'
        elif any(word in request_lower for word in ['create', 'add', 'new', 'build', 'implement']):
            analysis['intent'] = 'create_feature'
        elif any(word in request_lower for word in ['fix', 'debug', 'error', 'issue', 'problem']):
            analysis['intent'] = 'debug_issue'
        elif any(word in request_lower for word in ['update', 'modify', 'change', 'edit']):
            analysis['intent'] = 'modify_feature'
        elif any(word in request_lower for word in ['explain', 'understand', 'how', 'why']):
            analysis['intent'] = 'explain_code'
        
        # Detect feature type
        if any(word in request_lower for word in ['service', 'api', 'backend']):
            analysis['feature_type'] = 'service'
        elif any(word in request_lower for word in ['component', 'page', 'ui', 'form']):
            analysis['feature_type'] = 'component'
        elif any(word in request_lower for word in ['style', 'theme', 'css', 'design']):
            analysis['feature_type'] = 'styling'
        elif any(word in request_lower for word in ['route', 'navigation', 'routing']):
            analysis['feature_type'] = 'routing'
        elif any(word in request_lower for word in ['document', 'docs', 'guide']):
            analysis['feature_type'] = 'documentation'
        
        # Extract keywords
        keywords = re.findall(r'\b[a-zA-Z]{3,}\b', request_lower)
        analysis['keywords'] = [k for k in keywords if k not in ['the', 'and', 'for', 'with', 'that', 'this']]
        
        # Find similar features in codebase
        if self.index:
            for keyword in analysis['keywords']:
                for service_name in self.index.get('services', {}):
                    if keyword in service_name.lower():
                        analysis['similar_features'].append(f"service: {service_name}")
                
                for component_name in self.index.get('components', {}):
                    if keyword in component_name.lower():
                        analysis['similar_features'].append(f"component: {component_name}")
        
        return analysis
    
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
        
        # Find similar services/components
        for similar in analysis.get('similar_features', [])[:5]:
            if similar.startswith('service:'):
                service_name = similar.replace('service: ', '')
                service_files = self.index.get('services', {}).get(service_name, [])
                for file_path in service_files[:2]:  # Max 2 files per service
                    matches.append(ContextMatch(
                        file_path=file_path,
                        relevance_score=0.7,
                        match_type="similar_service",
                        code_snippet=self.get_code_snippet(file_path),
                        explanation=f"Similar service implementation: {service_name}"
                    ))
            
            elif similar.startswith('component:'):
                component_name = similar.replace('component: ', '')
                component_files = self.index.get('components', {}).get(component_name, [])
                for file_path in component_files[:2]:  # Max 2 files per component
                    matches.append(ContextMatch(
                        file_path=file_path,
                        relevance_score=0.7,
                        match_type="similar_component",
                        code_snippet=self.get_code_snippet(file_path),
                        explanation=f"Similar component implementation: {component_name}"
                    ))
        
        # Add relevant patterns based on keywords
        keywords = analysis.get('keywords', [])
        for keyword in keywords:
            if keyword in ['form', 'validation']:
                matches.append(ContextMatch(
                    file_path="reactive_forms_pattern",
                    relevance_score=0.8,
                    match_type="pattern",
                    code_snippet="form = this.fb.group({ field: ['', [Validators.required]] });",
                    explanation="Always use ReactiveFormsModule with validation"
                ))
            
            elif keyword in ['auth', 'login', 'permission']:
                matches.append(ContextMatch(
                    file_path="auth_pattern",
                    relevance_score=0.8,
                    match_type="pattern",
                    code_snippet="private auth = inject(AuthService); // Use auth.service.ts",
                    explanation="Use existing AuthService, don't create new auth logic"
                ))
        
        # Sort by relevance and return top matches
        matches.sort(key=lambda x: x.relevance_score, reverse=True)
        return matches[:max_files]
    
    def get_code_snippet(self, file_path: str, max_lines: int = 15) -> str:
        """Extract a relevant code snippet from a file"""
        try:
            full_path = os.path.join(self.config['project']['root'], file_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # For services, find the class definition
            if 'service' in file_path:
                for i, line in enumerate(lines):
                    if 'export class' in line and 'Service' in line:
                        return ''.join(lines[i:i+max_lines])
            
            # For components, find the @Component decorator
            elif 'component' in file_path:
                for i, line in enumerate(lines):
                    if '@Component' in line:
                        return ''.join(lines[i:i+max_lines])
            
            # Default: return first meaningful lines
            return ''.join(lines[:max_lines])
            
        except Exception:
            return f"// Code from {file_path} (could not read file)"
    
    def generate_warnings(self, analysis: Dict) -> List[str]:
        """Generate warnings about common mistakes"""
        warnings = []
        request_lower = analysis.get('keywords', [])
        
        # Check for common antipatterns
        if any(word in request_lower for word in ['ngmodule', 'module']):
            warnings.append("⚠️ Avoid NgModules - FibreFlow uses standalone components")
        
        if any(word in request_lower for word in ['constructor', 'inject']):
            warnings.append("💡 Use inject() pattern instead of constructor injection")
        
        if any(word in request_lower for word in ['behaviorsubject', 'subject']):
            warnings.append("🔄 Consider using Angular signals instead of BehaviorSubject")
        
        if any(word in request_lower for word in ['color', 'style', 'css']):
            warnings.append("🎨 Use theme functions (ff-rgb, ff-spacing) instead of hardcoded values")
        
        if any(word in request_lower for word in ['route', 'routing']):
            warnings.append("🛣️ Use simple routes in app.routes.ts - avoid nested lazy routes")
        
        return warnings
    
    def build_enhanced_prompt(self, original_request: str, analysis: Dict, 
                            context_matches: List[ContextMatch], warnings: List[str]) -> str:
        """Build the final enhanced prompt"""
        
        # Check if this is a documentation or prompt creation request
        if analysis['intent'] in ['create_documentation', 'create_prompt', 'explain_code']:
            return self.build_documentation_prompt(original_request, analysis, context_matches)
        
        # Original implementation for feature requests
        prompt_parts = []
        
        # Header
        prompt_parts.append("# Enhanced FibreFlow Development Request")
        prompt_parts.append(f"**Original Request**: {original_request}")
        prompt_parts.append("")
        
        # Context section
        if context_matches:
            prompt_parts.append("## 🧠 FibreFlow Context")
            prompt_parts.append("Based on the complete FibreFlow codebase analysis:")
            prompt_parts.append("")
            
            # Group by match type
            patterns = [m for m in context_matches if m.match_type == 'pattern']
            examples = [m for m in context_matches if 'similar' in m.match_type]
            
            if patterns:
                prompt_parts.append("### 📋 Required Patterns")
                for pattern in patterns:
                    prompt_parts.append(f"**{pattern.explanation}**")
                    prompt_parts.append("```typescript")
                    prompt_parts.append(pattern.code_snippet)
                    prompt_parts.append("```")
                    prompt_parts.append("")
            
            if examples:
                prompt_parts.append("### 🔍 Similar Implementations")
                for example in examples[:3]:  # Limit to top 3
                    prompt_parts.append(f"**{example.explanation}** (`{example.file_path}`)")
                    prompt_parts.append("```typescript")
                    prompt_parts.append(example.code_snippet)
                    prompt_parts.append("```")
                    prompt_parts.append("")
        
        # Warnings section
        if warnings:
            prompt_parts.append("## ⚠️ Important Guidelines")
            for warning in warnings:
                prompt_parts.append(f"- {warning}")
            prompt_parts.append("")
        
        # FibreFlow specific requirements
        prompt_parts.append("## 🎯 FibreFlow Requirements")
        prompt_parts.append("**MUST follow these patterns:**")
        prompt_parts.append("- ✅ Use `standalone: true` for all components")
        prompt_parts.append("- ✅ Use `inject()` pattern instead of constructor injection")
        prompt_parts.append("- ✅ Extend `BaseFirestoreService<T>` for all services")
        prompt_parts.append("- ✅ Use theme functions: `ff-rgb()`, `ff-spacing()`, `ff-var()`")
        prompt_parts.append("- ✅ Import specific Angular Material modules, not full MaterialModule")
        prompt_parts.append("- ✅ Use Angular signals for state management")
        prompt_parts.append("- ✅ Include TypeScript return types on all methods")
        prompt_parts.append("- ✅ Follow existing naming conventions")
        prompt_parts.append("")
        
        # Architecture context
        prompt_parts.append("## 🏗️ Architecture Context")
        prompt_parts.append(f"FibreFlow has {self.index['total_files'] if self.index else 'many'} files with:")
        if self.index:
            prompt_parts.append(f"- **{len(self.index.get('services', {}))} services** following BaseFirestoreService pattern")
            prompt_parts.append(f"- **{len(self.index.get('components', {}))} components** using standalone architecture")
            prompt_parts.append(f"- **{self.index['patterns'].get('signals_usage', 0)} files** using Angular signals")
            prompt_parts.append(f"- **{self.index['patterns'].get('firebase_imports', 0)} files** integrating Firebase")
        prompt_parts.append("")
        
        # Final instruction
        prompt_parts.append("## 🚀 Implementation Request")
        prompt_parts.append(f"Now please implement: **{original_request}**")
        prompt_parts.append("")
        prompt_parts.append("Follow the patterns and examples above. If you need clarification on any FibreFlow-specific pattern, ask for details about the specific service or component mentioned above.")
        
        return "\n".join(prompt_parts)
    
    def build_documentation_prompt(self, original_request: str, analysis: Dict, 
                                 context_matches: List[ContextMatch]) -> str:
        """Build enhanced prompt for documentation requests"""
        
        prompt_parts = []
        
        # Header for documentation
        prompt_parts.append("# Documentation/Explanation Request")
        prompt_parts.append(f"**Request**: {original_request}")
        prompt_parts.append("")
        
        # Include AI insights if available
        if 'ai_insights' in analysis and analysis['ai_insights']:
            prompt_parts.append("## 🤖 AI Analysis")
            prompt_parts.append(analysis['ai_insights'])
            prompt_parts.append("")
        
        # Context about what was found
        if context_matches:
            prompt_parts.append("## 📚 Relevant Context Found")
            for match in context_matches[:5]:  # Show top 5 matches
                prompt_parts.append(f"- **{match.explanation}** in `{match.file_path}`")
            prompt_parts.append("")
        
        # Project overview for documentation
        prompt_parts.append("## 🏗️ FibreFlow Project Overview")
        if self.index:
            prompt_parts.append(f"- **Total Files**: {self.index['total_files']:,}")
            prompt_parts.append(f"- **Services**: {len(self.index.get('services', {}))}")
            prompt_parts.append(f"- **Components**: {len(self.index.get('components', {}))}")
            prompt_parts.append(f"- **Tech Stack**: Angular 20, Firebase, TypeScript, Material Design")
            prompt_parts.append(f"- **Architecture**: Standalone components, signals, BaseFirestoreService pattern")
        prompt_parts.append("")
        
        # Keywords and entities
        if analysis['keywords']:
            prompt_parts.append("## 🔑 Key Terms Identified")
            prompt_parts.append(", ".join(analysis['keywords'][:10]))
            prompt_parts.append("")
        
        # Documentation guidelines
        if analysis['intent'] == 'create_documentation':
            prompt_parts.append("## 📝 Documentation Guidelines")
            prompt_parts.append("- Use clear, concise language")
            prompt_parts.append("- Include code examples where relevant")
            prompt_parts.append("- Structure with proper headings")
            prompt_parts.append("- Add practical usage examples")
            prompt_parts.append("- Consider the target audience")
            prompt_parts.append("")
        
        # Final instruction
        prompt_parts.append("## 🎯 Task")
        if analysis['intent'] == 'create_prompt':
            prompt_parts.append("Please create a well-structured prompt based on the request above.")
        elif analysis['intent'] == 'create_documentation':
            prompt_parts.append("Please create clear documentation based on the request above.")
        else:
            prompt_parts.append("Please provide a detailed explanation based on the request above.")
        
        return "\n".join(prompt_parts)
    
    def enhance_prompt(self, user_request: str) -> EnhancedPrompt:
        """Main method to enhance a user prompt with FibreFlow context"""
        start_time = time.time()
        
        console.print(f"[blue]🧠 Analyzing request: {user_request}[/blue]")
        
        # Analyze the request
        analysis = self.analyze_request(user_request)
        console.print(f"[green]✓ Intent detected: {analysis['intent']} ({analysis['feature_type'] or 'general'})[/green]")
        
        # Find relevant context
        context_matches = self.find_relevant_context(analysis)
        console.print(f"[green]✓ Found {len(context_matches)} relevant context matches[/green]")
        
        # Generate warnings
        warnings = self.generate_warnings(analysis)
        if warnings:
            console.print(f"[yellow]⚠️ Generated {len(warnings)} warnings[/yellow]")
        
        # Build enhanced prompt
        enhanced = self.build_enhanced_prompt(user_request, analysis, context_matches, warnings)
        
        # Estimate tokens (rough: 4 chars per token)
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
        
        console.print(f"[green]✅ Enhancement complete in {processing_time:.2f}s ({estimated_tokens:,} tokens)[/green]")
        
        return result
    
    def display_enhanced_prompt(self, result: EnhancedPrompt):
        """Display the enhanced prompt in a nice format"""
        console.print("\n" + "="*80)
        console.print(Panel.fit(
            f"[bold green]Enhanced Prompt Ready![/bold green]\n"
            f"Original: {result.original_request}\n"
            f"Tokens: {result.estimated_tokens:,} | Processing: {result.processing_time:.2f}s\n"
            f"Context matches: {len(result.context_matches)} | Warnings: {len(result.warnings)}",
            title="🚀 FibreFlow Context Manager"
        ))
        
        console.print("\n[bold blue]📋 Enhanced Prompt for Claude Code:[/bold blue]")
        console.print(Panel(result.enhanced_prompt, border_style="blue"))

def main():
    """CLI interface for testing the prompt enhancer"""
    enhancer = FibreFlowPromptEnhancer()
    
    if not enhancer.index:
        console.print("[red]❌ Please run codebase_scanner.py first to create the index[/red]")
        return
    
    console.print("[bold green]🚀 FibreFlow Prompt Enhancer Ready![/bold green]")
    console.print("Type your request, or 'quit' to exit\n")
    
    while True:
        try:
            user_input = input("🎯 Your request: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            
            if not user_input:
                continue
            
            # Enhance the prompt
            result = enhancer.enhance_prompt(user_input)
            
            # Display result
            enhancer.display_enhanced_prompt(result)
            
            # Ask if user wants to copy to clipboard
            try:
                copy = input("\n📋 Copy enhanced prompt to clipboard? (y/n): ").strip().lower()
                if copy == 'y':
                    import pyperclip
                    pyperclip.copy(result.enhanced_prompt)
                    console.print("[green]✓ Copied to clipboard![/green]")
            except ImportError:
                console.print("[yellow]Install pyperclip for clipboard support: pip install pyperclip[/yellow]")
            
            print("\n" + "-"*80 + "\n")
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
    
    console.print("\n[blue]Thanks for using FibreFlow Prompt Enhancer! 🚀[/blue]")

if __name__ == "__main__":
    main()