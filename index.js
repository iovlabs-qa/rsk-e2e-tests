const assert = require('chai').assert;
const Web3 = require('web3');
const BN = require('bignumber.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const ERC677Data = require('./build/contracts/ERC677.json');
var Contract = require('web3-eth-contract');



describe('e2e Test Suite', function () {
    this.timeout(10000);
    let web3;
    let accounts;

    before(async () => {
        web3 = new Web3(config.rsk.hostUrl, null, {
            transactionConfirmationBlocks: 1
        });

        web3.evm = {
            mine: function increaseTime() {
                var duration = 1;
                const id = Date.now();

                return new Promise((resolve, reject) => {
                    web3.currentProvider.send({
                        jsonrpc: '2.0',
                        method: 'evm_increaseTime',
                        params: [duration],
                        id: id,
                    }, err1 => {
                        if (err1) return reject(err1);

                        web3.currentProvider.send({
                            jsonrpc: '2.0',
                            method: 'evm_mine',
                            id: id + 1,
                        }, (err2, res) => {
                            return err2 ? reject(err2) : resolve(res);
                        });
                    });
                });
            }
        };
        accounts = await web3.eth.getAccounts();
    });

    var ERC677 = new Contract(ERC677Data.abi, ERC677Data.networks[33].address);
    ERC677.setProvider(config.rsk.hostUrl);

    async function transferToAccounts(accounts, amount) {
        let transferResult;
        for (account of accounts) {
            if (account != accounts[0]) {
                transferResult = await ERC677.methods.transfer(account, amount).send({
                    from: accounts[0]
                });
                assert(transferResult.transactionHash, 'Transfer Failed!');
            }
        }
    }

    it('Network should be RSK', async () => {
        // web3_clientVersion
        let clientVersion = await web3.eth.getNodeInfo();
        assert(clientVersion.indexOf('RskJ') >= 0, "Network should be RSK but is :" + clientVersion);
    })

    it('Check Contract address', async () => {
        assert(ERC677._address == ERC677Data.networks[33].address, "ERC677 address should be " + ERC677Data.networks[33].address + " but is :" + ERC677._address);
    })
    it('Check Initial Token Balance', async () => {
        let expectedTotalSupply = new BN(100000000);
        let totalSupply = new BN(await ERC677.methods.totalSupply().call());
        assert(totalSupply.isEqualTo(expectedTotalSupply), "Total supply should be 100000 but it is " + totalSupply);
        let ownerBalance = new BN(await ERC677.methods.balanceOf(accounts[0]).call());;
        assert(ownerBalance.isEqualTo(totalSupply), "Owner balance is " + ownerBalance + " but it should be " + totalSupply)

        accounts.forEach(async function (valor, indice, array) {
            if (indice != 0) {
                let balance = new BN(await ERC677.methods.balanceOf(valor).call());
                assert(balance.isEqualTo(0), "Account " + value + " balance is " + balance + " but it should be 0");
            }
        });

    })

    it('Transfer Token', async () => {
        await transferToAccounts(accounts, 1000);
        await web3.evm.mine();

        for (account of accounts) {
            let result = await new BN(await ERC677.methods.balanceOf(account).call());
            if (account == accounts[0]) {
                assert(result.isEqualTo(99990000), "Account " + account + " balance is expected to be 99990000 but it is " + result);
            } else {
                assert(result.isEqualTo(1000), "Account " + account + " is expected to be 1000 but it is " + result);
            }
        };

        let transferResult = await ERC677.methods.transfer(accounts[2], 500).send({
            from: accounts[1]
        });
        assert(transferResult.transactionHash, 'Transfer Failed!');

        transferResult = await ERC677.methods.transfer(accounts[3], 500).send({
            from: accounts[1]
        });
        assert(transferResult.transactionHash, 'Transfer Failed!');

        let balance = await new BN(await ERC677.methods.balanceOf(accounts[0]).call());
        let balance1 = await new BN(await ERC677.methods.balanceOf(accounts[1]).call());
        let balance2 = await new BN(await ERC677.methods.balanceOf(accounts[2]).call());
        let balance3 = await new BN(await ERC677.methods.balanceOf(accounts[3]).call());

        assert(balance.isEqualTo(99990000), "Account " + accounts[0] + " balance is expected to be 99990000 but it is " + balance + " after second set of transfers.");
        assert(balance1.isEqualTo(0), "Account " + accounts[1] + " balance is expected to be 0 but it is " + balance1 + " after second set of transfers.");
        assert(balance2.isEqualTo(1500), "Account " + accounts[2] + " balance is expected to be 1500 but it is " + balance2 + " after second set of transfers.");
        assert(balance3.isEqualTo(1500), "Account " + accounts[3] + " balance is expected to be 1500 but it is " + balance3 + " after second set of transfers.");

    });

    it('Transfer tRBTC', async () => {
        let newAcct = await web3.eth.accounts.create();
        let expectedInitBalanceAcct0 = new BN(999999999999999999999999999000);
        let initBalance = await new BN(await web3.eth.getBalance(accounts[5]));
        let initBalance1 = await new BN(await web3.eth.getBalance(newAcct.address));
        assert(initBalance1.isEqualTo(0), "New Account " + newAcct.address + " tRBTC balance is expected to be 0 but it is " + initBalance1);
        assert(initBalance.isEqualTo(expectedInitBalanceAcct0), "Account " + accounts[0] + " tRBTC balance is expected to be " + expectedInitBalanceAcct0.toFixed() + " but it is " + initBalance.toFixed());

        let rbtcTransfer = await web3.eth.sendTransaction({
            to: newAcct.address,
            from: accounts[5],
            value: 1000
        })
        assert(rbtcTransfer.transactionHash,"tRBT trx failed!");
        let afterTrasnferBalance = await new BN(await web3.eth.getBalance(accounts[5]));
        let afterTrasnferBalance1 = await new BN(await web3.eth.getBalance(newAcct.address));

        assert(afterTrasnferBalance.isEqualTo(initBalance.minus(1000)), "New Account " + newAcct.address + " tRBTC balance is expected to be " + initBalance.minus(1000).toFixed()+" but it is " + initBalance1 + " after transfering tRBTC");
        assert(afterTrasnferBalance1.isEqualTo(1000), "Account " + accounts[5]+ " tRBTC balance is expected to be 1000 but it is " + afterTrasnferBalance1+ " after transfering tRBTC");

    });
});