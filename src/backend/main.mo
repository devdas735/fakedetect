import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";

actor {
  type FileType = {
    #image;
    #video;
  };

  type Verdict = {
    #fake;
    #real;
  };

  type Metric = {
    name : Text;
    score : Nat;
  };

  type AnalysisRecord = {
    id : Nat;
    filename : Text;
    fileType : FileType;
    verdict : Verdict;
    confidenceScore : Nat;
    analysisMetrics : [Metric];
    timestamp : Int;
  };

  module AnalysisRecord {
    public func compare(a : AnalysisRecord, b : AnalysisRecord) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  var nextId = 0;
  let records = Map.empty<Nat, AnalysisRecord>();

  public shared ({ caller }) func createAnalysisRecord(filename : Text, fileType : FileType, verdict : Verdict, confidenceScore : Nat, metrics : [Metric]) : async Nat {
    let id = nextId;
    nextId += 1;

    let record : AnalysisRecord = {
      id;
      filename;
      fileType;
      verdict;
      confidenceScore;
      analysisMetrics = metrics;
      timestamp = Time.now();
    };

    records.add(id, record);
    id;
  };

  public query ({ caller }) func getAllRecords() : async [AnalysisRecord] {
    records.values().toArray().sort();
  };

  public shared ({ caller }) func deleteRecordById(id : Nat) : async () {
    if (not records.containsKey(id)) {
      Runtime.trap("Record not found");
    };
    records.remove(id);
  };
};
