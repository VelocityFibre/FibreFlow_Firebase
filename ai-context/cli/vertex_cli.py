#!/usr/bin/env python3
"""
FibreFlow Vertex AI Context Manager CLI
Simple command-line interface for enhancing prompts with FibreFlow context.
"""

import sys
import os
import argparse
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text
import tempfile
import subprocess

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from agents.prompt_enhancer import FibreFlowPromptEnhancer

console = Console()

def main():
    parser = argparse.ArgumentParser(
        description="FibreFlow Vertex AI Context Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  vertex_cli.py enhance "Add invoice management feature"
  vertex_cli.py enhance "Fix pole tracker performance issue"
  vertex_cli.py enhance "Create user permissions system"
  vertex_cli.py enhance -f long_context.txt
  vertex_cli.py enhance --editor
  vertex_cli.py interactive
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Enhance command
    enhance_parser = subparsers.add_parser('enhance', help='Enhance a prompt with FibreFlow context')
    enhance_parser.add_argument('request', nargs='?', help='Your development request')
    enhance_parser.add_argument('--file', '-f', help='Read request from file')
    enhance_parser.add_argument('--editor', '-e', action='store_true', help='Open editor for multi-line input')
    enhance_parser.add_argument('--copy', '-c', action='store_true', help='Copy result to clipboard')
    enhance_parser.add_argument('--output', '-o', help='Save result to file')
    
    # Interactive command
    interactive_parser = subparsers.add_parser('interactive', help='Interactive mode')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show system status')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test with sample requests')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        # Initialize the enhancer
        console.print("[blue]🚀 Initializing FibreFlow Context Manager...[/blue]")
        enhancer = FibreFlowPromptEnhancer()
        
        if not enhancer.index:
            console.print("[red]❌ Codebase index not found.[/red]")
            console.print("[yellow]Run this first: python agents/codebase_scanner.py[/yellow]")
            return
        
        if args.command == 'enhance':
            handle_enhance(enhancer, args)
        elif args.command == 'interactive':
            handle_interactive(enhancer)
        elif args.command == 'status':
            handle_status(enhancer)
        elif args.command == 'test':
            handle_test(enhancer)
    
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")
        if "--debug" in sys.argv:
            raise

def handle_enhance(enhancer, args):
    """Handle single prompt enhancement"""
    
    # Get the request text from various sources
    request_text = None
    
    if args.file:
        # Read from file
        try:
            with open(args.file, 'r') as f:
                request_text = f.read().strip()
            console.print(f"[green]📄 Read request from {args.file}[/green]")
        except Exception as e:
            console.print(f"[red]❌ Error reading file: {e}[/red]")
            return
    
    elif args.editor:
        # Open editor for input
        request_text = get_multiline_input_from_editor()
        if not request_text:
            console.print("[yellow]No input provided[/yellow]")
            return
    
    elif args.request:
        # Use command line argument
        request_text = args.request
    
    else:
        # Get multi-line input from terminal
        console.print("[blue]📝 Enter your request (Ctrl+D when done):[/blue]")
        lines = []
        try:
            while True:
                line = input()
                lines.append(line)
        except EOFError:
            pass
        request_text = '\n'.join(lines).strip()
        
        if not request_text:
            console.print("[yellow]No input provided[/yellow]")
            return
    
    # Show preview of long requests
    if len(request_text) > 200:
        preview = request_text[:200] + "..."
        console.print(f"[green]✨ Enhancing request: {preview}[/green]")
        console.print(f"[dim](Total length: {len(request_text)} characters)[/dim]")
    else:
        console.print(f"[green]✨ Enhancing request: {request_text}[/green]")
    
    # Enhance the prompt
    result = enhancer.enhance_prompt(request_text)
    
    # Display result
    enhancer.display_enhanced_prompt(result)
    
    # Handle output options
    if args.copy:
        try:
            import pyperclip
            pyperclip.copy(result.enhanced_prompt)
            console.print("[green]📋 Copied to clipboard![/green]")
        except ImportError:
            console.print("[yellow]Install pyperclip for clipboard support: pip install pyperclip[/yellow]")
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(result.enhanced_prompt)
        console.print(f"[green]💾 Saved to {args.output}[/green]")

def get_multiline_input_from_editor():
    """Open system editor for multi-line input"""
    editor = os.environ.get('EDITOR', 'nano')  # Default to nano
    
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False) as tf:
        tf.write("# Enter your request below (lines starting with # will be ignored)\n")
        tf.write("# Save and exit when done\n\n")
        tf.flush()
        temp_filename = tf.name
    
    try:
        subprocess.call([editor, temp_filename])
        
        with open(temp_filename, 'r') as f:
            lines = f.readlines()
        
        # Remove comment lines and join
        content = ''.join(line for line in lines if not line.strip().startswith('#'))
        return content.strip()
    
    finally:
        os.unlink(temp_filename)

