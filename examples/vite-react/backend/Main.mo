actor {
    var counter : Int = 0;

    public func get() : async Int {
        counter;
    };

    public func inc() {
        counter += 1;
    };

    public func add(i : Int) {
        counter += 1; // TODO: support `+= i`
    };
};
