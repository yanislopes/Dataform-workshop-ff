// Project
const PROJECT_ID = "dataform-workshop-ff"

// Fonction pour générer une unique key
function generateUniqueKey(columns) {
  const concatenated = columns.join(", '-', ");
  return `TO_HEX(SHA256(CONCAT(${concatenated})))`;
}

module.exports = { 
  PROJECT_ID,
  generateUniqueKey
};