#!/usr/bin/env python3
"""
Example usage of the FibreFlow Query Agent
Demonstrates basic functionality with example queries
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from agent import process_question
import time


def example_queries():
    """Show example queries that the agent can handle"""
    
    examples = [
        # Basic counting queries
        "How many projects do we have?",
        "How many active projects are there?",
        "Count the total number of contractors",
        
        # Listing queries
        "List all project names",
        "Show me the first 5 contractors",
        "What are the different project statuses?",
        
        # More complex analytics
        "Which contractor has the most projects?",
        "What's the average project duration?",
        "Show me projects that are behind schedule",
        
        # BOQ and financial queries
        "What's the total value of all BOQ items?",
        "Which projects have the highest BOQ values?",
        "Show me expensive BOQ items over R10,000",
        
        # Staff and team queries
        "How many staff members do we have?",
        "Which team members are assigned to the most projects?",
        "List all project managers",
        
        # Stock and inventory
        "What stock items are running low?",
        "Show me recent stock movements",
        "Which materials are used most frequently?",
        
        # Progress and KPI queries
        "What was our progress yesterday?",
        "Show me daily KPI trends for this week",
        "Which projects made the most progress this month?",
        
        # Meeting and action items
        "What action items are overdue?",
        "Show me recent meeting summaries",
        "Which team has the most pending action items?"
    ]
    
    return examples


def simulate_query_session():
    """Simulate a query session with the agent"""
    
    print("🤖 FibreFlow Query Agent - Example Usage")
    print("=" * 60)
    
    examples = example_queries()
    
    print(f"📋 Here are {len(examples)} example queries the agent can handle:\n")
    
    for i, query in enumerate(examples, 1):
        print(f"{i:2d}. {query}")
    
    print("\n" + "=" * 60)
    print("💡 To test with real data:")
    print("   1. Add your OpenAI API key to .env.local")
    print("   2. Add your Neon database connection string")
    print("   3. Run: python examples/test_real_queries.py")
    
    print("\n🌐 To test via API:")
    print("   1. Start the server: python src/api.py")
    print("   2. Visit: http://localhost:8000/docs")
    print("   3. Try the /query endpoint")
    
    print("\n🔗 For Angular integration:")
    print("   1. The API will be available at http://localhost:8000")
    print("   2. Add a 'Data Assistant' tab to FibreFlow")
    print("   3. Make POST requests to /query endpoint")


def show_api_integration_example():
    """Show how to integrate with the API"""
    
    print("\n📡 API Integration Example (JavaScript/Angular):")
    print("=" * 60)
    
    api_example = '''
// In your Angular service
export class DataAssistantService {
  private apiUrl = 'http://localhost:8000';
  
  async askQuestion(question: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        user_id: this.authService.getCurrentUserId(),
        include_metadata: true
      })
    });
    
    return response.json();
  }
}

// In your component
async onAskQuestion() {
  const question = "How many active projects do we have?";
  
  try {
    const result = await this.dataService.askQuestion(question);
    
    if (result.success) {
      this.answer = result.answer;
      this.executionTime = result.execution_time;
    } else {
      this.error = result.error;
    }
  } catch (error) {
    console.error('Query failed:', error);
  }
}
'''
    
    print(api_example)


def show_curl_examples():
    """Show curl examples for testing the API"""
    
    print("\n🔧 cURL Examples for Testing:")
    print("=" * 60)
    
    curl_examples = [
        {
            "description": "Health check",
            "command": "curl -X GET http://localhost:8000/health"
        },
        {
            "description": "Simple query",
            "command": '''curl -X POST http://localhost:8000/query \\
  -H "Content-Type: application/json" \\
  -d '{"question": "How many projects do we have?"}'
'''
        },
        {
            "description": "Query with metadata",
            "command": '''curl -X POST http://localhost:8000/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "Which contractor has the most projects?",
    "user_id": "test_user",
    "include_metadata": true
  }'
'''
        },
        {
            "description": "Get database info",
            "command": "curl -X GET http://localhost:8000/database/info"
        },
        {
            "description": "Get agent statistics",
            "command": "curl -X GET http://localhost:8000/agent/stats"
        }
    ]
    
    for example in curl_examples:
        print(f"# {example['description']}")
        print(example['command'])
        print()


def main():
    """Main example function"""
    
    simulate_query_session()
    show_api_integration_example()
    show_curl_examples()
    
    print("\n🎉 FibreFlow Query Agent is ready for integration!")
    print("   Next: Add real credentials and test with your data")


if __name__ == "__main__":
    main()