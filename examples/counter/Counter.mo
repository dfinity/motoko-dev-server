actor {
    var counter = 0;

    public query func get() : async Nat {
        counter
    };

    public func inc() : async () {
        counter += 1;
    };
}
