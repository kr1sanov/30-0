import { spawn } from 'node:child_process';

// curl handles the hosting provider's HTTP/TLS connection independently of
// Node's fetch stack. Configuration goes through stdin, never process arguments.
function request(url, secret, body) {
  return new Promise((resolve, reject) => {
    const config = [
      `url = ${JSON.stringify(url)}`,
      'request = "POST"',
      `header = ${JSON.stringify('Content-Type: application/json')}`,
      `header = ${JSON.stringify('X-30-0-Worker: ' + secret)}`,
      `data = ${JSON.stringify(JSON.stringify(body))}`,
    ].join('\n');
    const child = spawn('curl', ['--config', '-', '--http1.1', '--silent', '--show-error', '--connect-timeout', '10', '--max-time', '30', '--write-out', '\n%{http_code}'], { stdio: ['pipe','pipe','pipe'] });
    let output = '', oversized = false;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 16_000_000) { oversized = true; child.kill(); } });
    child.stderr.resume(); // Never log configuration, credentials or response bodies.
    child.stdin.on('error', () => {});
    child.once('error', () => reject(new Error('Notification HTTP transport unavailable')));
    child.once('close', code => {
      if (code !== 0 || oversized) return reject(new Error('Notification HTTP connection unavailable'));
      const split = output.lastIndexOf('\n');
      resolve({ status: Number(output.slice(split + 1)), body: output.slice(0, split) });
    });
    child.stdin.end(config);
  });
}

export async function postNotificationWorker(url, secret, body = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(url, secret, body);
      if (response.status >= 400 && response.status < 500 && ![408,429].includes(response.status)) {
        throw Object.assign(new Error('Notification relay HTTP ' + response.status), { permanent: true });
      }
      if (response.status < 200 || response.status >= 300) throw new Error('Temporary notification HTTP failure');
      return JSON.parse(response.body);
    } catch (error) {
      if (error.permanent) throw error;
      if (attempt === 2) throw new Error('Notification relay connection unavailable');
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
