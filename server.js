const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const auth = require('basic-auth');
const crypto = require('crypto');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Secure password hashing
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const httpsOptions = {
  key: fs.readFileSync('./certificates/private-key.pem'),
  cert: fs.readFileSync('./certificates/certificate.pem'),
};

// Credentials from environment variables
const SECURE_USERNAME = process.env.ADMIN_USERNAME;
const SECURE_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!SECURE_USERNAME || !SECURE_PASSWORD_HASH) {
  console.error('Error: ADMIN_USERNAME and ADMIN_PASSWORD_HASH environment variables must be set');
  process.exit(1);
}

// Rate limiting
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

const isRateLimited = (ip) => {
  const attempts = loginAttempts.get(ip) || { count: 0, timestamp: Date.now() };
  
  if (attempts.count >= MAX_ATTEMPTS) {
    const timePassed = Date.now() - attempts.timestamp;
    if (timePassed < LOCK_TIME) {
      return true;
    }
    loginAttempts.delete(ip);
  }
  return false;
};

const recordLoginAttempt = (ip, success) => {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  
  const attempts = loginAttempts.get(ip) || { count: 0, timestamp: Date.now() };
  attempts.count += 1;
  attempts.timestamp = Date.now();
  loginAttempts.set(ip, attempts);
};

app.prepare().then(() => {
  // Create HTTP server that redirects to HTTPS
  createHttpServer((req, res) => {
    const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
    const httpsUrl = `https://${host}:3443${req.url}`;
    res.writeHead(301, { Location: httpsUrl });
    res.end();
  }).listen(8080, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log('> HTTP Redirect Server ready on http://0.0.0.0:8080');
  });

  // Create HTTPS server with authentication
  createHttpsServer(httpsOptions, async (req, res) => {
    try {
      const clientIP = req.socket.remoteAddress;

      // Check rate limiting
      if (isRateLimited(clientIP)) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too many login attempts. Please try again later.');
        return;
      }

      // Basic authentication
      const credentials = auth(req);
      const isValid = credentials && 
                     credentials.name === SECURE_USERNAME && 
                     hashPassword(credentials.pass) === SECURE_PASSWORD_HASH;

      if (!isValid) {
        recordLoginAttempt(clientIP, false);
        res.writeHead(401, {
          'WWW-Authenticate': 'Basic realm="Secure Area"',
          'Content-Type': 'text/plain'
        });
        res.end('Access denied');
        return;
      }

      // Successful login
      recordLoginAttempt(clientIP, true);

      // Security headers
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Content-Security-Policy', "default-src 'self'");

      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }).listen(3443, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log('> HTTPS Server ready on https://0.0.0.0:3443');
    console.log('> Security features enabled:');
    console.log('  - HTTPS encryption');
    console.log('  - Basic authentication');
    console.log('  - Rate limiting (5 attempts per 15 minutes)');
    console.log('  - Security headers');
  });
}); 