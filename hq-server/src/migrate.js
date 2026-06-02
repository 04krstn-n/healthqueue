/**
 * Migration: Convert string services to proper objects
 * Run ONCE: node src/migrate.js
 * Safe to run multiple times — skips already-migrated services
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Clinic   = require('./models/Clinic');

const SERVICE_META = {
  'Laboratory':             { description: 'CBC, urinalysis, blood chemistry, and other lab tests',    durationMinutes: 30 },
  'Ultrasound':             { description: 'Abdominal, pelvic, and OB ultrasound',                     durationMinutes: 45 },
  'Digital X-Ray':          { description: 'Chest, spine, and extremity digital radiography',          durationMinutes: 20 },
  'ECG & Cardiology':       { description: '12-lead ECG and cardiology screening',                     durationMinutes: 30 },
  'Drug Testing':           { description: 'DOLE-accredited pre-employment drug test',                 durationMinutes: 20 },
  'Executive Health':       { description: 'Comprehensive annual executive health screening',          durationMinutes: 120 },
  'CT Scan & MRI':          { description: 'Advanced cross-sectional imaging services',               durationMinutes: 60 },
  'Mammography & Pap Smear':{ description: "Women's preventive health screening",                      durationMinutes: 60 },
};

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  const clinics = await Clinic.find({});
  let updated = 0;

  for (const clinic of clinics) {
    let changed = false;
    const newServices = clinic.services.map(svc => {
      // Already an object with a name field — skip
      if (svc && typeof svc === 'object' && svc.name) return svc;
      // It's a string (old format) — convert it
      const name = typeof svc === 'string' ? svc : String(svc);
      const meta = SERVICE_META[name] || { description: name, durationMinutes: 30 };
      changed = true;
      return { name, description: meta.description, durationMinutes: meta.durationMinutes, isAvailable: true };
    });

    if (changed) {
      // Use updateOne with $set to bypass Mongoose schema validation on old data
      await Clinic.collection.updateOne(
        { _id: clinic._id },
        { $set: { services: newServices } }
      );
      console.log(`  ✓ Migrated: ${clinic.name} (${newServices.length} services)`);
      updated++;
    } else {
      console.log(`  — Already OK: ${clinic.name}`);
    }
  }

  console.log(`\n✅ Migration complete. ${updated} clinic(s) updated.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
