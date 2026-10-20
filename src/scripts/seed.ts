import mongoose from 'mongoose';
import { loadConfig } from '../config.js';
import { seedTeachers } from '../teachers/teacher.seed.js';

const config = loadConfig(process.env);

await mongoose.connect(config.MONGODB_URI);
const teachers = await seedTeachers();
console.table(
  teachers.map((t) => ({ id: String(t._id), name: t.fullName, specialization: t.specialization })),
);
await mongoose.disconnect();
