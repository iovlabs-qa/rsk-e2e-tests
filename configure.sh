#!/bin/bash
npm install
npm install -g truffle
cp ./node_modules/@rsksmart/erc677/contracts/* ./contracts
rm -rf ./build
truffle deploy --network rskRegtest