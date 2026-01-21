// Simple in-memory store; swap with a database in production.
const contracts = [];

function addContract(payload) {
  const contract = {
    id: contracts.length + 1,
    ...payload,
    createdAt: new Date().toISOString(),
  };
  contracts.push(contract);
  return contract;
}

function listContracts() {
  return contracts;
}

module.exports = { addContract, listContracts };
