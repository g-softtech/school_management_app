const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB.');
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('studentbills');
      
      const indexes = await collection.indexes();
      console.log('--- Physical Indexes on studentbills collection ---');
      indexes.forEach((idx, i) => {
        console.log(`\nIndex ${i}:`);
        console.log(`Name: ${idx.name}`);
        console.log(`Key:`, idx.key);
        if (idx.unique) {
          console.log(`Unique: true`);
        }
      });
      
      const expectedIndex = indexes.find(idx => 
        idx.key.studentId === 1 && 
        idx.key.session === 1 && 
        idx.key.term === 1 && 
        idx.unique === true
      );
      
      if (expectedIndex) {
        console.log('\n[PASS] Physical unique index for { studentId: 1, session: 1, term: 1 } found!');
      } else {
        console.error('\n[FAIL] Missing physical unique index for { studentId: 1, session: 1, term: 1 }!');
      }
    } catch (err) {
      console.error('Error fetching indexes:', err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => {
    console.error('Connection error:', err);
  });
