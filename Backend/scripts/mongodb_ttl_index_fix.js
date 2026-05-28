// MongoDB Diagnostic & Cleanup Script for TTL Index Vulnerability
// Run this in MongoDB shell: mongo < mongodb_ttl_index_fix.js

console.log("═══════════════════════════════════════════════════════════════");
console.log("  MongoDB TTL Index Security Audit & Cleanup");
console.log("═══════════════════════════════════════════════════════════════\n");

// Get database name
const dbName = db.getName();
console.log(`📊 Database: ${dbName}\n`);

// Define collections to check
const collections = ['passengers', 'drivers'];
const issues = [];
const fixes = [];

// ============================================================================
// PHASE 1: SCAN FOR DANGEROUS INDEXES
// ============================================================================
console.log("🔍 PHASE 1: Scanning for dangerous TTL indexes...\n");

collections.forEach(collectionName => {
  try {
    const collection = db[collectionName];
    const stats = collection.stats();
    const indexes = collection.getIndexes();
    
    console.log(`📁 Collection: ${collectionName}`);
    console.log(`   Documents: ${stats.count || 0}`);
    console.log(`   Indexes: ${indexes.length}\n`);
    
    indexes.forEach(index => {
      const indexName = index.name;
      const hasExpireAfterSeconds = 'expireAfterSeconds' in index;
      
      console.log(`   Index: ${indexName}`);
      console.log(`   Keys: ${JSON.stringify(index.key)}`);
      
      if (hasExpireAfterSeconds) {
        console.log(`   ⚠️  TTL INDEX DETECTED!`);
        console.log(`   expireAfterSeconds: ${index.expireAfterSeconds}`);
        
        // Check if it's on otpExpiresAt field
        if (index.key.otpExpiresAt) {
          console.log(`   🚨 DANGER: TTL index on otpExpiresAt (permanent user collection!)\n`);
          issues.push({
            collection: collectionName,
            indexName: indexName,
            severity: 'CRITICAL'
          });
          fixes.push(`db.${collectionName}.dropIndex("${indexName}")`);
        } else {
          console.log(`   ⚠️  Other TTL index (review for safety)\n`);
        }
      } else {
        console.log(`   ✅ No TTL on this index\n`);
      }
    });
  } catch (error) {
    console.log(`❌ Error reading ${collectionName}: ${error.message}\n`);
  }
});

// ============================================================================
// PHASE 2: REPORT FINDINGS
// ============================================================================
console.log("\n" + "═".repeat(70));
console.log("📋 AUDIT RESULTS");
console.log("═".repeat(70) + "\n");

if (issues.length === 0) {
  console.log("✅ NO DANGEROUS TTL INDEXES FOUND\n");
  console.log("Your MongoDB collections are safe!\n");
} else {
  console.log(`🚨 FOUND ${issues.length} DANGEROUS ISSUE(S):\n`);
  
  issues.forEach((issue, idx) => {
    console.log(`${idx + 1}. Collection: ${issue.collection}`);
    console.log(`   Index: ${issue.indexName}`);
    console.log(`   Severity: ${issue.severity}\n`);
  });
}

// ============================================================================
// PHASE 3: CLEANUP COMMANDS
// ============================================================================
if (fixes.length > 0) {
  console.log("\n" + "═".repeat(70));
  console.log("🔧 CLEANUP COMMANDS");
  console.log("═".repeat(70) + "\n");
  
  console.log("Run these commands to drop dangerous indexes:\n");
  fixes.forEach((fix, idx) => {
    console.log(`${idx + 1}. ${fix}`);
  });
  
  console.log("\n💡 Tip: Run each command individually and verify success\n");
  console.log("Example:");
  console.log("  db.passengers.dropIndex(\"otpExpiresAt_1\")");
  console.log("  // Output: { \"nIndexesWas\" : 5 }\n");
} else {
  console.log("\n✅ No cleanup needed!\n");
}

// ============================================================================
// PHASE 4: OTP FIELD AUDIT
// ============================================================================
console.log("═".repeat(70));
console.log("🔐 OTP FIELD CONFIGURATION AUDIT");
console.log("═".repeat(70) + "\n");

collections.forEach(collectionName => {
  try {
    const collection = db[collectionName];
    
    // Check a sample document
    const sampleDoc = collection.findOne();
    
    if (sampleDoc) {
      console.log(`📁 ${collectionName}:`);
      console.log(`   _id: ${sampleDoc._id}`);
      console.log(`   otp: ${sampleDoc.otp ? '(set)' : '(null)'}`);
      console.log(`   otpExpiresAt: ${sampleDoc.otpExpiresAt ? new Date(sampleDoc.otpExpiresAt).toISOString() : '(null)'}`);
      
      if (sampleDoc.otp && sampleDoc.otpExpiresAt) {
        const now = new Date();
        const expired = new Date(sampleDoc.otpExpiresAt) < now;
        console.log(`   Status: ${expired ? '❌ EXPIRED' : '✅ VALID'}\n`);
      } else {
        console.log(`   Status: ✅ NO ACTIVE OTP\n`);
      }
    } else {
      console.log(`📁 ${collectionName}: (no documents to check)\n`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${collectionName}: ${error.message}\n`);
  }
});

// ============================================================================
// PHASE 5: SAFETY CHECK
// ============================================================================
console.log("═".repeat(70));
console.log("🛡️  SAFETY VERIFICATION");
console.log("═".repeat(70) + "\n");

let safetyScore = 100;

collections.forEach(collectionName => {
  try {
    const indexes = db[collectionName].getIndexes();
    
    const dangerousIndexes = indexes.filter(idx => 
      idx.expireAfterSeconds === 0 && idx.key.otpExpiresAt
    );
    
    if (dangerousIndexes.length > 0) {
      console.log(`⚠️  ${collectionName}: UNSAFE - Has ${dangerousIndexes.length} dangerous TTL index(es)`);
      safetyScore -= 50;
    } else {
      console.log(`✅ ${collectionName}: SAFE - No dangerous TTL indexes`);
    }
  } catch (error) {
    console.log(`❌ ${collectionName}: Could not verify`);
    safetyScore -= 25;
  }
});

console.log(`\n📊 Overall Safety Score: ${safetyScore}/100`);

if (safetyScore === 100) {
  console.log("🎉 YOUR COLLECTIONS ARE SAFE!\n");
} else if (safetyScore >= 50) {
  console.log("⚠️  ACTION REQUIRED - Please run cleanup commands above\n");
} else {
  console.log("🚨 CRITICAL - Immediate action required\n");
}

// ============================================================================
// END REPORT
// ============================================================================
console.log("═".repeat(70));
console.log("End of diagnostic report");
console.log("═".repeat(70));
