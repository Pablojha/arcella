import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { seedColleges } from './seed/colleges.js';

await mongoose.connect(env.mongoUri);
await seedColleges();

app.listen(env.port, () => console.log(`Arcella API listening on http://localhost:${env.port}`));
