#!/usr/bin/env python3
"""
FibreFlow Codebase Scanner
Scans and indexes the entire FibreFlow codebase for Vertex AI context management.
"""

import os
import json
import time
import hashlib
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Set
import fnmatch
import yaml
from rich.console import Console
from rich.progress import Progress, BarColumn, TextColumn

console = Console()

@dataclass
class CodeFile:
    """Represents a scanned code file"""
    path: str
    type: str  # 'component', 'service', 'model', 'config', 'template'
    size: int
    last_modified: float
    hash: str
    exports: List[str]
    imports: List[str]
    functions: List[str]
    classes: List[str]
    interfaces: List[str]
    content_preview: str  # First 500 chars
    patterns: List[str]  # Detected FibreFlow patterns

@dataclass
class CodebaseIndex:
    """Main index structure"""
    timestamp: float
    total_files: int
    fibreflow_root: str
    files: Dict[str, CodeFile]
    services: Dict[str, List[str]]  # service_name -> file paths
    components: Dict[str, List[str]]  # component_name -> file paths
    patterns: Dict[str, int]  # pattern -> count
    summary: Dict[str, any]

class FibreFlowCodebaseScanner:
    """Scans FibreFlow codebase and creates searchable index"""
    
    def __init__(self, config_path: str = "config/vertex_config.yaml"):
        self.config = self.load_config(config_path)
        self.fibreflow_root = self.config['project']['root']
        self.include_patterns = self.config['codebase']['include_patterns']
        self.exclude_patterns = self.config['codebase']['exclude_patterns']
        
        # FibreFlow specific patterns to detect
        self.fibreflow_patterns = {
            'BaseFirestoreService': r'extends\s+BaseFirestoreService',
            'standalone_component': r'standalone:\s*true',
            'inject_pattern': r'inject\(',
            'signals_usage': r'signal\s*\(',
            'ff_theme_functions': r'ff-rgb\(|ff-rgba\(|ff-spacing\(',
            'firebase_imports': r'@angular/fire',
            'material_imports': r'@angular/material',
            'claude_comments': r'\/\*\*.*@claude.*\*\/',
        }
    
    def load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            # Default config if file not found
            return {
                'project': {'root': '/home/ldp/VF/Apps/FibreFlow'},
                'codebase': {
                    'include_patterns': ['**/*.ts', '**/*.html', '**/*.scss', '**/*.json', '**/CLAUDE.md'],
                    'exclude_patterns': ['**/node_modules/**', '**/dist/**', '**/.angular/**', '**/*.spec.ts']
                }
            }
    
    def should_include_file(self, file_path: str) -> bool:
        """Check if file should be included based on patterns"""
        rel_path = os.path.relpath(file_path, self.fibreflow_root)
        
        # Check exclude patterns first
        for pattern in self.exclude_patterns:
            if fnmatch.fnmatch(rel_path, pattern):
                return False
        
        # Check include patterns
        for pattern in self.include_patterns:
            if fnmatch.fnmatch(rel_path, pattern):
                return True
        
        return False
    
    def detect_file_type(self, file_path: str, content: str) -> str:
        """Detect the type of file based on content and path"""
        if file_path.endswith('.ts'):
            if '@Component' in content:
                return 'component'
            elif '@Injectable' in content or 'Service' in Path(file_path).stem:
                return 'service'
            elif 'interface' in content or 'export interface' in content:
                return 'model'
            else:
                return 'typescript'
        elif file_path.endswith('.html'):
            return 'template'
        elif file_path.endswith('.scss'):
            return 'style'
        elif file_path.endswith('.json'):
            return 'config'
        elif file_path.endswith('CLAUDE.md'):
            return 'documentation'
        else:
            return 'other'
    
    def extract_typescript_info(self, content: str) -> Dict[str, List[str]]:
        """Extract TypeScript exports, imports, functions, classes, interfaces"""
        import re
        
        # Extract exports
        exports = re.findall(r'export\s+(?:class|interface|function|const|let|var)\s+(\w+)', content)
        exports.extend(re.findall(r'export\s*{\s*([^}]+)\s*}', content))
        
        # Extract imports
        imports = re.findall(r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]', content)
        
        # Extract functions
        functions = re.findall(r'(?:function\s+(\w+)|(\w+)\s*\([^)]*\)\s*{)', content)
        functions = [f[0] or f[1] for f in functions if f[0] or f[1]]
        
        # Extract classes
        classes = re.findall(r'class\s+(\w+)', content)
        
        # Extract interfaces
        interfaces = re.findall(r'interface\s+(\w+)', content)
        
        return {
            'exports': exports,
            'imports': imports,
            'functions': functions,
            'classes': classes,
            'interfaces': interfaces
        }
    
    def detect_patterns(self, content: str) -> List[str]:
        """Detect FibreFlow-specific patterns in content"""
        import re
        detected = []
        
        for pattern_name, regex in self.fibreflow_patterns.items():
            if re.search(regex, content, re.IGNORECASE):
                detected.append(pattern_name)
        
        return detected
    
    def scan_file(self, file_path: str) -> Optional[CodeFile]:
        """Scan a single file and extract information"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except (UnicodeDecodeError, PermissionError):
            # Skip files that can't be read
            return None
        
        # Get file stats
        stat = os.stat(file_path)
        file_hash = hashlib.md5(content.encode()).hexdigest()
        rel_path = os.path.relpath(file_path, self.fibreflow_root)
        
        # Extract code information
        if file_path.endswith('.ts'):
            ts_info = self.extract_typescript_info(content)
        else:
            ts_info = {'exports': [], 'imports': [], 'functions': [], 'classes': [], 'interfaces': []}
        
        return CodeFile(
            path=rel_path,
            type=self.detect_file_type(file_path, content),
            size=stat.st_size,
            last_modified=stat.st_mtime,
            hash=file_hash,
            exports=ts_info['exports'],
            imports=ts_info['imports'],
            functions=ts_info['functions'],
            classes=ts_info['classes'],
            interfaces=ts_info['interfaces'],
            content_preview=content[:500].replace('\n', ' '),
            patterns=self.detect_patterns(content)
        )
    
    def scan_directory(self) -> CodebaseIndex:
        """Scan the entire FibreFlow directory"""
        console.print(f"[blue]Scanning FibreFlow codebase at: {self.fibreflow_root}[/blue]")
        
        # Find all files to scan
        all_files = []
        for root, dirs, files in os.walk(self.fibreflow_root):
            for file in files:
                file_path = os.path.join(root, file)
                if self.should_include_file(file_path):
                    all_files.append(file_path)
        
        console.print(f"[green]Found {len(all_files)} files to scan[/green]")
        
        # Scan files with progress bar
        scanned_files = {}
        services = {}
        components = {}
        pattern_counts = {}
        
        with Progress(
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        ) as progress:
            
            task = progress.add_task("Scanning files...", total=len(all_files))
            
            for file_path in all_files:
                progress.advance(task)
                
                code_file = self.scan_file(file_path)
                if code_file:
                    scanned_files[code_file.path] = code_file
                    
                    # Index services and components
                    if code_file.type == 'service':
                        service_name = Path(file_path).stem.replace('.service', '')
                        if service_name not in services:
                            services[service_name] = []
                        services[service_name].append(code_file.path)
                    
                    elif code_file.type == 'component':
                        component_name = Path(file_path).stem.replace('.component', '')
                        if component_name not in components:
                            components[component_name] = []
                        components[component_name].append(code_file.path)
                    
                    # Count patterns
                    for pattern in code_file.patterns:
                        pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1
        
        # Create summary
        summary = {
            'total_files': len(scanned_files),
            'by_type': {},
            'total_size_mb': sum(f.size for f in scanned_files.values()) / (1024 * 1024),
            'services_count': len(services),
            'components_count': len(components),
            'top_patterns': sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        }
        
        # Count by type
        for file in scanned_files.values():
            summary['by_type'][file.type] = summary['by_type'].get(file.type, 0) + 1
        
        return CodebaseIndex(
            timestamp=time.time(),
            total_files=len(scanned_files),
            fibreflow_root=self.fibreflow_root,
            files=scanned_files,
            services=services,
            components=components,
            patterns=pattern_counts,
            summary=summary
        )
    
    def save_index(self, index: CodebaseIndex, output_path: str = "cache/codebase_index.json"):
        """Save the codebase index to JSON file"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Convert dataclasses to dict
        data = asdict(index)
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        console.print(f"[green]✓ Index saved to {output_path}[/green]")
        console.print(f"[blue]  {index.total_files} files indexed[/blue]")
        console.print(f"[blue]  {len(index.services)} services found[/blue]")
        console.print(f"[blue]  {len(index.components)} components found[/blue]")
        console.print(f"[blue]  {index.summary['total_size_mb']:.1f} MB total size[/blue]")
    
    def load_index(self, index_path: str = "cache/codebase_index.json") -> Optional[CodebaseIndex]:
        """Load existing index from JSON file"""
        try:
            with open(index_path, 'r') as f:
                data = json.load(f)
            
            # Convert back to dataclasses
            files = {k: CodeFile(**v) for k, v in data['files'].items()}
            data['files'] = files
            
            return CodebaseIndex(**data)
        except FileNotFoundError:
            return None
    
    def print_summary(self, index: CodebaseIndex):
        """Print a nice summary of the scan results"""
        console.print("\n[bold blue]📊 FibreFlow Codebase Summary[/bold blue]")
        console.print(f"[green]✓ Scanned {index.total_files} files ({index.summary['total_size_mb']:.1f} MB)[/green]")
        
        console.print("\n[bold]File Types:[/bold]")
        for file_type, count in index.summary['by_type'].items():
            console.print(f"  {file_type}: {count}")
        
        console.print(f"\n[bold]Code Structure:[/bold]")
        console.print(f"  Services: {len(index.services)}")
        console.print(f"  Components: {len(index.components)}")
        
        console.print(f"\n[bold]Top FibreFlow Patterns:[/bold]")
        for pattern, count in index.summary['top_patterns'][:5]:
            console.print(f"  {pattern}: {count} files")

def main():
    """Main function for command line usage"""
    scanner = FibreFlowCodebaseScanner()
    
    # Check if we should update index
    existing = scanner.load_index()
    if existing:
        age_hours = (time.time() - existing.timestamp) / 3600
        console.print(f"[yellow]Existing index found (age: {age_hours:.1f} hours)[/yellow]")
        
        if age_hours < 24:  # Don't rescan if less than 24 hours old
            console.print("[blue]Index is recent, skipping scan. Use --force to rescan.[/blue]")
            scanner.print_summary(existing)
            return
    
    # Scan the codebase
    index = scanner.scan_directory()
    scanner.save_index(index)
    scanner.print_summary(index)

if __name__ == "__main__":
    main()