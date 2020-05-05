# Subgraph for Wildcards.world

This is a subgraph to allow useful queries of data about wildcards from: https://thegraph.com/explorer/subgraph/wild-cards/wildcards

### Notes for devolopment:

1. Always take values from the smart contract if they are available rather than trying to calculate them yourself. The smart contract is the ultimate source of truth, your calculations can have errors!
2. The graph isn't about efficiency, it is about accuracy. Rather write code that updates the same value 10 times (correctly), than write code where it is even remotely possible that you forget to update a value. If a value is not up to date, it is wrong. Accuracy > efficiency.
3. Due to the emergent complexity of smart contracts, it is useful to break graph updates into functions, but remember #2! Don't try make these functions not overlap, as long as they only set correct, up to date values there is no problem.

- if there is an option to read a value from the contract (rather than reading a value already stored in the graph), always use it!
- in the top section of the graph don't load any entities, they (other instances of the same entity) may get modified in other places and saved causing race conditions.

## TODO:

- [ ] get rid of all occurrences of `splice` in code. It was a mistake to introduce it since it performs a mutation. (introduced during a hackathon, forgive me).
- [ ] Make a distinction between `lastUpdated` and `timeLastCollectedPatron`. For example changing the price doesn't update `timeLastCollectedPatron` on the contract. This was causing some issues...
