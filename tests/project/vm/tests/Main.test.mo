import { Main } "../vm_canister/Main";

let canister = await Main();

assert (await canister.main()) == 123;
