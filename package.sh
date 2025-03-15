#!/bin/bash
rm -rf ./build
mkdir -p ./build

for lambda in ackMessageLambda getMessagesLambda sendMessageLambda authroizerLambda agentRegistryLambda authLogsLambda; do
    rm ./terraform/${lambda}.zip
    mkdir -p ./build/$lambda
    npx esbuild ./lambda/$lambda/index.ts \
        --bundle \
        --platform=node \
        --target=node18 \
        --outfile=./build/$lambda/index.js
    cd ./build/$lambda
    zip -r "../../${lambda}.zip" .
    cd ../..
    mv ${lambda}.zip ./terraform/${lambda}.zip
done