def handle_interactive(enhancer):
    """Handle interactive mode"""
    console.print(Panel.fit(
        "[bold green]🚀 FibreFlow Interactive Mode[/bold green]\n"
        "Type your development requests and get enhanced prompts!\n"
        "Commands: 'quit', 'status', 'help', 'multiline', 'editor'",
        title="Interactive Mode"
    ))
    
    while True:
        try:
            request = Prompt.ask("\n🎯 [bold blue]Your request[/bold blue]", default="").strip()
            
            if request.lower() in ['quit', 'exit', 'q']:
                console.print("[blue]👋 Goodbye![/blue]")
                break
            
            elif request.lower() == 'status':
                handle_status(enhancer)
                continue
            
            elif request.lower() == 'help':
                show_help()
                continue
            
            elif request.lower() == 'multiline':
                console.print("[blue]📝 Enter multi-line request (Ctrl+D when done):[/blue]")
                lines = []
                try:
                    while True:
                        line = input()
                        lines.append(line)
                except EOFError:
                    pass
                request = '\n'.join(lines).strip()
                
                if not request:
                    continue
            
            elif request.lower() == 'editor':
                request = get_multiline_input_from_editor()
                if not request:
                    continue
            
            elif not request:
                continue
            
            # Show preview for long requests
            if len(request) > 200:
                console.print(f"[dim]Processing {len(request)} character request...[/dim]")
            
            # Enhance the prompt
            result = enhancer.enhance_prompt(request)
            enhancer.display_enhanced_prompt(result)
            
            # Ask about clipboard
            if Prompt.ask("\n📋 Copy to clipboard?", choices=['y', 'n'], default='n') == 'y':
                try:
                    import pyperclip
                    pyperclip.copy(result.enhanced_prompt)
                    console.print("[green]✓ Copied![/green]")
                except ImportError:
                    console.print("[yellow]Install pyperclip for clipboard support[/yellow]")
            
            console.print("\n" + "─" * 60)
        
        except KeyboardInterrupt:
            console.print("\n[blue]👋 Goodbye![/blue]")
            break
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")

def handle_status(enhancer):
    """Show system status"""
    index = enhancer.index
    
    status_info = []
    status_info.append(f"📊 **Codebase**: {index['total_files']:,} files indexed")
    status_info.append(f"🔧 **Services**: {len(index.get('services', {}))}")
    status_info.append(f"🎨 **Components**: {len(index.get('components', {}))}")
    status_info.append(f"📁 **Size**: {index['summary']['total_size_mb']:.1f} MB")
    
    # Pattern summary
    patterns = index.get('patterns', {})
    top_patterns = sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:5]
    status_info.append("")
    status_info.append("🏗️ **Top Patterns**:")
    for pattern, count in top_patterns:
        status_info.append(f"  • {pattern}: {count} files")
    
    # System status
    status_info.append("")
    status_info.append("⚙️ **System Status**:")
    status_info.append(f"  • Vertex AI: {'🔴 Offline' if not enhancer.vertex_available else '🟢 Online'}")
    status_info.append(f"  • Cache: {'🟢 Active' if os.path.exists('cache/codebase_index.json') else '🔴 Missing'}")
    
    console.print(Panel(
        "\n".join(status_info),
        title="🚀 FibreFlow Context Manager Status",
        border_style="blue"
    ))

def handle_test(enhancer):
    """Test with sample requests"""
    test_requests = [
        "Add user management feature",
        "Fix authentication issues", 
        "Create invoice component",
        "Update theme colors",
        "Add data validation"
    ]
    
    console.print("[blue]🧪 Testing with sample requests...[/blue]")
    
    for i, request in enumerate(test_requests, 1):
        console.print(f"\n[yellow]Test {i}/5: {request}[/yellow]")
        
        try:
            result = enhancer.enhance_prompt(request)
            console.print(f"[green]✓ Enhanced ({result.estimated_tokens:,} tokens, {result.processing_time:.2f}s)[/green]")
        except Exception as e:
            console.print(f"[red]✗ Failed: {e}[/red]")
    
    console.print("[green]🎉 All tests completed![/green]")

def show_help():
    """Show help information"""
    help_text = """
🚀 **FibreFlow Context Manager Commands**

**Enhancement Methods:**
• Single line: Type your request directly
• Multi-line: Type 'multiline' then enter text (Ctrl+D to finish)
• Editor: Type 'editor' to open your text editor
• From file: vertex_cli.py enhance -f myrequest.txt

**Example Requests:**
• "Add invoice management feature"
• "Fix pole tracker performance"
• "Create user permissions system"
• "Update authentication flow"
• "Add data validation to forms"
• Long context with background info

**Commands:**
• `multiline` - Enter multi-line request
• `editor` - Open editor for complex requests
• `status` - Show system information
• `help` - Show this help
• `quit` - Exit interactive mode

**Tips:**
• Be specific about what you want to build
• Include any relevant context or constraints
• Mention the feature type (service, component, etc.)
• Ask about existing patterns or similar features
    """
    
    console.print(Panel(help_text, title="Help", border_style="yellow"))

if __name__ == "__main__":
    main()