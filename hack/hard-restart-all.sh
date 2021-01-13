docker-compose down -v
docker-compose -f docker-compose.mumbai.yml -p mumbai down -v
sudo rm -rf data data-mumbai

docker-compose up -d
docker-compose -f docker-compose.mumbai.yml -p mumbai up -d

sleep 10

# matic
graph create --node http://127.0.0.1:8020 wildcards-world/wildcards-matic
graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 wildcards-world/wildcards-matic ./subgraph.matic.yaml

# mumbai
graph create --node http://127.0.0.1:8120 wildcards-world/wildcards-matic
graph deploy --node http://localhost:8120/ --ipfs http://localhost:5101 wildcards-world/wildcards-matic ./subgraph.mumbai.yaml
