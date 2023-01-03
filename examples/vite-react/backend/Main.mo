actor {
    var counter /* : Int */ = 0;

    public query func get() : async Int {
        counter;
    };

    public func inc() {
        counter += 1;
    };

    // public func add(i : Int) {
    //     counter += i;
    // };
};
