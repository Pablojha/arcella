import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { migrateWorkplace } from './models/Job.js';
import { migrateRoles } from './models/User.js';
import { seedColleges } from './seed/colleges.js';
import { migrateMemberships } from './services/membership.js';
import { startRealtime } from './services/realtime.js';

await mongoose.connect(env.mongoUri);
await seedColleges();
const migrated = await migrateMemberships();
if (migrated) console.log(`Gave ${migrated} members a college membership from their verified college`);
const placed = await migrateWorkplace();
if (placed) console.log(`Set the workplace of ${placed} jobs from their remote flag`);
const roled = await migrateRoles(env.adminEmails);
if (roled) console.log(`Gave ${roled} site admins a staff role`);

const server = app.listen(env.port, () => console.log(`Arcella API listening on http://localhost:${env.port}`));
// A 40 MB video on a slow connection can outlast Node's default 5-minute request limit.
server.requestTimeout = 15 * 60 * 1000;
startRealtime(server);
