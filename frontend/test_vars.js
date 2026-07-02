const fs = require('fs');
const content = fs.readFileSync('src/pages/employee/ClockInPage.jsx', 'utf8');

// Find all words that look like function calls or variables, check if they are defined
const matches = [...content.matchAll(/\b([a-zA-Z_]\w*)\b/g)].map(m => m[1]);

console.log("File read successfully, length: ", content.length);
