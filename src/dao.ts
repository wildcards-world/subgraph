import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { LogVote } from "../generated/Dao/Dao";
import { LogFundsDistributed } from "../generated/Dao/Dao";
import { VoteManager, Iteration, VoteStatus } from "../generated/schema";

export function handleLogVote(event: LogVote): void {
  let proposalVotedFor = event.params.proposalVotedFor;
  //let votesCast = event.params.votesCast;
  let totalVotesForProposal = event.params.totalVotesForProposal;
  //let totalVotesAllProposals = event.params.totalVotesAllProposals;
  //let addressOfVoter = event.params.addressOfVoter;

  //let vote = new Vote(event.transaction.hash.toHexString());
  let voteManager = VoteManager.load("VOTE_MANAGER");
  if (voteManager == null) {
    let voteManager = new VoteManager("VOTE_MANAGER");
    voteManager.currentIteration = "0";
    voteManager.save();
  }

  let newVote = VoteStatus.load(
    voteManager.currentIteration + "-" + proposalVotedFor.toHexString()
  );
  if (newVote == null) {
    let newVote = new VoteStatus(
      voteManager.currentIteration + "-" + proposalVotedFor.toHexString()
    );
    newVote.projectVote = BigInt.fromI32(0);
  }
  newVote.projectVote = totalVotesForProposal;
  newVote.save();

  //   let iteration = Iteration.load(voteManager.currentIteration);
  //   if (iteration == null) {
  //     let iteration = new Iteration(voteManager.currentIteration);
  //     iteration.totalVotes = BigInt.fromI32(0);
  //     iteration.winningProposal = BigInt.fromI32(0); // Silly as 0 is a proposal. What is no-one votes??
  //     iteration.fundsDistributed = BigInt.fromI32(0);
  //     iteration.winningVotes = BigInt.fromI32(0);
  //     //iteration.projectVotes = [];
  //   }

  //   iteration.totalVotes = totalVotesAllProposals;
  //   iteration.save();
}

export function handleLogFundsDistributed(event: LogFundsDistributed): void {
  let winningProposal = event.params.winningProposal;
  let fundsDistributed = event.params.fundsDistributed;
  let winningVotes = event.params.winningVotes;
  let totalVotes = event.params.totalVotes;

  let voteManager = VoteManager.load("VOTE_MANAGER");
  if (voteManager == null) {
    let voteManager = new VoteManager("VOTE_MANAGER");
    voteManager.currentIteration = "0";
  }

  let iteration = Iteration.load(voteManager.currentIteration);
  if (iteration == null) {
    let iteration = new Iteration(voteManager.currentIteration);
    iteration.totalVotes = BigInt.fromI32(0);
    iteration.winningProposal = BigInt.fromI32(0);
    iteration.fundsDistributed = BigInt.fromI32(0);
    iteration.winningVotes = BigInt.fromI32(0);
    //iteration.projectVotes = [];
  }

  iteration.winningProposal = winningProposal;
  iteration.fundsDistributed = fundsDistributed;
  iteration.winningVotes = winningVotes;
  iteration.totalVotes = totalVotes;
  iteration.save();

  let newIteration = event.params.newIteration;
  voteManager.currentIteration = newIteration.toHexString();
  voteManager.save();
}
