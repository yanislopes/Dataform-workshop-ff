// Project
const PROJECT_ID = "dataform-workshop-ff"

// Fonction pour générer une unique key
function generateUniqueKey(columns) {
  const concatenated = columns.join(", '-', ");
  return `TO_HEX(SHA256(CONCAT(${concatenated})))`;
}

function getIncrementalTimestamp(schema, table) {
  return `
    DECLARE incremental_timestamp TIMESTAMP DEFAULT TIMESTAMP('1900-01-01');
    
    IF EXISTS (
      SELECT 1 FROM \`${PROJECT_ID}.${schema}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name = '${table}'
    ) THEN
      SET incremental_timestamp = (
        SELECT COALESCE(MAX(technical_date), TIMESTAMP('1900-01-01'))
        FROM \`${PROJECT_ID}.${schema}.${table}\`
      );
    END IF;
  `;
}

module.exports = { 
  PROJECT_ID,
  generateUniqueKey,
  getIncrementalTimestamp
};