#!/bin/bash

######################
####### CONFIG #######
######################
RPC_ENDPOINT="http://localhost:8545"
TOTAL_WAITING_TIME=45 # seconds
WAIT_FOR_INPUT=true
######################

function killCompose {
    kill $DOCKER_COMPOSE_UP_PID
    sleep 1
    kill $DOCKER_COMPOSE_UP_PID
}

function killAndExit {
    echo "####### EXITING... #######"
    killCompose
    exit 0
}

function graphCreate {
    echo '####### DEPLOYING GRAPH #######'

    yarn codegen; yarn build; yarn create-test-local; yarn deploy-test-local

    if [ "$?" -ne 0 ];
    then
        echo "ERROR: Could not deploy graph successfully"
        # killAndExit
    fi
}

function graphRedeploy {
    echo '####### REDEPLOYING GRAPH #######'
    yarn codegen && yarn build && MIGRATIONS_DIRECTORY="./migrations-graph-testing" truffle migrate --reset

    if [ "$?" -ne 0 ];
    then
        echo "ERROR: Could not redeploy graph successfully"
        # killAndExit
    fi
}

function doneLoop {
    echo "######################"
    echo "######## DONE ########"
    if [ $WAIT_FOR_INPUT = true ]; then
        echo "####### PRESS R to RESTART ######"
        echo "# PRESS G to REDEPLOY the graph #"
        echo "######## PRESS Q to QUIT ########"
    fi
    echo "######################"
    if [ $WAIT_FOR_INPUT = true ]; then
        waitForInput
    fi
}

function start {
    # echo "####### CLEANUP #######"
    docker-compose -f docker-compose.local-testing.yml down -v

    echo "####### DOCKER-COMPOSE #######"
    docker-compose -f docker-compose.local-testing.yml up 2>&1 > /dev/null &
    DOCKER_COMPOSE_UP_PID=$!

    echo "####### WAITING FOR DOCKERS #######"
    WAITING_TIME=0
    until $(curl --output /dev/null -X POST --silent --fail -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $RPC_ENDPOINT); do
        SLEEP_AMOUNT=6
        sleep $SLEEP_AMOUNT
        WAITING_TIME=$(($WAITING_TIME+$SLEEP_AMOUNT))
        if [ "$WAITING_TIME" -gt "$TOTAL_WAITING_TIME" ];
        then
            echo "ERROR: Could not reach ETH chain"
            killAndExit
        fi;
    done

    echo "####### DEPLOYING CONTRACTS #######"
    rm -rf contracts/deployments/ganache
    cd ./contracts/matic && yarn clean && rm -f .openzeppelin/dev-321.json && MIGRATIONS_DIRECTORY="./migrations-graph-testing" truffle migrate --reset || true ## `|| true` ignores the error if the script fails (can fix and press `R`)
    if [ "$?" -ne 0 ];
    then
        echo "ERROR: Could not deploy contracts successfully"
        killAndExit
    fi
    cd ../..

    graphCreate
    doneLoop
}

function waitForInput {
    while [ true ] ; do
        read -n 1 k <&1
        if [[ $k == "q" || $k == "Q" ]]; then
            echo ""
            killAndExit
        elif [[ $k == "r" || $k == "R" ]]; then
            echo ""
            echo "######## RESTARTING ALL ########"
            killCompose
            sleep 3
            start
        elif [[ $k == "g" || $k == "G" ]]; then
            echo ""
            graphRedeploy
            doneLoop
        fi
    done
}

start
