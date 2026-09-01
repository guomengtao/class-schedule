const { execSync } = require('child_process');
const fs = require('fs');

const results = [];

try {
  results.push('node version: ' + execSync('node -v', { encoding: 'utf8' }).trim());
} catch(e) {
  results.push('node error: ' + e.message);
}

try {
  results.push('node path: ' + execSync('which node', { encoding: 'utf8' }).trim());
} catch(e) {
  results.push('which node error: ' + e.message);
}

try {
  results.push('npm version: ' + execSync('npm -v', { encoding: 'utf8' }).trim());
} catch(e) {
  results.push('npm error: ' + e.message);
}

fs.writeFileSync(__dirname + '/env_check_result.txt', results.join('\n'));
console.log(results.join('\n'));