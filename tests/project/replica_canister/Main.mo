import Lib "lib/Echo";

actor {
    public func main() : async Nat {
        Lib.echo(123);
    };
};
