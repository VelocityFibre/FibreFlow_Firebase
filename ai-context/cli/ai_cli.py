#!/usr/bin/env python3
"""
FibreFlow AI Context Manager CLI
Enhances prompts with comprehensive codebase context using AI
"""

import sys
import os
import argparse
from pathlib import Path
import tempfile
import subprocess

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Try to import the appropriate enhancer
enhancer_type = None
try:
    # First try Google AI Studio (cheaper!)
    from agents.prompt_enhancer_gemini import FibreFlowPromptEnhancer
    enhancer_type = "Google AI Studio"
except ImportError:
    try:
        # Fall back to Vertex AI
        from agents.prompt_enhancer import FibreFlowPromptEnhancer
        enhancer_type = "Vertex AI"
    except ImportError:
        try:
            # Fall back to simple pattern-based enhancer
            from agents.prompt_enhancer_simple import FibreFlowPromptEnhancer
            enhancer_type = "Pattern Matching (No AI)"
        except ImportError:
            print("❌ No prompt enhancer found. Please run setup.")
            sys.exit(1)

# Simple console printing (no rich dependency)
def print_panel(title, content):
    width = 60
    print("=" * width)
    print(f" {title} ".center(width, "="))
    print("=" * width)
    print(content)
    print("=" * width)

def main():
    parser = argparse.ArgumentParser(
        description="FibreFlow Context Manager - Enhance prompts with codebase context",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  ai enhance "Add invoice management feature"
  ai enhance "Fix pole tracker performance issue"
  ai enhance -f request.txt
  ai enhance --editor
  ai cost    # Show cost analysis
  ai status  # Show system status
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Enhance command
    enhance_parser = subparsers.add_parser('enhance', help='Enhance a prompt with FibreFlow context')
    enhance_parser.add_argument('request', nargs='?', help='Your development request')
    enhance_parser.add_argument('--file', '-f', help='Read request from file')
    enhance_parser.add_argument('--editor', '-e', action='store_true', help='Open editor for multi-line input')
    enhance_parser.add_argument('--output', '-o', help='Save result to file')
    enhance_parser.add_argument('--model', '-m', choices=['pro', 'flash'], default='pro', 
                              help='Model to use (pro=Gemini 1.5 Pro, flash=Gemini 1.5 Flash)')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show system status')
    
    # Cost command
    cost_parser = subparsers.add_parser('cost', help='Show cost analysis')
    
    # Setup command
    setup_parser = subparsers.add_parser('setup', help='Setup Google AI Studio')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        print(f"\n💡 Currently using: {enhancer_type}")
        if enhancer_type == "Vertex AI":
            print("   Consider switching to Google AI Studio for 90% cost savings!")
            print("   Run: ai setup")
        return
    
    if args.command == 'setup':
        handle_setup()
        return
    
    if args.command == 'cost':
        handle_cost()
        return
    
    try:
        # Initialize the enhancer
        print(f"🚀 Initializing FibreFlow Context Manager ({enhancer_type})...")
        enhancer = FibreFlowPromptEnhancer()
        
        if not enhancer.index:
            print("❌ Codebase index not found.")
            print("   Run: python agents/codebase_scanner.py")
            return
        
        if args.command == 'enhance':
            handle_enhance(enhancer, args)
        elif args.command == 'status':
            handle_status(enhancer)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        if "--debug" in sys.argv:
            raise

def handle_enhance(enhancer, args):
    """Handle single prompt enhancement"""
    
    # Get the request text
    request_text = None
    
    if args.file:
        try:
            with open(args.file, 'r') as f:
                request_text = f.read().strip()
            print(f"📄 Read request from {args.file}")
        except Exception as e:
            print(f"❌ Error reading file: {e}")
            return
    
    elif args.editor:
        request_text = get_multiline_input_from_editor()
        if not request_text:
            print("No input provided")
            return
    
    elif args.request:
        request_text = args.request
    
    else:
        print("📝 Enter your request (Ctrl+D when done):")
        lines = []
        try:
            while True:
                line = input()
                lines.append(line)
        except EOFError:
            pass
        request_text = '\n'.join(lines).strip()
        
        if not request_text:
            print("No input provided")
            return
    
    # Set model if using Google AI Studio
    if hasattr(enhancer, 'model_name'):
        if args.model == 'flash':
            enhancer.model_name = 'gemini-1.5-flash'
            print("⚡ Using Gemini 1.5 Flash (faster, cheaper)")
        else:
            enhancer.model_name = 'gemini-1.5-pro'
            print("🧠 Using Gemini 1.5 Pro (best quality)")
    
    # Show preview
    if len(request_text) > 200:
        preview = request_text[:200] + "..."
        print(f"\n✨ Enhancing request: {preview}")
        print(f"   (Total: {len(request_text)} characters)")
    else:
        print(f"\n✨ Enhancing request: {request_text}")
    
    # Enhance the prompt
    result = enhancer.enhance_prompt(request_text)
    
    # Display result
    print("\n" + "="*60)
    print("📋 Enhanced Prompt:")
    print("="*60)
    print(result.enhanced_prompt)
    print("="*60)
    print(f"\n📊 Stats: {result.estimated_tokens:,} tokens | {result.processing_time:.2f}s")
    
    # Save if requested
    if args.output:
        with open(args.output, 'w') as f:
            f.write(result.enhanced_prompt)
        print(f"💾 Saved to {args.output}")
    
    # Show cost info if using Google AI Studio
    if enhancer_type == "Google AI Studio" and hasattr(enhancer, 'daily_usage'):
        usage = enhancer.daily_usage.get(enhancer.today, 0)
        print(f"\n💰 Free tier usage: {usage}/50 requests today")

def get_multiline_input_from_editor():
    """Open system editor for multi-line input"""
    editor = os.environ.get('EDITOR', 'nano')
    
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False) as tf:
        tf.write("# Enter your request below (lines starting with # will be ignored)\n")
        tf.write("# Save and exit when done\n\n")
        tf.flush()
        temp_filename = tf.name
    
    try:
        subprocess.call([editor, temp_filename])
        
        with open(temp_filename, 'r') as f:
            lines = f.readlines()
        
        content = ''.join(line for line in lines if not line.strip().startswith('#'))
        return content.strip()
    
    finally:
        os.unlink(temp_filename)

