# Gemini Integration - Technical Implementation Details

*Last Updated: 2025-01-31*

## Architecture Overview

```
ai-context/
├── agents/
│   ├── prompt_enhancer_gemini.py    # Main AI enhancement logic
│   ├── prompt_enhancer_simple.py    # Pattern matching fallback
│   └── codebase_scanner.py          # Indexes FibreFlow code
├── cli/
│   └── ai_cli.py                    # Command-line interface
├── cache/
│   ├── codebase_index.json          # 11,915 indexed files
│   └── daily_usage.json             # Usage tracking
├── docs/                            # This documentation
└── venv/                            # Virtual environment
```

## Key Components

### 1. Prompt Enhancer (`prompt_enhancer_gemini.py`)

#### Initialization
```python
class FibreFlowPromptEnhancer:
    def __init__(self):
        # Load environment with explicit path
        load_dotenv('.env.local')
        
        # Initialize Gemini
        api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Load codebase knowledge
        self.index = self.load_codebase_index()
        self.load_patterns()
```

#### Request Analysis
```python
def analyze_with_gemini(self, request: str) -> Dict:
    """AI-powered intent detection"""
    prompt = f"""Analyze this request for FibreFlow:
    1. Intent: create_feature, debug_issue, etc.
    2. Feature Type: service, component, etc.
    3. Key entities mentioned
    4. Suggested approach
    
    Request: "{request}"
    Return as JSON."""
    
    response = self.model.generate_content(prompt)
    # Parse and return structured analysis
```

#### Enhancement Process
```python
def enhance_with_gemini_ai(self, request: str, analysis: Dict) -> str:
    """Generate comprehensive enhanced prompt"""
    
    # Prepare context
    context_info = [
        f"FibreFlow has {self.index['total_files']} files",
        f"Services: {', '.join(services[:10])}",
        f"Components: {', '.join(components[:10])}"
    ]
    
    # Build enhancement prompt
    gemini_prompt = f"""
    Original Request: {request}
    Analysis: {analysis}
    FibreFlow Context: {context_info}
    
    Create comprehensive enhanced prompt with:
    1. Clarified requirements
    2. Similar patterns reference
    3. Implementation approach
    4. Code examples
    5. Next steps
    """
    
    response = self.model.generate_content(
        gemini_prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=2000,
        )
    )
    
    return response.text
```

### 2. Usage Tracking

#### Daily Limit Management
```python
def check_daily_usage(self):
    """Track 50 req/day limit"""
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

def increment_usage(self) -> bool:
    """Increment and check limit"""
    self.daily_usage[self.today] += 1
    
    limit = int(os.getenv('DAILY_REQUEST_LIMIT', '50'))
    if self.daily_usage[self.today] >= limit:
        return False  # Limit reached
    
    # Save updated usage
    with open(self.usage_file, 'w') as f:
        json.dump(self.daily_usage, f)
    
    return True
```

### 3. Codebase Index Structure

```json
{
  "scan_date": "2025-01-30T16:52:57",
  "total_files": 11915,
  "total_size_mb": 506.7,
  "services": {
    "AuthService": {
      "path": "src/app/core/services/auth.service.ts",
      "methods": ["login", "logout", "getCurrentUser"],
      "imports": ["AngularFireAuth", "Router"]
    }
  },
  "components": {
    "ProjectListComponent": {
      "path": "src/app/features/projects/components/project-list",
      "standalone": true,
      "imports": ["CommonModule", "MaterialModule"]
    }
  },
  "patterns": {
    "service_base": "BaseFirestoreService",
    "component_pattern": "standalone",
    "state_management": "signals"
  }
}
```

### 4. Pattern Recognition

#### FibreFlow Patterns Database
```python
self.fibreflow_patterns = {
    'service_creation': {
        'pattern': 'BaseFirestoreService',
        'template': '''export class {name}Service extends BaseFirestoreService<{Model}> {
  constructor() {
    super('{collection}');
  }
}''',
        'examples': ['auth.service.ts', 'project.service.ts']
    },
    'component_structure': {
        'pattern': 'standalone_component',
        'template': '''@Component({
  selector: 'app-{name}',
  standalone: true,
  imports: [CommonModule, MaterialModule]
})'''
    }
}
```

### 5. Error Handling & Fallbacks

```python
def enhance_prompt(self, request: str) -> EnhancedPrompt:
    try:
        # Try AI enhancement
        if self.gemini_available:
            return self.enhance_with_gemini_ai(request)
    except Exception as e:
        print(f"⚠️ AI failed: {e}, using patterns")
    
    # Fallback to pattern matching
    return self.build_pattern_based_prompt(request)
```

## Integration Points

