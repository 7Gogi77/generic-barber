const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getSha256(value = '') {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET } = process.env;
const outputDir = path.resolve(process.cwd(), 'public');
const outputFile = path.join(outputDir, 'admin-env.json');
let payload = {
  generatedAt: new Date().toISOString()
};

if (ADMIN_USERNAME && ADMIN_PASSWORD && ADMIN_SECRET) {
  payload = {
    ...payload,
    username: ADMIN_USERNAME,
    passwordHash: getSha256(ADMIN_PASSWORD),
    secret: ADMIN_SECRET
  };
} else {
  payload = {
    ...payload,
    error: 'Admin credentials not provided'
  };
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
console.info(`Generated ${path.relative(process.cwd(), outputFile)}`);
