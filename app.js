// ──────────────────────────────────────────────
// 30-0 RPL — Phusion Passenger Entrypoint
// ──────────────────────────────────────────────
// This file is loaded by Phusion Passenger on Jino hosting.
// It starts the Next.js standalone server.
// ──────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require('path');

// Set HOSTNAME to 0.0.0.0 so the standalone server binds to all interfaces
// (required on Jino shared hosting where Passenger proxies to the app)
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

// Set PORT if not already set (Passenger sets it via PassengerEnvVar)
process.env.PORT = process.env.PORT || '3000';

// Start the Next.js standalone server
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
require(serverPath);
