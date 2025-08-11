#!/usr/bin/env python3
"""
Generic Codebase Scanner for AI Context Manager
Works with any project - just update the config!
"""

import os
import json
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set
import hashlib
import re

class CodebaseScanner:
    def __init__(self, config_path: str = "config/project_config.yaml"):
        """Initialize with project configuration"""
        self.load_config(config_path)
        self.file_index = {}
        self.stats = {
            'total_files': 0,
            'total_size_mb': 0,
            'by_extension': {},
            'scan_date': datetime.now().isoformat()
        }
    
    def load_config(self, config_path: str):
        """Load project configuration"""
        config_file = Path(config_path)
        if not config_file.exists():
            # Use template if no config exists
            template_path = config_file.with_suffix('.yaml.template')
            if template_path.exists():
                print(f"⚠️  No {config_path} found. Using template.")
                print(f"   Copy {template_path} to {config_path} and customize it.")
                config_file = template_path
            else:
                # Fallback defaults
                print("⚠️  No configuration found. Using defaults.")
                self.config = {
                    'project': {
                        'name': 'Project',
                        'root': os.getcwd()
                    },
                    'scan_extensions': ['.py', '.js', '.ts', '.jsx', '.tsx'],
                    'ignore_dirs': ['node_modules', '.git', '__pycache__', 'venv']
                }
                return
        
        with open(config_file, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.project_root = Path(self.config['project']['root'])
        self.extensions = set(self.config.get('scan_extensions', ['.py', '.js', '.ts']))
        self.ignore_dirs = set(self.config.get('ignore_dirs', ['node_modules', '.git']))
    
    def should_scan_file(self, file_path: Path) -> bool:
        """Check if file should be scanned"""
        # Check extension
        if file_path.suffix not in self.extensions:
            return False
        
        # Check ignored directories
        for part in file_path.parts:
            if part in self.ignore_dirs:
                return False
        
        # Skip hidden files
        if any(part.startswith('.') for part in file_path.parts):
            return False
        
        return True
    
    def scan_file(self, file_path: Path) -> Dict:
        """Scan a single file for metadata"""
        try:
            stat = file_path.stat()
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            
            # Extract basic info
            info = {
                'path': str(file_path.relative_to(self.project_root)),
                'size': stat.st_size,
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'lines': len(content.splitlines()),
                'extension': file_path.suffix,
                'hash': hashlib.md5(content.encode()).hexdigest()
            }
            
            # Language-specific parsing
            if file_path.suffix in ['.py']:
                info['imports'] = self.extract_python_imports(content)
                info['classes'] = self.extract_python_classes(content)
                info['functions'] = self.extract_python_functions(content)
            elif file_path.suffix in ['.js', '.ts', '.jsx', '.tsx']:
                info['imports'] = self.extract_js_imports(content)
                info['exports'] = self.extract_js_exports(content)
                info['components'] = self.extract_react_components(content)
            
            return info
            
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
            return None
    
    def extract_python_imports(self, content: str) -> List[str]:
        """Extract Python imports"""
        imports = []
        for line in content.splitlines():
            if line.strip().startswith(('import ', 'from ')):
                imports.append(line.strip())
        return imports[:10]  # Limit to first 10
    
    def extract_python_classes(self, content: str) -> List[str]:
        """Extract Python class names"""
        pattern = r'^class\s+(\w+)'
        return re.findall(pattern, content, re.MULTILINE)[:10]
    
    def extract_python_functions(self, content: str) -> List[str]:
        """Extract Python function names"""
        pattern = r'^def\s+(\w+)'
        return re.findall(pattern, content, re.MULTILINE)[:10]
    
    def extract_js_imports(self, content: str) -> List[str]:
        """Extract JavaScript/TypeScript imports"""
        pattern = r'import\s+.*?from\s+[\'"](.+?)[\'"]'
        return re.findall(pattern, content)[:10]
    
    def extract_js_exports(self, content: str) -> List[str]:
        """Extract JavaScript/TypeScript exports"""
        pattern = r'export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)'
        return re.findall(pattern, content)[:10]
    
    def extract_react_components(self, content: str) -> List[str]:
        """Extract React component names"""
        # Function components
        func_pattern = r'(?:export\s+)?(?:const|function)\s+(\w+)\s*(?::\s*\w+\s*)?=.*?=>\s*(?:\(|{)'
        # Class components
        class_pattern = r'class\s+(\w+)\s+extends\s+(?:React\.)?Component'
        
        components = re.findall(func_pattern, content) + re.findall(class_pattern, content)
        return list(set(components))[:10]
    
    def scan_directory(self) -> Dict:
        """Scan the entire project directory"""
        print(f"📂 Scanning {self.config['project']['name']} at {self.project_root}")
        
        all_files = []
        for root, dirs, files in os.walk(self.project_root):
            # Remove ignored directories from traversal
            dirs[:] = [d for d in dirs if d not in self.ignore_dirs]
            
            for file in files:
                file_path = Path(root) / file
                if self.should_scan_file(file_path):
                    all_files.append(file_path)
        
        print(f"📊 Found {len(all_files)} files to scan")
        
        # Scan files
        for i, file_path in enumerate(all_files):
            if i % 100 == 0:
                print(f"   Scanning... {i}/{len(all_files)} files")
            
            file_info = self.scan_file(file_path)
            if file_info:
                self.file_index[str(file_path)] = file_info
                
                # Update stats
                self.stats['total_files'] += 1
                self.stats['total_size_mb'] += file_info['size'] / (1024 * 1024)
                
                ext = file_info['extension']
                if ext not in self.stats['by_extension']:
                    self.stats['by_extension'][ext] = 0
                self.stats['by_extension'][ext] += 1
        
        print(f"✅ Scan complete!")
        print(f"   Files: {self.stats['total_files']}")
        print(f"   Size: {self.stats['total_size_mb']:.1f} MB")
        
        return {
            'project': self.config['project'],
            'stats': self.stats,
            'files': self.file_index
        }
    
    def save_index(self, output_path: str = "cache/codebase_index.json"):
        """Save the index to a JSON file"""
        output_file = Path(output_path)
        output_file.parent.mkdir(exist_ok=True)
        
        index_data = {
            'project': self.config['project'],
            'stats': self.stats,
            'files': self.file_index,
            'config': self.config
        }
        
        with open(output_file, 'w') as f:
            json.dump(index_data, f, indent=2)
        
        print(f"💾 Index saved to {output_file}")
        print(f"   Size: {output_file.stat().st_size / 1024:.1f} KB")

def main():
    """Run the scanner"""
    scanner = CodebaseScanner()
    scanner.scan_directory()
    scanner.save_index()

if __name__ == "__main__":
    main()