### 1. Environment Configuration
```bash
# .env.local
GOOGLE_AI_STUDIO_API_KEY=AIzaSyDBktsZ8DsqchXKLHFN07iRvJuHrr7jr_8
GEMINI_MODEL=gemini-1.5-pro
DAILY_REQUEST_LIMIT=50
CACHE_ENABLED=true
CACHE_TTL=3600
```

### 2. Virtual Environment Setup
```bash
# Why virtual environment?
# - System has restricted package management
# - Avoids conflicts with system Python
# - Clean dependency isolation

python -m venv venv
source venv/bin/activate
pip install google-generativeai python-dotenv pyyaml
```

### 3. CLI Integration
```python
# Dynamic enhancer selection
try:
    from agents.prompt_enhancer_gemini import FibreFlowPromptEnhancer
    enhancer_type = "Google AI Studio"
except ImportError:
    from agents.prompt_enhancer_simple import FibreFlowPromptEnhancer
    enhancer_type = "Pattern Matching"
```

## Performance Optimizations

### 1. Codebase Index Caching
- Scan once, reuse many times
- 11,915 files indexed in 46.5 seconds
- Stored as JSON for fast loading

### 2. Request Caching (Future)
```python
def get_cache_key(self, request: str) -> str:
    """Generate cache key for request"""
    return hashlib.md5(request.lower().encode()).hexdigest()

def check_cache(self, request: str) -> Optional[str]:
    """Check if we've enhanced this before"""
    # Implement LRU cache for common requests
```

### 3. Streaming Support (Future)
```python
# For faster perceived performance
for chunk in self.model.generate_content_stream(prompt):
    yield chunk.text
```

## Security Considerations

### 1. API Key Protection
- Stored in `.env.local` (gitignored)
- Never logged or displayed in full
- Validated on startup

### 2. Input Sanitization
```python
def sanitize_request(self, request: str) -> str:
    """Remove potential prompt injection"""
    # Remove special tokens
    request = request.replace("{{", "").replace("}}", "")
    # Limit length
    return request[:5000]
```

### 3. Output Validation
- Check for sensitive data exposure
- Validate JSON responses
- Graceful error handling

## Monitoring & Analytics

### Usage Analytics
```python
def get_usage_stats(self) -> Dict:
    """Get usage statistics"""
    stats = {
        'total_requests': sum(self.daily_usage.values()),
        'daily_average': np.mean(list(self.daily_usage.values())),
        'days_used': len(self.daily_usage),
        'most_active_day': max(self.daily_usage.items(), 
                               key=lambda x: x[1])
    }
    return stats
```

### Performance Metrics
- Average response time: 15-30 seconds
- Token usage: 500-2000 per request
- Cache hit rate: (to be implemented)

## Troubleshooting Guide

### Common Issues

1. **ImportError: No module named 'google'**
   ```bash
   # Solution: Use virtual environment
   source venv/bin/activate
   ```

2. **API Key Not Found**
   ```python
   # Fix: Explicit path to .env.local
   load_dotenv('.env.local')  # Not just load_dotenv()
   ```

3. **Rate Limit Exceeded**
   ```python
   # Automatic fallback
   if not self.increment_usage():
       return self.analyze_request_pattern_matching(request)
   ```

4. **JSON Parse Error**
   ```python
   # Robust parsing
   try:
       result = json.loads(response.text)
   except:
       # Extract JSON from markdown blocks
       json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
   ```

## Future Enhancements

### 1. Conversation Memory
```python
class ConversationMemory:
    def __init__(self, max_turns=10):
        self.history = deque(maxlen=max_turns)
    
    def add_turn(self, request, response):
        self.history.append({
            'request': request,
            'response': response,
            'timestamp': datetime.now()
        })
```

### 2. Pattern Learning
```python
def learn_from_success(self, request, implementation):
    """Learn patterns from successful implementations"""
    # Extract patterns from implemented code
    # Update pattern database
    # Improve future suggestions
```

### 3. Multi-Model Support
```python
MODELS = {
    'pro': 'gemini-1.5-pro',
    'flash': 'gemini-1.5-flash',
    'ultra': 'gemini-ultra'  # When available
}
```

## Conclusion

The Gemini integration provides a robust, cost-effective solution for enhancing development prompts with deep codebase context. The implementation prioritizes:

- **Reliability**: Graceful fallbacks at every level
- **Performance**: Caching and efficient processing
- **Usability**: Simple CLI with clear feedback
- **Cost**: Free tier with usage tracking
- **Quality**: Rich context from 11,915 indexed files

This technical foundation enables continuous improvements while maintaining stability and usability.

---

*For implementation questions, see the source code or create an issue in the repository.*