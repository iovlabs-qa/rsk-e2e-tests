const Migrations = artifacts.require("Migrations");
const ERC677 = artifacts.require("ERC677");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(
    ERC677,
    "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    web3.utils.toBN('100000000'),
    'QAToken',
    'QAT',
  );
};
