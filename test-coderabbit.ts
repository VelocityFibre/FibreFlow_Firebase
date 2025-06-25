// Test file for CodeRabbit review
// This file contains intentional issues for testing

export class TestService {
  // Missing JSDoc
  calculateTotal(items: any[]) { // Using 'any' type
    let total = 0;
    
    // Potential null reference
    items.forEach(item => {
      total += item.price * item.quantity; // No null checks
    });
    
    // Hardcoded values (should use theme)
    const style = {
      color: '#333333',
      fontSize: '14px',
      margin: '10px'
    };
    
    // Constructor injection (should use inject())
    constructor(private http: HttpClient) {}
    
    return total;
  }
  
  // Inefficient loop
  findDuplicates(arr: number[]) {
    const duplicates = [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] === arr[j]) {
          duplicates.push(arr[i]);
        }
      }
    }
    return duplicates;
  }
}