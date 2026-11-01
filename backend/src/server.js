import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { seedColleges } from './seed/colleges.js';

await mongoose.connect(env.mongoUri);
await seedColleges();

const server = app.listen(env.port, () => console.log(`Arcella API listening on http://localhost:${env.port}`));
// A 40 MB video on a slow connection can outlast Node's default 5-minute request limit.
server.requestTimeout = 15 * 60 * 1000;
