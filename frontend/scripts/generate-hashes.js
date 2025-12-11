// Script to generate bcrypt hashes for owner and manager passwords
// Run: node scripts/generate-hashes.js

import bcrypt from 'bcryptjs';

async function generateHashes() {
  const saltRounds = 10;
  
  const ownerPassword = 'owner123';
  const managerPassword = 'manager123';
  
  console.log('Generating bcrypt hashes...\n');
  
  const ownerHash = await bcrypt.hash(ownerPassword, saltRounds);
  console.log('Owner password (owner123):');
  console.log(ownerHash);
  console.log('');
  
  const managerHash = await bcrypt.hash(managerPassword, saltRounds);
  console.log('Manager password (manager123):');
  console.log(managerHash);
  console.log('');
  
  console.log('Copy these hashes to md/25_hash_passwords_bcrypt.sql');
  console.log('Then run the SQL in Supabase SQL Editor');
}

generateHashes().catch(console.error);
