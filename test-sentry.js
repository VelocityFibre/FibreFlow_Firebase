// Quick script to test Sentry errors
console.log('Testing Sentry Integration...\n');

console.log('1. Navigate to: http://localhost:4200/debug/sentry-test');
console.log('2. Click each button to generate errors:');
console.log('   - "Throw Unhandled Error" - Basic error');
console.log('   - "Throw Type Error" - TypeError');
console.log('   - "Throw Async Error" - Async error');
console.log('   - "Send Test Message" - Info message');
console.log('   - "Send Custom Error" - Error with context\n');

console.log('3. Then check your Sentry dashboard at:');
console.log('   https://sentry.io/organizations/YOUR_ORG/issues/\n');

console.log('Expected results:');
console.log('- Errors appear instantly in Sentry');
console.log('- Stack traces are readable (source maps working)');
console.log('- Error context shows URL, browser info, etc.');
console.log('- Session replay available for errors');