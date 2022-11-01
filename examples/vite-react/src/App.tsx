import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import motokoLogo from './assets/motoko.png';
import './App.css';
import { getDevCanister } from './ic';

const counter = getDevCanister('counter');

function App() {
    const [count, setCount] = useState(0);

    const fetchCount = () =>
        counter
            .call('get')
            .then((result) => setCount(+result))
            .catch(console.error);

    useEffect(() => {
        fetchCount();
    }, []);

    const increment = async () => {
        await counter.call('inc');
        await fetchCount();
    };

    return (
        <div className="App">
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img src="/vite.svg" className="logo" alt="Vite logo" />
                </a>
                <a href="https://reactjs.org" target="_blank">
                    <img
                        src={reactLogo}
                        className="logo react"
                        alt="React logo"
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
            <h1>Vite + React + Motoko</h1>
            <div className="card">
                <button onClick={increment}>count is {count}</button>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </div>
    );
}

export default App;
