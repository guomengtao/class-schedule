const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ocrBin = path.join(__dirname, 'ocr');
const imgPath = path.join(__dirname, '..', 'screenshots', 'desktop-now.png');

try {
  const result = execFileSync(ocrBin, [imgPath], {
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024
  });
  fs.writeFileSync(path.join(__dirname, 'ocr-out.txt'), result);
  console.log('OCR_OK, lines:', result.split('\n').length);
} catch (e) {
  fs.writeFileSync(path.join(__dirname, 'ocr-err.txt'), 'ERR: ' + e.message + '\n' + (e.stderr || ''));
  console.log('OCR_FAIL');
}