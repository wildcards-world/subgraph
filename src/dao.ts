import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { LogVote } from "../generated/Dao/Dao";
import { LogFundsDistributed, Dao } from "../generated/Dao/Dao";
import { VoteManager, Iteration, VoteStatus, Vote } from "../generated/schema";
import { VOTES_MANAGER_ENTITY_ID } from "./CONSTANTS";

export function handleLogVote(event: LogVote): void {
  /*
  let proposalVotedFor = event.params.proposalVotedFor;
  let votesCast = event.params.votesCast;
  let totalVotesForProposal = event.params.totalVotesForProposal;
  let totalVotesAllProposals = event.params.totalVotesAllProposals;
  let addressOfVoter = event.params.addressOfVoter;
  let voteManagerContract = Dao.bind(event.address);
  let currentIteration = voteManagerContract.proposalIteration();
  let currentIterationString = currentIteration.toString();
  let projectVoteId =
    currentIterationString + "-" + proposalVotedFor.toString();

  let iteration = Iteration.load(currentIterationString);
  if (iteration == null) {
    iteration = new Iteration(currentIterationString);
    iteration.totalVotes = BigInt.fromI32(0);
    iteration.winningProposal = BigInt.fromI32(0);
    iteration.fundsDistributed = BigInt.fromI32(0);
    iteration.winningVotes = BigInt.fromI32(0);
    iteration.projectVoteTallies = [];
    iteration.individualVotes = [];
  }
  iteration.totalVotes = totalVotesAllProposals;

  // TODO: create event in the initialize function.
  let voteManager = VoteManager.load(VOTES_MANAGER_ENTITY_ID);
  if (voteManager == null) {
    voteManager = new VoteManager(VOTES_MANAGER_ENTITY_ID);

    voteManager.currentIteration = iteration.id;
    voteManager.save();
  }
  iteration.totalVotes = totalVotesAllProposals;

  // TODO: create event in the initialize function.

  let newVoteStatus = VoteStatus.load(projectVoteId);
  if (newVoteStatus == null) {
    newVoteStatus = new VoteStatus(projectVoteId);
    newVoteStatus.projectVote = BigInt.fromI32(0);
    iteration.projectVoteTallies =
      iteration.projectVoteTallies.indexOf(projectVoteId) === -1
        ? iteration.projectVoteTallies.concat([projectVoteId])
        : iteration.projectVoteTallies;
  }

  let patronAddress = addressOfVoter.toHexString();
  let patron = PatronNew.load(patronAddress); // This should never be null since only patrons can vote
  let uniqueVoteId = projectVoteId + "-" + patronAddress;
  let vote = new Vote(uniqueVoteId);
  vote.voteAmount = votesCast;
  vote.voter = patron.id;
  iteration.individualVotes = iteration.individualVotes.concat([uniqueVoteId]);

  newVoteStatus.projectVote = totalVotesForProposal;
  vote.save();
  newVoteStatus.save();
  iteration.save();
  */
}

export function handleLogFundsDistributed(event: LogFundsDistributed): void {
  let winningProposal = event.params.winningProposal;
  let fundsDistributed = event.params.fundsDistributed;
  let winningVotes = event.params.winningVotes;
  let totalVotes = event.params.totalVotes;
  let newIteration = event.params.newIteration;

  let voteManager = VoteManager.load(VOTES_MANAGER_ENTITY_ID);
  // This block only runs on start-up to set up the vote Manager initially
  if (voteManager == null) {
    let iteration = new Iteration(newIteration.toString());
    iteration.totalVotes = BigInt.fromI32(0);
    iteration.winningProposal = BigInt.fromI32(0);
    iteration.fundsDistributed = BigInt.fromI32(0);
    iteration.winningVotes = BigInt.fromI32(0);

    let voteManager = new VoteManager(VOTES_MANAGER_ENTITY_ID);

    voteManager.currentIteration = iteration.id;
    iteration.save();
    voteManager.save();

    return;
  }
  /*
  let iteration = Iteration.load(voteManager.currentIteration);
  if (iteration == null) {
    iteration = new Iteration(voteManager.currentIteration);
    iteration.totalVotes = BigInt.fromI32(0);
    iteration.winningProposal = BigInt.fromI32(0);
    iteration.fundsDistributed = BigInt.fromI32(0);
    iteration.winningVotes = BigInt.fromI32(0);
    iteration.projectVoteTallies = [];
    iteration.individualVotes = [];
  }

  iteration.winningProposal = winningProposal;
  iteration.fundsDistributed = fundsDistributed;
  iteration.winningVotes = winningVotes;
  iteration.totalVotes = totalVotes;
  iteration.save();

  voteManager.currentIteration = newIteration.toString();
  // Make current iteration into latestCompleteIteration, create a new current iteration.
  let completeIteration = Iteration.load(voteManager.currentIteration);
  completeIteration.winningProposal = winningProposal;
  completeIteration.fundsDistributed = fundsDistributed;
  completeIteration.winningVotes = winningVotes;
  completeIteration.totalVotes = totalVotes;
  completeIteration.save();
  voteManager.latestCompleteIteration = completeIteration.id;

  let currentIteration = new Iteration(newIteration.toString());
  currentIteration.totalVotes = BigInt.fromI32(0);
  currentIteration.winningProposal = BigInt.fromI32(0);
  currentIteration.fundsDistributed = BigInt.fromI32(0);
  currentIteration.winningVotes = BigInt.fromI32(0);
  currentIteration.projectVoteTallies = [];
  currentIteration.individualVotes = [];
  currentIteration.save();

  voteManager.currentIteration = currentIteration.id;
  voteManager.save();
  */
}