def handle_status(enhancer):
    """Show system status"""
    if not enhancer.index:
        print("❌ No codebase index found")
        return
    
    index = enhancer.index
    
    print_panel("FibreFlow Context Manager Status", f"""
📊 Codebase: {index['total_files']:,} files indexed
🔧 Services: {len(index.get('services', {}))}
🎨 Components: {len(index.get('components', {}))}
📁 Size: {index['summary']['total_size_mb']:.1f} MB

⚙️  System Status:
• Provider: {enhancer_type}
• Model: {getattr(enhancer, 'model_name', 'Default')}
• Cache: {'Active' if os.path.exists('cache/codebase_index.json') else 'Missing'}
    """)
    
    if enhancer_type == "Google AI Studio" and hasattr(enhancer, 'daily_usage'):
        usage = enhancer.daily_usage.get(enhancer.today, 0)
        print(f"\n💰 Free tier usage: {usage}/50 requests today")

def handle_cost():
    """Show cost analysis"""
    print_panel("Cost Comparison", """
┌─────────────────┬───────────────┬──────────────┬─────────────┐
│ Provider        │ Setup         │ Per Request  │ Monthly Est │
├─────────────────┼───────────────┼──────────────┼─────────────┤
│ Vertex AI       │ Complex       │ $0.05-0.20   │ $40-80      │
│ AI Studio Free  │ Simple        │ $0.00        │ $0          │
│ AI Studio Paid  │ Simple        │ $0.001-0.01  │ $2-10       │
└─────────────────┴───────────────┴──────────────┴─────────────┘

Google AI Studio Free Tier:
• 50 requests/day with full 1M token context
• Same Gemini 1.5 Pro/Flash models
• No credit card required
• Perfect for development

To switch: Run 'ai setup'
    """)

def handle_setup():
    """Setup Google AI Studio"""
    print_panel("Setup Google AI Studio", """
Follow these steps:

1. Get your API key:
   • Visit: https://aistudio.google.com/app/apikey
   • Click "Create API key"
   • Copy the key

2. Run the setup script:
   cd /home/ldp/VF/Apps/FibreFlow/ai-context
   python scripts/setup_google_ai_studio.py

3. Test your setup:
   ai enhance "test request"

Benefits:
• 50 free requests/day (worth ~$175 on Vertex AI)
• Same powerful Gemini models
• 90% cost reduction
• Simpler setup
    """)

if __name__ == "__main__":
    main()