const { addContract, listContracts } = require('../models/contractStore');

function createContract(req, res) {
  const contract = addContract(req.body);
  res.status(201).json(contract);
}

function getContracts(_req, res) {
  res.json(listContracts());
}

module.exports = { createContract, getContracts };
