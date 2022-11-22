import { useEffect, useState } from 'react';
import './App.css';
import motokoLogo from './assets/motoko_moving.png';
import motokoShadowLogo from './assets/motoko_shadow.png';
import reactLogo from './assets/react.svg';
import { devCanister, replicaCanister } from './ic';

const backend = import.meta.env.DEV
    ? devCanister('backend')
    : replicaCanister('rrkah-fqaaa-aaaaa-aaaaq-cai');

// const backend = replicaCanister('rrkah-fqaaa-aaaaa-aaaaq-cai');

function App() {
    const [count, setCount] = useState<number | undefined>();

    const fetchCount = () =>
        backend
            .call('get')
            .then((result) => setCount(+result))
            .catch(console.error);

    useEffect(() => {
        fetchCount();
    }, []);

    const increment = async () => {
        await backend.call('add', 1);
        await fetchCount();
    };

    return (
        <div className="App">
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img
                        src="/vite.svg"
                        className="logo vite"
                        alt="Vite logo"
                    />
                </a>
                <a href="https://reactjs.org" target="_blank">
                    <img
                        src={reactLogo}
                        className="logo react"
                        alt="React logo"
                    />
                </a>
                <div className="logo-stack">
                    <a href="https://smartcontracts.org" target="_blank">
                        <img
                            src={motokoShadowLogo}
                            className="logo motoko-shadow"
                            alt="Motoko logo"
                        />
                    </a>
                    <a href="https://smartcontracts.org" target="_blank">
                        <img
                            src={motokoLogo}
                            className="logo motoko"
                            alt="Motoko logo"
                        />
                    </a>
                </div>
            </div>
            <h1>Vite + React + Motoko</h1>
            <div className="card">
                <button onClick={increment}>count is {count}</button>
                <p>
                    Edit <code>counter/Counter.mo</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite, React, and Motoko logos to learn more
            </p>
        </div>
    );
}

export default App;
